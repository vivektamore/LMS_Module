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
  return { id: uid(), title: '', file: null, uploadedUrl: null, uploading: false, error: null };
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

  async function handleFile(file: File) {
    if (file.type !== 'video/mp4') {
      onUpdate({ singleError: 'Only .mp4 files are supported.' });
      return;
    }
    onUpdate({ singleFile: file, singleUploading: true, singleError: null, singleUrl: null });
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('path', 'lessons');
      const res = await fetch('/api/upload-video', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      onUpdate({ singleUrl: json.publicUrl, singleUploading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      onUpdate({ singleUploading: false, singleError: msg });
    }
  }

  function handleUrlSave() {
    const url = urlInput.trim();
    if (!url) { onUpdate({ singleError: 'Please enter a video URL.' }); return; }
    onUpdate({ singleUrl: url, singleError: null });
  }

  // Already has a URL set
  if (lesson.singleUrl) {
    return (
      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
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
      <div className="flex items-center gap-3 p-4 border-2 border-dashed border-indigo-300 rounded-lg bg-indigo-50">
        <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
        <span className="text-sm text-indigo-600 font-medium">Uploading video…</span>
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
    updateSegment(segId, { file, uploading: true, error: null, uploadedUrl: null });

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('path', 'playlists');

      const res = await fetch('/api/upload-video', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      updateSegment(segId, { uploadedUrl: json.publicUrl, uploading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      updateSegment(segId, { uploading: false, error: msg });
    }
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
              <div className="flex items-center gap-2 text-xs text-green-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> {seg.file?.name} — uploaded
              </div>
            ) : seg.uploading ? (
              <div className="flex items-center gap-2 text-xs text-indigo-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…
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
  onCourseSaved?: () => void;
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
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [publishError, setPublishError] = useState('');
  const [loadingEditData, setLoadingEditData] = useState(false);

  async function uploadThumbnailFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'jfif', 'avif', 'bmp', 'pjpeg', 'pjp'];
    const isImage = (typeof file.type === 'string' && file.type.startsWith('image/')) || (ext && validExts.includes(ext));

    if (!isImage) {
      setThumbnailError('Please select a valid image file (JPEG, PNG, WebP, SVG, GIF, AVIF).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setThumbnailError('Image must be under 10 MB.');
      return;
    }

    setThumbnailError(null);
    setThumbnailFile(file);
    setThumbnailUploading(true);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload-thumbnail', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error(json.error || 'Admin session expired. Please log out and log back in as admin.');
        }
        throw new Error(json.error || `Upload failed (${res.status})`);
      }
      setThumbnailUrl(json.publicUrl);
      setThumbnailUrlInput(json.publicUrl);
      setThumbnailFile(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setThumbnailError(msg);
      setThumbnailFile(null);
    } finally {
      setThumbnailUploading(false);
    }
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

      setPublishStatus('success');
      if (onCourseSaved) onCourseSaved();
      // Reset form if creating new
      if (!editingCourseId) {
        setTimeout(() => {
          setCourseTitle(''); setDescription(''); setSelectedCategoryId('');
          setVisibility('all'); setSelectedDepts([]); setHasCertificate(false);
          setThumbnailUrl(null); setThumbnailFile(null); setThumbnailError(null);
          setModules([makeModule()]); setPublishStatus('idle');
        }, 2000);
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
        <div className="flex items-center gap-3 mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="font-medium">Course published successfully! Resetting form…</span>
        </div>
      )}
      {publishStatus === 'error' && (
        <div className="flex items-center gap-3 mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
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
            <div className="w-full h-36 border-2 border-dashed border-indigo-300 rounded-xl flex flex-col items-center justify-center gap-2 bg-indigo-50/50 animate-pulse">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <span className="text-sm text-indigo-700 font-semibold">Uploading & optimizing thumbnail…</span>
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
                <p className="text-xs text-gray-400 mt-0.5">Supports PNG, JPG, JPEG, WebP, SVG, GIF (max 10 MB)</p>
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
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) uploadThumbnailFile(file);
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
