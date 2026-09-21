"use client";

import { useState, useEffect, useRef } from 'react';
import {
  GripVertical, UploadCloud, Trash2, Video, ListVideo,
  Plus, Loader2, CheckCircle2, AlertCircle, X, Film,
  Award, Users, Lock, Image as ImageIcon, Link2, Sparkles
} from 'lucide-react';

const ALL_DEPARTMENTS = [
  'HR','SAFETY','MAINTENANCE','PRODUCTION','QUALITY',
  'DESIGN','DEVELOPMENT','IT','AI',
  'CENTRAL_PROCESSING_ENGINEERING','STORE','DISPATCH'
] as const;

const DEPT_LABELS: Record<string, string> = {
  HR: 'HR', SAFETY: 'Safety', MAINTENANCE: 'Maintenance',
  PRODUCTION: 'Production', QUALITY: 'Quality', DESIGN: 'Design',
  DEVELOPMENT: 'Development', IT: 'IT', AI: 'AI',
  CENTRAL_PROCESSING_ENGINEERING: 'CPE', STORE: 'Store', DISPATCH: 'Dispatch',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlaylistSegment {
  id: string;
  title: string;
  file: File | null;
  uploadedUrl: string | null;
  uploading: boolean;
  uploadPercent?: number;
  error: string | null;
}

interface Quiz {
  id: string;
  timestampSec: number;
  question: string;
  options: string[];
  correctIndex: number;
}

interface Lesson {
  id: string;
  title: string;
  type: 'single' | 'playlist';
  // single
  singleFile: File | null;
  singleUrl: string | null;
  singleUploading: boolean;
  singleError: string | null;
  // playlist
  segments: PlaylistSegment[];
  // quizzes
  quizzes: Quiz[];
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function makeLesson(): Lesson {
  return {
    id: uid(), title: '', type: 'single',
    singleFile: null, singleUrl: null, singleUploading: false, singleError: null,
    segments: [],
    quizzes: [],
  };
}

function makeModule(): Module {
  return { id: uid(), title: 'New Module', lessons: [makeLesson()] };
}

function makeSegment(): PlaylistSegment {
  return { id: uid(), title: '', file: null, uploadedUrl: null, uploading: false, uploadPercent: 0, error: null };
}

// ─── Single video uploader cell ───────────────────────────────────────────────

function SingleVideoUploader({
  lesson, onUpdate,
}: {
  lesson: Lesson;
  onUpdate: (patch: Partial<Lesson>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState(lesson.singleUrl ?? '');
  const [uploadPercent, setUploadPercent] = useState<number>(0);

  async function handleFile(file: File) {
    if (file.type !== 'video/mp4') {
      onUpdate({ singleError: 'Only .mp4 files are supported.' });
      return;
    }
    setUploadPercent(0);
    onUpdate({ singleFile: file, singleUploading: true, singleError: null, singleUrl: null });

    const fd = new FormData();
    fd.append('file', file);
    fd.append('path', 'lessons');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload-video');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        setUploadPercent(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText);
          setUploadPercent(100);
          onUpdate({ singleUrl: json.publicUrl, singleUploading: false });
        } catch {
          onUpdate({ singleUploading: false, singleError: 'Upload failed: invalid server response' });
        }
      } else {
        try {
          const json = JSON.parse(xhr.responseText);
          onUpdate({ singleUploading: false, singleError: json.error || 'Upload failed' });
        } catch {
          onUpdate({ singleUploading: false, singleError: `Upload failed (status ${xhr.status})` });
        }
      }
    };

    xhr.onerror = () => {
      onUpdate({ singleUploading: false, singleError: 'Network error occurred during video upload' });
    };

    xhr.send(fd);
  }

  function handleUrlSave() {
    const url = urlInput.trim();
    if (!url) { onUpdate({ singleError: 'Please enter a video URL.' }); return; }
    onUpdate({ singleUrl: url, singleError: null });
  }

  // Already has a URL set
  if (lesson.singleUrl) {
    return (
      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg animate-in fade-in">
        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-green-800 truncate">
            {lesson.singleFile?.name ?? lesson.singleUrl}
          </p>
          <p className="text-xs text-green-600">Video ready ✓</p>
        </div>
        <button
          onClick={() => { onUpdate({ singleFile: null, singleUrl: null }); setUrlInput(''); }}
          className="p-1 text-gray-400 hover:text-red-500 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (lesson.singleUploading) {
    return (
      <div className="p-4 border-2 border-dashed border-indigo-400 rounded-xl bg-indigo-50/80 space-y-2.5 animate-in fade-in">
        <div className="flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2 text-indigo-900">
            <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
            <span className="truncate max-w-[260px] sm:max-w-sm">
              Uploading {lesson.singleFile?.name || 'video.mp4'}…
            </span>
          </div>
          <span className="px-2 py-0.5 bg-white text-indigo-700 rounded-full font-bold border border-indigo-200 shadow-sm">
            {uploadPercent}%
          </span>
        </div>
        {/* Animated Progress Bar */}
        <div className="w-full bg-indigo-200/70 rounded-full h-2.5 overflow-hidden relative">
          <div
            className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-300 ease-out shadow-sm"
            style={{ width: `${Math.max(5, uploadPercent)}%` }}
          />
        </div>
        <p className="text-[11px] text-indigo-600/90 flex items-center justify-between">
          <span>Uploading directly to server storage</span>
          <span>{uploadPercent < 100 ? 'In progress…' : 'Processing final video…'}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-max text-xs">
        <button
          onClick={() => setMode('upload')}
          className={`px-3 py-1.5 rounded-md font-medium transition ${
            mode === 'upload' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📁 Upload File
        </button>
        <button
          onClick={() => setMode('url')}
          className={`px-3 py-1.5 rounded-md font-medium transition ${
            mode === 'url' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🔗 Paste URL
        </button>
      </div>

      {mode === 'upload' ? (
        <label
          className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-400 transition cursor-pointer group"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        >
          <UploadCloud className="w-8 h-8 text-gray-400 group-hover:text-indigo-500 mb-2 transition" />
          <span className="text-sm font-medium text-gray-600 group-hover:text-indigo-600">
            Click or drag &amp; drop your .mp4 file
          </span>
          <span className="text-xs text-gray-400 mt-1">Max 500 MB</span>
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </label>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/video.mp4"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 transition"
            />
            <button
              onClick={handleUrlSave}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition whitespace-nowrap"
            >
              Use URL
            </button>
          </div>
          <p className="text-xs text-gray-400">Paste a direct video URL (useful for testing with public MP4 links)</p>
        </div>
      )}

      {lesson.singleError && (
        <div className="flex items-center gap-2 text-red-600 text-xs">
          <AlertCircle className="w-4 h-4" />
          {lesson.singleError}
        </div>
      )}
    </div>
  );
}

// ─── Playlist builder ─────────────────────────────────────────────────────────

function PlaylistBuilder({
  lesson, onUpdate,
}: {
  lesson: Lesson;
  onUpdate: (patch: Partial<Lesson>) => void;
}) {
  function updateSegment(segId: string, patch: Partial<PlaylistSegment>) {
    onUpdate({
      segments: lesson.segments.map((s) => (s.id === segId ? { ...s, ...patch } : s)),
    });
  }

  async function handleSegmentFile(segId: string, file: File) {
    if (file.type !== 'video/mp4') {
      updateSegment(segId, { error: 'Only .mp4 files are supported.' });
      return;
    }
    updateSegment(segId, { file, uploading: true, uploadPercent: 0, error: null, uploadedUrl: null });

    const fd = new FormData();
    fd.append('file', file);
    fd.append('path', 'playlists');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload-video');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        updateSegment(segId, { uploadPercent: pct });
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText);
          updateSegment(segId, { uploadedUrl: json.publicUrl, uploading: false, uploadPercent: 100 });
        } catch {
          updateSegment(segId, { uploading: false, error: 'Upload failed: invalid response' });
        }
      } else {
        try {
          const json = JSON.parse(xhr.responseText);
          updateSegment(segId, { uploading: false, error: json.error || 'Upload failed' });
        } catch {
          updateSegment(segId, { uploading: false, error: `Upload failed (status ${xhr.status})` });
        }
      }
    };

    xhr.onerror = () => {
      updateSegment(segId, { uploading: false, error: 'Network error during upload' });
    };

    xhr.send(fd);
  }

  return (
    <div className="space-y-3">
      {lesson.segments.map((seg, idx) => (
        <div key={seg.id} className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0 mt-1">
            {idx + 1}
          </span>
          <div className="flex-1 space-y-2 min-w-0">
            <input
              type="text"
              placeholder="Segment title…"
              value={seg.title}
              onChange={(e) => updateSegment(seg.id, { title: e.target.value })}
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-indigo-500"
            />
            {seg.uploadedUrl ? (
              <div className="flex items-center gap-2 text-xs text-green-700 font-medium bg-green-50 p-1.5 rounded border border-green-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> {seg.file?.name} — uploaded ✓
              </div>
            ) : seg.uploading ? (
              <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between text-xs text-indigo-800 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" /> Uploading segment…
                  </span>
                  <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-indigo-100">{seg.uploadPercent || 0}%</span>
                </div>
                <div className="w-full bg-indigo-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(5, seg.uploadPercent || 0)}%` }}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="inline-flex items-center cursor-pointer px-3 py-1.5 bg-white border border-indigo-200 rounded text-xs text-indigo-600 font-medium hover:bg-indigo-50 transition">
                  <UploadCloud className="w-3.5 h-3.5 mr-1.5" /> Attach .mp4
                  <input
                    type="file"
                    accept="video/mp4"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSegmentFile(seg.id, f); }}
                  />
                </label>
                {seg.error && <p className="text-xs text-red-500 mt-1">{seg.error}</p>}
              </div>
            )}
          </div>
          <button
            onClick={() => onUpdate({ segments: lesson.segments.filter((s) => s.id !== seg.id) })}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      <button
        onClick={() => onUpdate({ segments: [...lesson.segments, makeSegment()] })}
        className="text-sm text-indigo-600 font-medium hover:underline flex items-center"
      >
        <Plus className="w-4 h-4 mr-1" /> Add Segment
      </button>
    </div>
  );
}

// ─── Quiz builder ───────────────────────────────────────────────────────────────

function QuizBuilder({
  lesson, onUpdate,
}: {
  lesson: Lesson;
  onUpdate: (patch: Partial<Lesson>) => void;
}) {
  function addQuiz() {
    onUpdate({
      quizzes: [...lesson.quizzes, {
        id: uid(),
        timestampSec: 0,
        question: '',
        options: ['', '', '', ''],
        correctIndex: 0
      }]
    });
  }

  function updateQuiz(qId: string, patch: Partial<Quiz>) {
    onUpdate({
      quizzes: lesson.quizzes.map((q) => (q.id === qId ? { ...q, ...patch } : q))
    });
  }

  function removeQuiz(qId: string) {
    onUpdate({
      quizzes: lesson.quizzes.filter((q) => q.id !== qId)
    });
  }

  function parseTime(str: string) {
    const parts = str.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return Number(str) || 0;
  }

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div className="mt-4 border-t border-indigo-100 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700">In-Video Quizzes</h4>
        <button
          onClick={addQuiz}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center bg-indigo-50 px-2 py-1 rounded"
        >
          <Plus className="w-3 h-3 mr-1" /> Add Quiz
        </button>
      </div>

      <div className="space-y-4">
        {lesson.quizzes.map((q, idx) => (
          <div key={q.id} className="p-3 bg-white border border-gray-200 rounded-md shadow-sm relative">
            <button onClick={() => removeQuiz(q.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-2 mb-3 pr-6">
              <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
              <label className="text-xs text-gray-600">Timestamp (MM:SS):</label>
              <input
                type="text"
                placeholder="01:30"
                value={formatTime(q.timestampSec)}
                onChange={(e) => updateQuiz(q.id, { timestampSec: parseTime(e.target.value) })}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:border-indigo-500 outline-none text-center"
              />
            </div>

            <div className="mb-3">
              <input
                type="text"
                placeholder="Question..."
                value={q.question}
                onChange={(e) => updateQuiz(q.id, { question: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:border-indigo-500 outline-none font-medium"
              />
            </div>

            <div className="space-y-2 pl-2 border-l-2 border-indigo-100">
              {q.options.map((opt, optIdx) => (
                <div key={optIdx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${q.id}`}
                    checked={q.correctIndex === optIdx}
                    onChange={() => updateQuiz(q.id, { correctIndex: optIdx })}
                    className="w-3.5 h-3.5 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder={`Option ${optIdx + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...q.options];
                      newOpts[optIdx] = e.target.value;
                      updateQuiz(q.id, { options: newOpts });
                    }}
                    className={`flex-1 px-2 py-1 text-sm border rounded outline-none transition ${q.correctIndex === optIdx ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
        {lesson.quizzes.length === 0 && (
          <p className="text-xs text-gray-400 italic">No quizzes added yet.</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export interface CourseBuilderProps {
  editingCourseId?: string | null;
  onCourseSaved?: (savedId?: string) => void;
  onCancelEdit?: () => void;
}

export function CourseBuilder({ editingCourseId, onCourseSaved, onCancelEdit }: CourseBuilderProps) {
  const [courseTitle, setCourseTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [modules, setModules] = useState<Module[]>([makeModule()]);
  const [visibility, setVisibility] = useState<'all' | 'specific'>('all');
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [hasCertificate, setHasCertificate] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [thumbnailMode, setThumbnailMode] = useState<'upload' | 'url'>('upload');
  const [thumbnailUrlInput, setThumbnailUrlInput] = useState('');
  const [isDraggingThumbnail, setIsDraggingThumbnail] = useState(false);
  const [thumbnailUploadPercent, setThumbnailUploadPercent] = useState(0);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [publishError, setPublishError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedCourseTitle, setSavedCourseTitle] = useState('');
  const [loadingEditData, setLoadingEditData] = useState(false);

  async function uploadThumbnailFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'jfif', 'avif', 'bmp', 'pjpeg', 'pjp', 'ico', 'tiff', 'tif'];
    const isImage = (typeof file.type === 'string' && file.type.startsWith('image/')) || (ext && validExts.includes(ext));

    if (!isImage) {
      setThumbnailError('Please select a valid image file (JPEG, PNG, WebP, SVG, GIF, AVIF).');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setThumbnailError('Image size exceeds 50 MB limit.');
      return;
    }

    setThumbnailError(null);
    setThumbnailFile(file);
    setThumbnailUploading(true);
    setThumbnailUploadPercent(0);

    const fd = new FormData();
    fd.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload-thumbnail');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        setThumbnailUploadPercent(pct);
      }
    };

    xhr.onload = () => {
      setThumbnailUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText);
          setThumbnailUrl(json.publicUrl);
          setThumbnailUrlInput(json.publicUrl);
          setThumbnailFile(null);
          setThumbnailUploadPercent(100);
        } catch {
          setThumbnailError('Invalid response received from server.');
        }
      } else {
        try {
          const json = JSON.parse(xhr.responseText);
          if (xhr.status === 401 || xhr.status === 403) {
            setThumbnailError(json.error || 'Your session expired. Please sign in again to upload thumbnails.');
          } else {
            setThumbnailError(json.error || `Upload failed (${xhr.status})`);
          }
        } catch {
          setThumbnailError(`Upload failed with status code ${xhr.status}`);
        }
      }
    };

    xhr.onerror = () => {
      setThumbnailUploading(false);
      setThumbnailError('Network error while uploading thumbnail image.');
    };

    xhr.send(fd);
  }

  // Fetch existing course data if editing
  useEffect(() => {
    if (!editingCourseId) return;
    setLoadingEditData(true);
    fetch(`/api/courses/${editingCourseId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.course) {
          const c = json.course;
          setCourseTitle(c.title || '');
          setDescription(c.description || '');
          setSelectedCategoryId(c.categories?.id || '');
          setVisibility(c.visibility || 'all');
          setSelectedDepts(c.departments || []);
          setHasCertificate(!!c.has_certificate);
          setThumbnailUrl(c.thumbnail_url || null);
          setThumbnailUrlInput(c.thumbnail_url || '');
          setThumbnailFile(null);

          if (c.modules?.length) {
            const loadedModules: Module[] = c.modules.map((m: any) => ({
              id: m.id || uid(),
              title: m.title || 'Untitled Module',
              lessons: (m.lessons || []).map((l: any) => ({
                id: l.id || uid(),
                title: l.title || 'Untitled Lesson',
                type: l.playlist_urls?.length ? 'playlist' : 'single',
                singleFile: null,
                singleUrl: l.video_url || null,
                singleUploading: false,
                singleError: null,
                segments: (l.playlist_urls || []).map((p: any) => ({
                  id: uid(),
                  title: p.title || '',
                  file: null,
                  uploadedUrl: p.url || null,
                  uploading: false,
                  error: null,
                })),
                quizzes: (l.lesson_quizzes || []).map((q: any) => ({
                  id: q.id || uid(),
                  timestampSec: q.timestamp_sec || 0,
                  question: q.question || '',
                  options: Array.isArray(q.options) ? q.options : [],
                  correctIndex: q.correct_index || 0,
                })),
              })),
            }));
            setModules(loadedModules);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoadingEditData(false));
  }, [editingCourseId]);

  // Load (and reload) categories from DB
  function loadCategories() {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((json) => { if (json.categories) setCategories(json.categories); })
      .catch(console.error);
  }

  useEffect(() => {
    loadCategories();
    // Refresh when CategoryManager saves a new one
    window.addEventListener('category-saved', loadCategories);
    return () => window.removeEventListener('category-saved', loadCategories);
  }, []);

  // ── Module helpers ──────────────────────────────────────────────────────────

  function updateModule(modId: string, patch: Partial<Module>) {
    setModules((ms) => ms.map((m) => (m.id === modId ? { ...m, ...patch } : m)));
  }

  function removeModule(modId: string) {
    setModules((ms) => ms.filter((m) => m.id !== modId));
  }

  function addLesson(modId: string) {
    setModules((ms) =>
      ms.map((m) => (m.id === modId ? { ...m, lessons: [...m.lessons, makeLesson()] } : m))
    );
  }

  function updateLesson(modId: string, lessonId: string, patch: Partial<Lesson>) {
    setModules((ms) =>
      ms.map((m) =>
        m.id === modId
          ? { ...m, lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, ...patch } : l)) }
          : m
      )
    );
  }

  function removeLesson(modId: string, lessonId: string) {
    setModules((ms) =>
      ms.map((m) =>
        m.id === modId ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) } : m
      )
    );
  }

  // ── Publish ─────────────────────────────────────────────────────────────────

  async function handlePublish() {
    if (!courseTitle.trim()) { alert('Please enter a course title.'); return; }
    if (!selectedCategoryId) { alert('Please select a category.'); return; }
    if (!modules.length) { alert('Add at least one module.'); return; }

    // Validate all lessons have videos
    for (const mod of modules) {
      for (const lesson of mod.lessons) {
        if (!lesson.title.trim()) { alert(`A lesson in "${mod.title}" has no title.`); return; }
        if (lesson.type === 'single' && !lesson.singleUrl) {
          alert(`Lesson "${lesson.title}" has no uploaded video.`); return;
        }
        if (lesson.type === 'playlist') {
          for (const seg of lesson.segments) {
            if (!seg.uploadedUrl) { alert(`Playlist segment "${seg.title || 'Untitled'}" has no uploaded video.`); return; }
          }
        }
      }
    }

    setPublishing(true);
    setPublishStatus('idle');

    try {
      // thumbnail_url is already set (uploaded on file-select); just use it
      const finalThumbnailUrl = thumbnailUrl;

      const body = {
        title: courseTitle,
        description,
        thumbnail_url: finalThumbnailUrl,
        category_id: selectedCategoryId,
        created_by: null,
        visibility,
        departments: visibility === 'specific' ? selectedDepts : [],
        has_certificate: hasCertificate,
        modules: modules.map((mod, mi) => ({
          title: mod.title,
          order_index: mi,
          lessons: mod.lessons.map((lesson, li) => ({
            title: lesson.title,
            type: lesson.type,
            video_url: lesson.type === 'single' ? lesson.singleUrl : undefined,
            playlist_urls:
              lesson.type === 'playlist'
                ? lesson.segments.map((s) => ({ title: s.title, url: s.uploadedUrl }))
                : undefined,
            order_index: li,
            quizzes: lesson.quizzes.map((q) => ({
              timestamp_sec: q.timestampSec,
              question: q.question,
              options: q.options,
              correct_index: q.correctIndex,
            })),
          })),
        })),
      };

      const endpoint = editingCourseId ? `/api/courses/${editingCourseId}` : '/api/courses';
      const method = editingCourseId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save course');

      const savedId = json.courseId || editingCourseId;
      setPublishStatus('success');
      setSavedCourseTitle(courseTitle);
      setShowSuccessModal(true);
      if (onCourseSaved) onCourseSaved(savedId);

      // Reset form if creating new
      if (!editingCourseId) {
        setTimeout(() => {
          setCourseTitle(''); setDescription(''); setSelectedCategoryId('');
          setVisibility('all'); setSelectedDepts([]); setHasCertificate(false);
          setThumbnailUrl(null); setThumbnailFile(null); setThumbnailError(null);
          setModules([makeModule()]); setPublishStatus('idle');
        }, 3000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Publish failed';
      setPublishError(msg);
      setPublishStatus('error');
    } finally {
      setPublishing(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div id="course-builder" className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-4xl mx-auto mt-8 relative z-10 w-full mb-10 overflow-hidden">

      {/* ── Publishing Screen Animation Overlay ── */}
      {publishing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center flex flex-col items-center border border-indigo-100">
            <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 relative">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
              <Film className="w-7 h-7 text-indigo-600 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {editingCourseId ? 'Updating Course…' : 'Publishing Tutorial…'}
            </h3>
            <p className="text-xs text-gray-500">
              Saving curriculum, videos, and settings to the system...
            </p>
          </div>
        </div>
      )}

      {/* ── Success Celebration Modal ── */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center flex flex-col items-center border border-green-100 relative">
            <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4 shadow-inner">
              <CheckCircle2 className="w-10 h-10 text-green-600 animate-bounce" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {editingCourseId ? 'Course Updated Successfully!' : '🎉 Tutorial Published Successfully!'}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              "{savedCourseTitle}" has been saved and is immediately live on the dashboard for your selected departments.
            </p>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              <span>View in Courses Table</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mr-4">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {editingCourseId ? 'Edit Course' : 'Course Builder'}
            </h2>
            <p className="text-sm text-gray-500">
              {editingCourseId ? 'Modify course content, videos, and quizzes' : 'Build and publish a video-based course'}
            </p>
          </div>
        </div>
        {editingCourseId && onCancelEdit && (
          <button
            onClick={onCancelEdit}
            className="px-4 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition"
          >
            Cancel Edit
          </button>
        )}
      </div>

      {/* Success / Error Banner */}
      {publishStatus === 'success' && (
        <div className="flex items-center gap-3 mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="font-medium">Course published successfully! The list above has updated.</span>
        </div>
      )}
      {publishStatus === 'error' && (
        <div className="flex items-center gap-3 mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="font-medium">{publishError}</span>
        </div>
      )}

      {/* Course Meta */}
      <div className="space-y-4 mb-8 pb-6 border-b border-gray-100">

        {/* Thumbnail Upload */}
        {/* Thumbnail Upload & URL selector */}
        <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <label className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-indigo-600" /> Course Thumbnail
              <span className="text-xs font-normal text-gray-500">(Shown on course catalog cards)</span>
            </label>

            {/* Mode Switcher */}
            <div className="flex items-center bg-gray-200/80 p-0.5 rounded-lg text-xs font-medium self-start sm:self-auto">
              <button
                type="button"
                onClick={() => { setThumbnailMode('upload'); setThumbnailError(null); }}
                className={`px-3 py-1 rounded-md transition flex items-center gap-1 ${thumbnailMode === 'upload' ? 'bg-white text-indigo-700 shadow-sm font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <UploadCloud className="w-3.5 h-3.5" /> Upload File
              </button>
              <button
                type="button"
                onClick={() => { setThumbnailMode('url'); setThumbnailError(null); }}
                className={`px-3 py-1 rounded-md transition flex items-center gap-1 ${thumbnailMode === 'url' ? 'bg-white text-indigo-700 shadow-sm font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <Link2 className="w-3.5 h-3.5" /> Image URL / Presets
              </button>
            </div>
          </div>

          {/* If thumbnail is active, show the rich preview card */}
          {thumbnailUrl ? (
            <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm group">
              <div className="h-48 w-full bg-gray-900 flex items-center justify-center overflow-hidden">
                <img
                  src={thumbnailUrl}
                  alt="Thumbnail preview"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={() => setThumbnailError('Image could not be loaded from this URL. Please verify the link.')}
                />
              </div>
              <div className="p-3 bg-white flex items-center justify-between gap-2 border-t border-gray-100">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active Thumbnail
                  </span>
                  <p className="text-xs text-gray-500 truncate mt-0.5" title={thumbnailUrl}>
                    {thumbnailUrl}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (thumbnailMode === 'upload') {
                        thumbnailInputRef.current?.click();
                      } else {
                        setThumbnailUrl(null);
                      }
                    }}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setThumbnailUrl(null);
                      setThumbnailFile(null);
                      setThumbnailUrlInput('');
                      setThumbnailError(null);
                    }}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ) : thumbnailUploading ? (
            /* Uploading spinner */
            <div className="w-full h-36 border-2 border-dashed border-indigo-400 rounded-xl flex flex-col items-center justify-center p-4 bg-indigo-50/70 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between w-full max-w-xs text-xs font-semibold text-indigo-900">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                  Uploading thumbnail…
                </span>
                <span className="bg-white px-2 py-0.5 rounded-full border border-indigo-200 text-indigo-700 shadow-sm font-bold">
                  {thumbnailUploadPercent}%
                </span>
              </div>
              <div className="w-full max-w-xs bg-indigo-200/80 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-200"
                  style={{ width: `${Math.max(5, thumbnailUploadPercent)}%` }}
                />
              </div>
              <p className="text-[11px] text-indigo-500">Processing and saving thumbnail image…</p>
            </div>
          ) : thumbnailMode === 'upload' ? (
            /* Drop zone / File selector */
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDraggingThumbnail(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDraggingThumbnail(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingThumbnail(false);
                const file = e.dataTransfer.files?.[0];
                if (file) uploadThumbnailFile(file);
              }}
              onClick={() => thumbnailInputRef.current?.click()}
              className={`w-full h-36 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                isDraggingThumbnail
                  ? 'border-indigo-500 bg-indigo-100/50 scale-[0.99]'
                  : 'border-gray-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/30'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700">
                  {isDraggingThumbnail ? 'Drop image here to upload' : 'Click to browse or drag & drop'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Supports PNG, JPG, JPEG, WebP, SVG, GIF, AVIF (max 50 MB)</p>
              </div>
            </div>
          ) : (
            /* URL & Presets mode */
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Direct Image URL or Public Path</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={thumbnailUrlInput}
                    onChange={(e) => setThumbnailUrlInput(e.target.value)}
                    placeholder="e.g. /jolly-clamps-logo.png or https://images.unsplash.com/..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const url = thumbnailUrlInput.trim();
                      if (!url) {
                        setThumbnailError('Please enter a valid image URL or path.');
                        return;
                      }
                      setThumbnailError(null);
                      setThumbnailUrl(url);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition shrink-0"
                  >
                    Apply Image
                  </button>
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1 mb-2">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Quick-pick category presets
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '🛠️ Hydraulics', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80' },
                    { label: '💨 Pneumatics', url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80' },
                    { label: '⚡ PLC Automation', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80' },
                    { label: '🦺 Safety SOP', url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80' },
                    { label: '🏷️ Jolly Clamps Logo', url: '/jolly-clamps-logo.png' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setThumbnailError(null);
                        setThumbnailUrl(preset.url);
                        setThumbnailUrlInput(preset.url);
                      }}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 text-xs rounded-md font-medium transition border border-gray-200"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={thumbnailInputRef}
            type="file"
            accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.svg,.jfif,.avif,.bmp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                uploadThumbnailFile(file);
              }
              // Safely reset input after file is handed off
              setTimeout(() => {
                if (e.target) e.target.value = '';
              }, 100);
            }}
          />

          {thumbnailError && (
            <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <div>
                <span className="font-semibold">Thumbnail Error:</span> {thumbnailError}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              placeholder="e.g. Advanced PLC Programming"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-white"
            >
              <option value="">— Select a category —</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will employees learn?"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
          />
        </div>

        {/* Visibility */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Users className="w-4 h-4" /> Department Access
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setVisibility('all')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                  visibility === 'all'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                }`}
              >
                🌐 All Departments
              </button>
              <button
                type="button"
                onClick={() => setVisibility('specific')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                  visibility === 'specific'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                }`}
              >
                <Lock className="w-3 h-3 inline mr-1" /> Specific Depts
              </button>
            </div>
            {visibility === 'specific' && (
              <div className="mt-3 flex flex-wrap gap-2">
                {ALL_DEPARTMENTS.map(dept => (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setSelectedDepts(prev =>
                      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
                    )}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                      selectedDepts.includes(dept)
                        ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    {DEPT_LABELS[dept]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Award className="w-4 h-4" /> Certification
            </label>
            <button
              type="button"
              onClick={() => setHasCertificate(p => !p)}
              className={`w-full py-2 rounded-lg text-sm font-medium border transition ${
                hasCertificate
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
              }`}
            >
              {hasCertificate ? '✅ Certificate Enabled' : '🎓 Enable Certificate on Completion'}
            </button>
          </div>
        </div>
      </div>

      {/* Module Builder */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Curriculum</h3>
          <button
            onClick={() => setModules((ms) => [...ms, makeModule()])}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center transition"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Module
          </button>
        </div>

        {modules.map((mod, modIdx) => (
          <div key={mod.id} className="border border-gray-200 rounded-xl overflow-hidden">

            {/* Module Header */}
            <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center flex-1 gap-3">
                <GripVertical className="w-5 h-5 text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={mod.title}
                  onChange={(e) => updateModule(mod.id, { title: e.target.value })}
                  className="flex-1 text-sm font-semibold text-gray-800 bg-transparent border-b border-transparent focus:border-indigo-400 focus:outline-none py-0.5 transition"
                />
                <span className="text-xs text-gray-400">Module {modIdx + 1}</span>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <button
                  onClick={() => addLesson(mod.id)}
                  className="text-xs font-medium text-indigo-600 hover:underline"
                >
                  + Add Lesson
                </button>
                {modules.length > 1 && (
                  <button
                    onClick={() => removeModule(mod.id)}
                    className="text-xs font-medium text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Lessons */}
            <div className="p-4 space-y-4 bg-white">
              {mod.lessons.map((lesson, lessonIdx) => (
                <div key={lesson.id} className="border border-indigo-100 rounded-lg p-4 bg-indigo-50/30">

                  {/* Lesson header row */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">
                      Lesson {lessonIdx + 1}
                    </span>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={lesson.title}
                        onChange={(e) => updateLesson(mod.id, lesson.id, { title: e.target.value })}
                        placeholder="Lesson title…"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                    {mod.lessons.length > 1 && (
                      <button
                        onClick={() => removeLesson(mod.id, lesson.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Type toggle */}
                  <div className="flex items-center bg-gray-100 p-1 rounded-lg w-max mb-4">
                    <button
                      onClick={() => updateLesson(mod.id, lesson.id, { type: 'single' })}
                      className={`px-4 py-1.5 text-sm font-medium transition-all rounded-md flex items-center ${
                        lesson.type === 'single'
                          ? 'bg-white shadow text-gray-900 border border-gray-200'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Video className="w-4 h-4 mr-2" /> Single Video
                    </button>
                    <button
                      onClick={() => updateLesson(mod.id, lesson.id, { type: 'playlist' })}
                      className={`px-4 py-1.5 text-sm font-medium transition-all rounded-md flex items-center ${
                        lesson.type === 'playlist'
                          ? 'bg-white shadow text-gray-900 border border-gray-200'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <ListVideo className="w-4 h-4 mr-2" /> Playlist
                    </button>
                  </div>

                  {/* Video content */}
                  {lesson.type === 'single' ? (
                    <SingleVideoUploader
                      lesson={lesson}
                      onUpdate={(patch) => updateLesson(mod.id, lesson.id, patch)}
                    />
                  ) : (
                    <PlaylistBuilder
                      lesson={lesson}
                      onUpdate={(patch) => updateLesson(mod.id, lesson.id, patch)}
                    />
                  )}

                  {/* Quizzes */}
                  <QuizBuilder
                    lesson={lesson}
                    onUpdate={(patch) => updateLesson(mod.id, lesson.id, patch)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-200">
        {editingCourseId && onCancelEdit ? (
          <button
            onClick={onCancelEdit}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
          >
            Cancel
          </button>
        ) : (
          <button
            onClick={() => {
              setModules([makeModule()]); setCourseTitle(''); setDescription('');
              setSelectedCategoryId(''); setThumbnailUrl(null); setThumbnailFile(null); setThumbnailError(null);
            }}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
          >
            Reset
          </button>
        )}
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {publishing ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> {editingCourseId ? 'Updating…' : 'Publishing…'}</>
          ) : (
            editingCourseId ? 'Update Course' : 'Publish Course'
          )}
        </button>
      </div>
    </div>
  );
}
