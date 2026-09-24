"use client";

import { useState, useEffect, useRef } from 'react';
import {
  GripVertical, UploadCloud, Trash2, Video, ListVideo,
  Plus, Loader2, CheckCircle2, AlertCircle, X, Film,
  Award, Users, Lock, Image as ImageIcon, Link2, Sparkles,
  ChevronUp, ChevronDown, RefreshCw, Check, ArrowLeft,
  Clock, HelpCircle, Eye, Save, Send, FileVideo
} from 'lucide-react';
import Link from 'next/link';

const ALL_DEPARTMENTS = [
  'HR', 'SAFETY', 'MAINTENANCE', 'PRODUCTION', 'QUALITY',
  'DESIGN', 'DEVELOPMENT', 'IT', 'AI',
  'CENTRAL_PROCESSING_ENGINEERING', 'STORE', 'DISPATCH'
] as const;

const DEPT_LABELS: Record<string, string> = {
  HR: 'HR',
  SAFETY: 'Safety',
  MAINTENANCE: 'Maintenance',
  PRODUCTION: 'Production',
  QUALITY: 'Quality',
  DESIGN: 'Design',
  DEVELOPMENT: 'Development',
  IT: 'IT',
  AI: 'AI',
  CENTRAL_PROCESSING_ENGINEERING: 'CPE',
  STORE: 'Store',
  DISPATCH: 'Dispatch',
};

const DEPT_CODE_MAP: Record<string, string> = {
  MAINTENANCE: 'MNT',
  PRODUCTION: 'PRD',
  QUALITY: 'QLT',
  SAFETY: 'SAF',
  HR: 'HR',
  DESIGN: 'DSG',
  DEVELOPMENT: 'DEV',
  IT: 'IT',
  AI: 'AI',
  CENTRAL_PROCESSING_ENGINEERING: 'CPE',
  STORE: 'STR',
  DISPATCH: 'DSP',
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')     // remove non-alphanumeric except space and hyphen
    .replace(/[\s_-]+/g, '-')     // replace spaces, underscores, multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '');     // remove leading/trailing hyphens
}

function generateCourseCode(departments: string[], categoryName?: string) {
  let deptCode = 'GEN';
  if (departments.length > 0) {
    deptCode = DEPT_CODE_MAP[departments[0]] || departments[0].slice(0, 3).toUpperCase();
  } else if (categoryName) {
    const cat = categoryName.toUpperCase();
    if (cat.includes('MAINT')) deptCode = 'MNT';
    else if (cat.includes('PROD') || cat.includes('MANUF')) deptCode = 'PRD';
    else if (cat.includes('SAFE')) deptCode = 'SAF';
    else if (cat.includes('QUAL')) deptCode = 'QLT';
    else if (cat.includes('ENG')) deptCode = 'ENG';
    else if (cat.includes('TOOL') || cat.includes('CNC')) deptCode = 'CNC';
    else deptCode = cat.replace(/[^A-Z]/g, '').slice(0, 3) || 'GEN';
  }
  return `JC-${deptCode}-001`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlaylistSegment {
  id: string;
  title: string;
  file: File | null;
  fileName?: string;
  fileSize?: number;
  durationSeconds?: number;
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
  duration_seconds?: number;
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

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function cleanFileNameToTitle(name: string): string {
  return name
    .replace(/\.[^/.]+$/, '') // strip extension
    .replace(/^[0-9]+[\s_.-]*/, '') // strip leading "01 - " or "1_"
    .replace(/[_-]+/g, ' ') // replace underscores/dashes with spaces
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()); // Capitalize words
}

function probeVideoDuration(fileOrUrl: File | string): Promise<number> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        if (fileOrUrl instanceof File) window.URL.revokeObjectURL(video.src);
        resolve(Math.round(video.duration || 0));
      };
      video.onerror = () => {
        if (fileOrUrl instanceof File) window.URL.revokeObjectURL(video.src);
        resolve(0);
      };
      if (fileOrUrl instanceof File) {
        video.src = URL.createObjectURL(fileOrUrl);
      } else {
        video.src = fileOrUrl;
      }
    } catch {
      resolve(0);
    }
  });
}

function formatSeconds(sec: number) {
  if (!sec || sec <= 0) return '0s';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m > 0 && s > 0) return `${m}m ${s}s`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

function makeLesson(): Lesson {
  return {
    id: uid(),
    title: '',
    type: 'single',
    duration_seconds: 0,
    singleFile: null,
    singleUrl: null,
    singleUploading: false,
    singleError: null,
    segments: [],
    quizzes: [],
  };
}

function makeModule(index: number = 1): Module {
  return {
    id: uid(),
    title: `Module ${index}`,
    lessons: [makeLesson()],
  };
}

function makeSegment(title = '', file: File | null = null, fileName = '', fileSize?: number): PlaylistSegment {
  return {
    id: uid(),
    title,
    file,
    fileName: fileName || (file ? file.name : ''),
    fileSize: fileSize || (file ? file.size : undefined),
    durationSeconds: 0,
    uploadedUrl: null,
    uploading: false,
    uploadPercent: 0,
    error: null,
  };
}

// ─── Single Video Uploader ───────────────────────────────────────────────────

function SingleVideoUploader({
  lesson,
  onUpdate,
}: {
  lesson: Lesson;
  onUpdate: (patch: Partial<Lesson>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState(lesson.singleUrl ?? '');
  const [uploadPercent, setUploadPercent] = useState<number>(0);

  async function handleFile(file: File) {
    if (file.type !== 'video/mp4' && !file.name.toLowerCase().endsWith('.mp4')) {
      onUpdate({ singleError: 'Only .mp4 files are supported.' });
      return;
    }
    const duration = await probeVideoDuration(file);
    setUploadPercent(0);
    onUpdate({
      singleFile: file,
      duration_seconds: duration,
      singleUploading: true,
      singleError: null,
      singleUrl: null,
    });

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
          onUpdate({ singleUrl: json.publicUrl, duration_seconds: duration, singleUploading: false });
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

  async function handleUrlSave() {
    const url = urlInput.trim();
    if (!url) {
      onUpdate({ singleError: 'Please enter a video URL.' });
      return;
    }
    const duration = await probeVideoDuration(url);
    onUpdate({ singleUrl: url, duration_seconds: duration, singleError: null });
  }

  // Video ready state
  if (lesson.singleUrl) {
    const durStr = lesson.duration_seconds ? ` • ${formatSeconds(lesson.duration_seconds)}` : '';
    return (
      <div className="flex items-center justify-between gap-3 p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-emerald-900 truncate">
              {lesson.singleFile?.name ?? lesson.singleUrl}
            </p>
            <p className="text-[11px] text-emerald-700">Video attached{durStr}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onUpdate({ singleFile: null, singleUrl: null, duration_seconds: 0 });
            setUrlInput('');
          }}
          className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-red-700 hover:bg-red-50 rounded border border-slate-200 bg-white transition cursor-pointer"
        >
          Replace
        </button>
      </div>
    );
  }

  if (lesson.singleUploading) {
    return (
      <div className="p-3 bg-red-50/60 border border-red-200 rounded-lg space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-slate-800">
          <span className="flex items-center gap-2 truncate">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c62828] shrink-0" />
            Uploading {lesson.singleFile?.name || 'video.mp4'}…
          </span>
          <span className="font-mono font-bold text-[#c62828] bg-white px-2 py-0.5 rounded border border-red-200">
            {uploadPercent}%
          </span>
        </div>
        <div className="w-full bg-red-200/80 rounded-full h-2 overflow-hidden">
          <div
            className="bg-[#c62828] h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.max(5, uploadPercent)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg w-max text-xs">
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`px-3 py-1 rounded text-xs font-semibold transition cursor-pointer ${
            mode === 'upload' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Upload MP4
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`px-3 py-1 rounded text-xs font-semibold transition cursor-pointer ${
            mode === 'url' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Direct URL
        </button>
      </div>

      {mode === 'upload' ? (
        <label
          className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-[#c62828] rounded-lg p-5 bg-[#f8fafc] hover:bg-red-50/20 transition cursor-pointer group"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
        >
          <UploadCloud className="w-7 h-7 text-slate-400 group-hover:text-[#c62828] mb-1.5 transition" />
          <span className="text-xs font-semibold text-slate-700 group-hover:text-[#c62828]">
            Click to upload, or drag &amp; drop video (.mp4)
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5">Maximum file size 500 MB</span>
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>
      ) : (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/shopfloor-lesson.mp4"
            className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#c62828] focus:ring-1 focus:ring-[#c62828]"
          />
          <button
            type="button"
            onClick={handleUrlSave}
            className="px-3 py-1.5 bg-[#c62828] text-white text-xs font-semibold rounded-lg hover:bg-[#a20513] transition cursor-pointer"
          >
            Apply URL
          </button>
        </div>
      )}

      {lesson.singleError && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {lesson.singleError}
        </p>
      )}
    </div>
  );
}

// ─── Multi-Part Video Builder (Playlist) ─────────────────────────────────────

function PlaylistBuilder({
  lesson,
  onUpdate,
}: {
  lesson: Lesson;
  onUpdate: (patch: Partial<Lesson>) => void;
}) {
  const [isBatchDragging, setIsBatchDragging] = useState(false);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  function updateSegment(segId: string, patch: Partial<PlaylistSegment>) {
    onUpdate({
      segments: lesson.segments.map((s) => (s.id === segId ? { ...s, ...patch } : s)),
    });
  }

  function moveSegment(index: number, direction: 'up' | 'down') {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= lesson.segments.length) return;
    const next = [...lesson.segments];
    const temp = next[index];
    next[index] = next[newIdx];
    next[newIdx] = temp;
    onUpdate({ segments: next });
  }

  async function uploadFileForSegment(segId: string, file: File, customTitle?: string) {
    if (file.type !== 'video/mp4' && !file.name.toLowerCase().endsWith('.mp4')) {
      updateSegment(segId, { error: 'Only .mp4 video files are supported.' });
      return;
    }

    const duration = await probeVideoDuration(file);
    const titlePatch = customTitle ? { title: customTitle } : {};

    const currentSegments = lesson.segments.map((s) =>
      s.id === segId
        ? {
            ...s,
            ...titlePatch,
            file,
            fileName: file.name,
            fileSize: file.size,
            durationSeconds: duration,
            uploading: true,
            uploadPercent: 0,
            error: null,
            uploadedUrl: null,
          }
        : s
    );
    const totalLessonDur = currentSegments.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
    onUpdate({ segments: currentSegments, duration_seconds: totalLessonDur });

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
          updateSegment(segId, {
            uploadedUrl: json.publicUrl,
            uploading: false,
            uploadPercent: 100,
            fileName: file.name,
            fileSize: file.size,
            durationSeconds: duration,
          });
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

  async function handleBatchFiles(files: File[]) {
    const mp4Files = files.filter(
      (f) => f.type === 'video/mp4' || f.name.toLowerCase().endsWith('.mp4')
    );

    if (mp4Files.length === 0) {
      alert('Please drop valid .mp4 video files.');
      return;
    }

    mp4Files.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    const newSegments: PlaylistSegment[] = [];
    for (const file of mp4Files) {
      const generatedTitle = cleanFileNameToTitle(file.name);
      const dur = await probeVideoDuration(file);
      const seg = makeSegment(generatedTitle, file, file.name, file.size);
      seg.durationSeconds = dur;
      newSegments.push(seg);
    }

    const updatedSegments = [...lesson.segments, ...newSegments];
    const totalLessonDur = updatedSegments.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
    onUpdate({ segments: updatedSegments, duration_seconds: totalLessonDur });

    newSegments.forEach((seg, idx) => {
      uploadFileForSegment(seg.id, mp4Files[idx]);
    });
  }

  return (
    <div className="space-y-3 pl-2 sm:pl-3 border-l-2 border-slate-200">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
        <span>Video Parts (Sequential Playback)</span>
        <span className="font-mono text-slate-400">
          {lesson.segments.length} {lesson.segments.length === 1 ? 'Part' : 'Parts'} Configured
        </span>
      </div>

      {/* Batch Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsBatchDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsBatchDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsBatchDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleBatchFiles(Array.from(e.dataTransfer.files));
          }
        }}
        onClick={() => batchFileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-3 text-center transition cursor-pointer ${
          isBatchDragging
            ? 'border-[#c62828] bg-red-50/50'
            : 'border-slate-300 hover:border-[#c62828] bg-[#f8fafc]'
        }`}
      >
        <input
          ref={batchFileInputRef}
          type="file"
          accept="video/mp4"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleBatchFiles(Array.from(e.target.files));
              e.target.value = '';
            }
          }}
        />
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-700">
          <UploadCloud className="w-4 h-4 text-[#c62828]" />
          <span>Drag &amp; drop multiple MP4 files or click to browse</span>
        </div>
      </div>

      {/* Parts List */}
      <div className="space-y-2">
        {lesson.segments.map((seg, idx) => {
          const displayFileName =
            seg.fileName ||
            seg.file?.name ||
            (seg.uploadedUrl
              ? decodeURIComponent(seg.uploadedUrl.split('/').pop() || '').replace(/^\d+_/, '')
              : '');

          return (
            <div
              key={seg.id}
              className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition shadow-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {/* Reorder and Part Number */}
                <div className="flex items-center gap-1 shrink-0">
                  <div className="w-7 h-7 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-[#c62828] font-bold font-mono text-[11px]">
                    P{idx + 1}
                  </div>
                  <div className="flex flex-col -space-y-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveSegment(idx, 'up')}
                      className="text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === lesson.segments.length - 1}
                      onClick={() => moveSegment(idx, 'down')}
                      className="text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Title & Status */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={seg.title}
                      onChange={(e) => updateSegment(seg.id, { title: e.target.value })}
                      placeholder={`PART ${idx + 1}: Title`}
                      className="font-semibold text-xs text-slate-900 border-b border-transparent focus:border-[#c62828] focus:outline-none bg-transparent w-full"
                    />
                    {seg.durationSeconds ? (
                      <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                        {formatSeconds(seg.durationSeconds)}
                      </span>
                    ) : null}
                  </div>

                  {seg.uploadedUrl ? (
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-mono font-medium truncate">{displayFileName}</span>
                      {seg.fileSize && <span>· {formatBytes(seg.fileSize)}</span>}
                    </div>
                  ) : seg.uploading ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Loader2 className="w-3 h-3 animate-spin text-[#c62828]" />
                      <span className="text-[11px] text-[#c62828]">Uploading ({seg.uploadPercent}%)…</span>
                    </div>
                  ) : (
                    <label className="inline-flex items-center gap-1 text-[11px] text-[#c62828] hover:underline cursor-pointer mt-0.5">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Select video file</span>
                      <input
                        type="file"
                        accept="video/mp4"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadFileForSegment(seg.id, f);
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                <label className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 border border-slate-300 rounded bg-white transition cursor-pointer shadow-xs">
                  Replace
                  <input
                    type="file"
                    accept="video/mp4"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadFileForSegment(seg.id, f);
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => onUpdate({ segments: lesson.segments.filter((s) => s.id !== seg.id) })}
                  className="p-1 text-slate-400 hover:text-red-600 rounded transition cursor-pointer"
                  title="Remove Part"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Video Part Button */}
      <button
        type="button"
        onClick={() => onUpdate({ segments: [...lesson.segments, makeSegment(`Part ${lesson.segments.length + 1}`)] })}
        className="w-full py-2 border border-dashed border-slate-300 hover:border-[#c62828] text-slate-600 hover:text-[#c62828] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-white hover:bg-red-50/20 transition cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>+ Add Video Part</span>
      </button>
    </div>
  );
}

// ─── In-Video Quiz Checkpoint Builder ─────────────────────────────────────────

function QuizBuilder({
  lesson,
  onUpdate,
}: {
  lesson: Lesson;
  onUpdate: (patch: Partial<Lesson>) => void;
}) {
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);

  function addQuiz() {
    const newQ: Quiz = {
      id: uid(),
      timestampSec: 60,
      question: '',
      options: ['', '', '', ''],
      correctIndex: 0,
    };
    onUpdate({ quizzes: [...lesson.quizzes, newQ] });
    setExpandedQuizId(newQ.id);
  }

  function updateQuiz(qId: string, patch: Partial<Quiz>) {
    onUpdate({
      quizzes: lesson.quizzes.map((q) => (q.id === qId ? { ...q, ...patch } : q)),
    });
  }

  function removeQuiz(qId: string) {
    onUpdate({ quizzes: lesson.quizzes.filter((q) => q.id !== qId) });
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
    <div className="space-y-3 pt-3 border-t border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-semibold text-slate-800">
            In-Video Checkpoint Quizzes
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            ({lesson.quizzes.length})
          </span>
        </div>
        <button
          type="button"
          onClick={addQuiz}
          className="px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-md transition cursor-pointer flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Checkpoint</span>
        </button>
      </div>

      <div className="space-y-2.5">
        {lesson.quizzes.map((q, qIdx) => {
          const isExpanded = expandedQuizId === q.id || !q.question.trim();
          return (
            <div
              key={q.id}
              className="p-3 bg-amber-50/40 border border-amber-200 rounded-lg shadow-xs space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-xs font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                    Q{qIdx + 1}
                  </span>
                  <span className="text-xs font-semibold text-slate-900 truncate">
                    {q.question.trim() || 'Untitled Question'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setExpandedQuizId(isExpanded ? null : q.id)}
                    className="px-2 py-0.5 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition cursor-pointer"
                  >
                    {isExpanded ? 'Collapse' : 'Edit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeQuiz(q.id)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded transition cursor-pointer"
                    title="Remove Quiz"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="space-y-3 pt-2 border-t border-amber-200/70">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-slate-700 shrink-0">
                      Pause Timestamp:
                    </label>
                    <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-300">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={formatTime(q.timestampSec)}
                        onChange={(e) => updateQuiz(q.id, { timestampSec: parseTime(e.target.value) })}
                        placeholder="01:30"
                        className="w-14 text-xs font-mono font-medium focus:outline-none"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500">(MM:SS)</span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Question Prompt:
                    </label>
                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => updateQuiz(q.id, { question: e.target.value })}
                      placeholder="e.g. What is the required torque setting for DIN 3017 clamps?"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:border-[#c62828]"
                    />
                  </div>

                  <div className="space-y-1.5 pl-2 border-l-2 border-amber-200">
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Multiple Choice Options (Select radio for correct answer)
                    </label>
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`quiz-correct-${q.id}`}
                          checked={q.correctIndex === optIdx}
                          onChange={() => updateQuiz(q.id, { correctIndex: optIdx })}
                          className="w-3.5 h-3.5 text-[#c62828] focus:ring-[#c62828] cursor-pointer"
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const next = [...q.options];
                            next[optIdx] = e.target.value;
                            updateQuiz(q.id, { options: next });
                          }}
                          placeholder={`Option ${optIdx + 1}`}
                          className={`flex-1 px-2.5 py-1 text-xs border rounded bg-white focus:outline-none ${
                            q.correctIndex === optIdx
                              ? 'border-emerald-500 bg-emerald-50/40 font-medium'
                              : 'border-slate-300'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main CourseBuilder Component ─────────────────────────────────────────────

export interface CourseBuilderProps {
  editingCourseId?: string | null;
  onCourseSaved?: (savedId?: string) => void;
  onCancelEdit?: () => void;
}

export function CourseBuilder({ editingCourseId, onCourseSaved, onCancelEdit }: CourseBuilderProps) {
  // 01 Basic Information
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCode, setCourseCode] = useState('JC-TRN-101');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  // Thumbnail
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailUploadPercent, setThumbnailUploadPercent] = useState(0);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customThumbnailUrl, setCustomThumbnailUrl] = useState('');
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // 02 Course Settings
  const [estimatedDuration, setEstimatedDuration] = useState('2h 30m');
  const [visibility, setVisibility] = useState<'all' | 'specific'>('specific');
  const [selectedDepts, setSelectedDepts] = useState<string[]>(['MAINTENANCE', 'PRODUCTION']);
  const [hasCertificate, setHasCertificate] = useState(true);

  // Category inline creation
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [savingNewCat, setSavingNewCat] = useState(false);
  const [newCatError, setNewCatError] = useState('');
  const [isManualCode, setIsManualCode] = useState(false);

  // 03 Curriculum
  const [modules, setModules] = useState<Module[]>([makeModule(1)]);

  // Auto-generate course code based on selected department or category
  useEffect(() => {
    if (!editingCourseId && !isManualCode) {
      const catObj = categories.find((c) => c.id === selectedCategoryId);
      const depts = visibility === 'specific' ? selectedDepts : [];
      setCourseCode(generateCourseCode(depts, catObj?.name));
    }
  }, [selectedDepts, visibility, selectedCategoryId, categories, editingCourseId, isManualCode]);

  // Publish Status
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedCourseTitle, setSavedCourseTitle] = useState('');
  const [loadingEditData, setLoadingEditData] = useState(false);

  // Load categories
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((json) => {
        if (json.categories) setCategories(json.categories);
      })
      .catch(console.error);
  }, []);

  // Fetch existing course if editing
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
          setCustomThumbnailUrl(c.thumbnail_url || '');

          if (c.modules?.length) {
            const loadedModules: Module[] = c.modules.map((m: any, mIdx: number) => ({
              id: m.id || uid(),
              title: m.title || `Module ${mIdx + 1}`,
              lessons: (m.lessons || []).map((l: any) => ({
                id: l.id || uid(),
                title: l.title || 'Untitled Lesson',
                type: l.playlist_urls?.length ? 'playlist' : 'single',
                duration_seconds: l.duration_seconds || 0,
                singleFile: null,
                singleUrl: l.video_url || null,
                singleUploading: false,
                singleError: null,
                segments: (l.playlist_urls || []).map((p: any) => {
                  let inferredFileName = '';
                  if (p.url) {
                    const raw = decodeURIComponent(p.url.split('/').pop() || '');
                    inferredFileName = raw.replace(/^\d+_/, '');
                  }
                  return {
                    id: uid(),
                    title: p.title || '',
                    file: null,
                    fileName: inferredFileName || p.title || 'Video segment',
                    uploadedUrl: p.url || null,
                    uploading: false,
                    error: null,
                  };
                }),
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

  // Handle Thumbnail File Upload
  async function uploadThumbnailFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setThumbnailError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setThumbnailError('Image size exceeds 20MB.');
      return;
    }

    setThumbnailError(null);
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
          setCustomThumbnailUrl(json.publicUrl);
        } catch {
          setThumbnailError('Invalid response from server.');
        }
      } else {
        setThumbnailError('Thumbnail upload failed.');
      }
    };

    xhr.onerror = () => {
      setThumbnailUploading(false);
      setThumbnailError('Network error uploading thumbnail.');
    };

    xhr.send(fd);
  }

  // Handle inline category creation
  async function handleCreateCategory() {
    const finalSlug = slugify(newCatSlug.trim() || newCatName.trim());
    if (!newCatName.trim() || !finalSlug) {
      setNewCatError('Category name and slug are required.');
      return;
    }
    setSavingNewCat(true);
    setNewCatError('');
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim(), slug: finalSlug }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create category');

      const created = json.category;
      setCategories((prev) => [...prev, created]);
      setSelectedCategoryId(created.id);
      setNewCatName('');
      setNewCatSlug('');
      setShowNewCategoryForm(false);
      window.dispatchEvent(new Event('category-saved'));
    } catch (err: unknown) {
      setNewCatError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setSavingNewCat(false);
    }
  }

  // Modules helpers
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

  // Publish / Save
  async function handlePublish() {
    if (!courseTitle.trim()) {
      alert('Please enter a course title.');
      return;
    }
    if (!selectedCategoryId) {
      alert('Please select a category.');
      return;
    }
    if (visibility === 'specific' && selectedDepts.length === 0) {
      alert('Please select at least one department under "Department Access" or switch to "All Departments".');
      return;
    }
    if (!modules.length) {
      alert('Add at least one curriculum module.');
      return;
    }

    // Validate lessons
    for (const mod of modules) {
      for (const lesson of mod.lessons) {
        if (!lesson.title.trim()) {
          alert(`A lesson in "${mod.title}" has no title.`);
          return;
        }
        if (lesson.type === 'single' && !lesson.singleUrl) {
          alert(`Lesson "${lesson.title}" needs a video upload or direct URL.`);
          return;
        }
        if (lesson.type === 'playlist') {
          if (lesson.segments.length === 0) {
            alert(`Multi-part lesson "${lesson.title}" must have at least one video part.`);
            return;
          }
          for (const seg of lesson.segments) {
            if (!seg.uploadedUrl) {
              alert(`Video part "${seg.title || 'Untitled'}" is not yet uploaded.`);
              return;
            }
          }
        }
      }
    }

    setPublishing(true);
    setPublishError('');

    try {
      const body = {
        title: courseTitle,
        description,
        thumbnail_url: thumbnailUrl,
        category_id: selectedCategoryId,
        created_by: null,
        visibility,
        departments: visibility === 'specific' ? selectedDepts : [],
        has_certificate: hasCertificate,
        modules: modules.map((mod, mi) => ({
          id: mod.id,
          title: mod.title,
          order_index: mi,
          lessons: mod.lessons.map((lesson, li) => ({
            id: lesson.id,
            title: lesson.title,
            type: lesson.type,
            video_url: lesson.type === 'single' ? lesson.singleUrl : undefined,
            playlist_urls:
              lesson.type === 'playlist'
                ? lesson.segments.map((s) => ({ title: s.title, url: s.uploadedUrl }))
                : undefined,
            duration_seconds: lesson.duration_seconds || 0,
            order_index: li,
            quizzes: lesson.quizzes.map((q) => ({
              id: q.id,
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
      setSavedCourseTitle(courseTitle);
      setShowSuccessModal(true);
      if (onCourseSaved) onCourseSaved(savedId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Publish failed';
      setPublishError(msg);
      alert(`Error saving course: ${msg}`);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div id="course-builder" className="w-full flex flex-col gap-6 font-sans text-slate-900">
      {/* ── Top Command & Action Bar Header ── */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl z-30 px-5 py-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Breadcrumb, Title & Status */}
          <div className="flex flex-col gap-1">
            {onCancelEdit && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="inline-flex items-center gap-1.5 text-slate-500 hover:text-[#c62828] transition-colors text-xs font-semibold cursor-pointer w-max"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Courses</span>
              </button>
            )}
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {editingCourseId ? 'Edit Course Curriculum' : 'Create Course'}
              </h1>
              <span className="bg-slate-100 text-slate-600 border border-slate-300 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider font-mono">
                {editingCourseId ? 'Published' : 'Draft'}
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {editingCourseId && (
              <Link
                href={`/courses/${editingCourseId}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                <Eye className="w-4 h-4 text-slate-400" />
                <span>Preview</span>
              </Link>
            )}

            {onCancelEdit ? (
              <button
                type="button"
                onClick={onCancelEdit}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCourseTitle('');
                  setDescription('');
                  setSelectedCategoryId('');
                  setThumbnailUrl(null);
                  setModules([makeModule(1)]);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Reset
              </button>
            )}

            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#c62828] hover:bg-[#a20513] text-white rounded-lg text-xs font-semibold transition shadow-sm cursor-pointer disabled:opacity-60"
            >
              {publishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{editingCourseId ? 'Updating…' : 'Publishing…'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{editingCourseId ? 'Update Course' : 'Publish Course'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── SECTION 01: BASIC INFORMATION ── */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#c62828]"></div>
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded bg-slate-100 text-[#c62828] font-mono text-xs font-bold flex items-center justify-center border border-slate-300">
              01
            </span>
            <h2 className="text-base font-bold text-slate-900">Basic Information</h2>
          </div>
          <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
            Metadata &amp; Identity
          </span>
        </div>

        <div className="flex flex-col gap-5">
          {/* Thumbnail 16:9 Uploader */}
          <div>
            <label className="block font-semibold text-xs text-slate-900 mb-1.5">
              Course Thumbnail{' '}
              <span className="font-normal text-slate-500">
                (Displayed across mobile, tablet, and shopfloor catalog cards)
              </span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-3 bg-[#f8fafc] border border-slate-200 rounded-xl">
              {/* Preview Box */}
              <div className="md:col-span-5 relative group overflow-hidden rounded-lg border border-slate-300 bg-white aspect-video flex items-center justify-center">
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt="Course thumbnail preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                    <ImageIcon className="w-8 h-8 mb-1 text-slate-300" />
                    <span className="text-xs font-medium">No thumbnail selected</span>
                  </div>
                )}

                {thumbnailUrl && (
                  <div className="absolute inset-0 bg-slate-900/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                    <button
                      type="button"
                      onClick={() => thumbnailInputRef.current?.click()}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-900 rounded text-xs font-semibold cursor-pointer shadow-xs"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setThumbnailUrl(null);
                        setCustomThumbnailUrl('');
                      }}
                      className="p-1 bg-white hover:bg-red-50 text-red-600 rounded cursor-pointer shadow-xs"
                      title="Remove thumbnail"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <span className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                  16:9 Aspect Ratio
                </span>
              </div>

              {/* Upload Dropzone */}
              <div className="md:col-span-7 flex flex-col justify-between border-2 border-dashed border-slate-300 hover:border-[#c62828] rounded-lg p-4 text-center bg-white transition">
                <div className="flex flex-col items-center justify-center py-2">
                  <UploadCloud className="w-8 h-8 text-[#c62828] mb-1" />
                  <p className="font-semibold text-xs text-slate-800 mb-0.5">
                    Drag &amp; drop course thumbnail here, or click to browse
                  </p>
                  <p className="text-[11px] text-slate-500">Supports PNG, JPG, WebP (Max 20MB)</p>
                  {thumbnailUploading && (
                    <div className="w-full max-w-xs mt-2 space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-[#c62828]">
                        <span>Uploading...</span>
                        <span>{thumbnailUploadPercent}%</span>
                      </div>
                      <div className="w-full bg-red-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#c62828] h-full transition-all duration-200"
                          style={{ width: `${thumbnailUploadPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {thumbnailError && (
                    <p className="text-xs text-red-600 mt-1 font-medium">{thumbnailError}</p>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => thumbnailInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-slate-600" />
                    <span>Browse Files</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUrlInput((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-600 text-xs font-medium cursor-pointer"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Image URL</span>
                  </button>
                </div>

                {showUrlInput && (
                  <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
                    <input
                      type="url"
                      value={customThumbnailUrl}
                      onChange={(e) => setCustomThumbnailUrl(e.target.value)}
                      placeholder="https://example.com/thumbnail.jpg"
                      className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:border-[#c62828]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customThumbnailUrl.trim()) {
                          setThumbnailUrl(customThumbnailUrl.trim());
                          setShowUrlInput(false);
                        }
                      }}
                      className="px-3 py-1 bg-[#c62828] text-white text-xs font-semibold rounded hover:bg-[#a20513] cursor-pointer"
                    >
                      Set URL
                    </button>
                  </div>
                )}

                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadThumbnailFile(f);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
          </div>

          {/* Course Title & Code */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8">
              <label className="block font-semibold text-xs text-slate-900 mb-1.5">
                Course Title <span className="text-[#c62828]">*</span>
              </label>
              <input
                type="text"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="e.g. Machine Maintenance Video Series"
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-[#c62828] focus:ring-1 focus:ring-[#c62828] focus:outline-none"
              />
            </div>
            <div className="md:col-span-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-xs text-slate-900">
                  Course Code / SOP ID <span className="text-[#c62828]">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const selectedCatName = categories.find((c) => c.id === selectedCategoryId)?.name;
                    const depts = visibility === 'specific' ? selectedDepts : [];
                    const code = generateCourseCode(depts, selectedCatName);
                    setCourseCode(code);
                    setIsManualCode(false);
                  }}
                  className="text-[11px] font-semibold text-[#c62828] hover:underline cursor-pointer flex items-center gap-1"
                  title="Auto-generate course code based on selected department"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Auto: {generateCourseCode(visibility === 'specific' ? selectedDepts : [], categories.find((c) => c.id === selectedCategoryId)?.name)}</span>
                </button>
              </div>
              <input
                type="text"
                value={courseCode}
                onChange={(e) => {
                  setCourseCode(e.target.value.toUpperCase());
                  setIsManualCode(true);
                }}
                placeholder="e.g. JC-MNT-001"
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg font-mono text-xs text-slate-900 uppercase tracking-wider focus:border-[#c62828] focus:ring-1 focus:ring-[#c62828] focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Auto-generated from Department (e.g. <span className="font-mono text-slate-700 font-semibold">JC-MNT-001</span>)
              </p>
            </div>
          </div>

          {/* Category Dropdown & Inline Creator */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-xs text-slate-900">
                Category <span className="text-[#c62828]">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowNewCategoryForm((v) => !v)}
                className="text-xs font-semibold text-[#c62828] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Category</span>
              </button>
            </div>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-[#c62828] focus:ring-1 focus:ring-[#c62828] focus:outline-none cursor-pointer"
            >
              <option value="">— Select Category —</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            {/* Inline Category Creator Form */}
            {showNewCategoryForm && (
              <div className="mt-2.5 p-3.5 bg-slate-50 border border-slate-300 rounded-lg space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-[#c62828]" />
                    New Course Category
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCategoryForm(false);
                      setNewCatError('');
                    }}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Category Name <span className="text-[#c62828]">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewCatName(val);
                        setNewCatSlug(slugify(val));
                      }}
                      placeholder="e.g. Machine Maintenance"
                      className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded focus:border-[#c62828] focus:outline-none"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-slate-600">
                        Category Slug <span className="text-[#c62828]">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-normal">Auto-generated</span>
                    </div>
                    <input
                      type="text"
                      value={newCatSlug}
                      onChange={(e) => setNewCatSlug(slugify(e.target.value))}
                      placeholder="e.g. machine-maintenance"
                      className="w-full h-9 px-3 text-xs font-mono bg-white border border-slate-300 rounded focus:border-[#c62828] focus:outline-none"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Slug is required for category URL routing (e.g. <span className="font-mono text-slate-700">machine-maintenance</span>).
                </p>
                {newCatError && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {newCatError}
                  </p>
                )}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCategoryForm(false);
                      setNewCatError('');
                    }}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200/60 rounded border border-slate-300 bg-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={savingNewCat}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#c62828] hover:bg-[#a20513] rounded shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {savingNewCat && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save &amp; Select</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-xs text-slate-900 mb-1.5">
              Description <span className="font-normal text-slate-500">(Curriculum syllabus overview)</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the machine operations, safety guidelines, and procedures covered in this course..."
              className="w-full p-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-[#c62828] focus:ring-1 focus:ring-[#c62828] focus:outline-none resize-y"
            />
          </div>
        </div>
      </section>

      {/* ── SECTION 02: COURSE SETTINGS ── */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#475569]"></div>
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded bg-slate-100 text-[#475569] font-mono text-xs font-bold flex items-center justify-center border border-slate-300">
              02
            </span>
            <h2 className="text-base font-bold text-slate-900">Course Settings</h2>
          </div>
          <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
            Access &amp; Rules
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Estimated Duration & Completion Certificate */}
          <div className="flex flex-col gap-4">
            <div>
              <label className="block font-semibold text-xs text-slate-900 mb-1.5">
                Estimated Duration
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  placeholder="e.g. 2h 30m"
                  className="w-full h-10 pl-9 pr-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-[#c62828] focus:ring-1 focus:ring-[#c62828] focus:outline-none"
                />
              </div>
            </div>

            {/* Certificate Checkbox */}
            <div className="p-3 bg-[#f8fafc] border border-slate-200 rounded-lg mt-1">
              <label className="inline-flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasCertificate}
                  onChange={(e) => setHasCertificate(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-[#c62828] rounded border-slate-300 focus:ring-[#c62828]"
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-emerald-600" />
                    Enable Certificate on Completion
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">
                    Requires passing score on lesson quizzes to issue verified certificate.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Right Column: Department Access */}
          <div className="flex flex-col gap-3 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-xs text-slate-900">
                Department Access
              </label>
              {visibility === 'specific' && (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedDepts([...ALL_DEPARTMENTS])}
                    className="text-[#c62828] hover:underline font-semibold cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedDepts([])}
                    className="text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 hover:text-slate-900">
                <input
                  type="radio"
                  name="dept_mode"
                  checked={visibility === 'all'}
                  onChange={() => setVisibility('all')}
                  className="w-4 h-4 text-[#c62828] focus:ring-[#c62828]"
                />
                <span>All Departments</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-900">
                <input
                  type="radio"
                  name="dept_mode"
                  checked={visibility === 'specific'}
                  onChange={() => setVisibility('specific')}
                  className="w-4 h-4 text-[#c62828] focus:ring-[#c62828]"
                />
                <span>Specific Departments</span>
              </label>
            </div>

            {visibility === 'specific' && (
              <div className="space-y-2 mt-1">
                {selectedDepts.length === 0 && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                    Please select at least one department below.
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {ALL_DEPARTMENTS.map((dept) => {
                    const isSelected = selectedDepts.includes(dept);
                    return (
                      <button
                        key={dept}
                        type="button"
                        onClick={() =>
                          setSelectedDepts((prev) =>
                            prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
                          )
                        }
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                          isSelected
                            ? 'bg-red-50 text-[#c62828] border border-[#c62828]'
                            : 'bg-white border border-slate-300 text-slate-600 hover:border-slate-400'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{DEPT_LABELS[dept]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── SECTION 03: CURRICULUM ── */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#c62828]"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 mb-5 gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded bg-slate-100 text-[#c62828] font-mono text-xs font-bold flex items-center justify-center border border-slate-300">
              03
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Curriculum</h2>
              <p className="text-xs text-slate-500">
                Course → Module → Lesson → Multi-Part Video → Checkpoint Quiz
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModules((ms) => [...ms, makeModule(ms.length + 1)])}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#c62828]" />
            <span>Add Module</span>
          </button>
        </div>

        {/* Modules List */}
        <div className="flex flex-col gap-5">
          {modules.map((mod, modIdx) => (
            <div key={mod.id} className="border border-slate-200 rounded-xl bg-[#fafafa] overflow-hidden">
              {/* Module Header */}
              <div className="bg-white px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-mono text-[11px] font-bold uppercase text-[#c62828] bg-red-50 border border-red-200 px-2 py-0.5 rounded shrink-0">
                    MODULE {modIdx + 1}
                  </span>
                  <input
                    type="text"
                    value={mod.title}
                    onChange={(e) => updateModule(mod.id, { title: e.target.value })}
                    className="font-bold text-sm text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#c62828] focus:outline-none px-1 py-0.5 flex-1"
                    placeholder="Module Title..."
                  />
                  <span className="text-xs text-slate-500 font-medium shrink-0">
                    ({mod.lessons.length} {mod.lessons.length === 1 ? 'Lesson' : 'Lessons'})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => addLesson(mod.id)}
                    className="text-xs font-semibold text-[#c62828] hover:underline cursor-pointer"
                  >
                    + Add Lesson
                  </button>
                  {modules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeModule(mod.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition cursor-pointer"
                      title="Delete Module"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Module Body: Lessons */}
              <div className="p-4 flex flex-col gap-4">
                {mod.lessons.map((lesson, lessonIdx) => (
                  <div
                    key={lesson.id}
                    className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-4"
                  >
                    {/* Lesson Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-3">
                      <div className="flex items-center gap-2.5 flex-1">
                        <span className="font-mono text-[11px] font-bold uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                          LESSON {lessonIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={lesson.title}
                          onChange={(e) => updateLesson(mod.id, lesson.id, { title: e.target.value })}
                          placeholder="Lesson Title (e.g. Safety Precautions & Tools)"
                          className="font-semibold text-sm text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white px-2 py-1 rounded border border-transparent focus:border-slate-300 focus:outline-none w-full max-w-md"
                        />
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Content Type Selector */}
                        <div className="inline-flex p-0.5 bg-slate-100 border border-slate-300 rounded-md text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() => updateLesson(mod.id, lesson.id, { type: 'single' })}
                            className={`px-2.5 py-1 rounded transition cursor-pointer ${
                              lesson.type === 'single'
                                ? 'bg-white text-[#c62828] shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Single Video
                          </button>
                          <button
                            type="button"
                            onClick={() => updateLesson(mod.id, lesson.id, { type: 'playlist' })}
                            className={`px-2.5 py-1 rounded transition cursor-pointer ${
                              lesson.type === 'playlist'
                                ? 'bg-white text-[#c62828] shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Multi-Part Video
                          </button>
                        </div>

                        {mod.lessons.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLesson(mod.id, lesson.id)}
                            className="p-1 text-slate-400 hover:text-red-600 transition cursor-pointer"
                            title="Delete Lesson"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Lesson Content Video Uploader */}
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

                    {/* In-Video Quizzes */}
                    <QuizBuilder
                      lesson={lesson}
                      onUpdate={(patch) => updateLesson(mod.id, lesson.id, patch)}
                    />

                    {/* Lesson Summary Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs text-slate-500">
                      <span className="font-mono text-slate-700 font-medium">
                        Lesson Duration: {formatSeconds(lesson.duration_seconds || 0)}
                      </span>
                      <span>
                        Type: {lesson.type === 'single' ? 'Single Video' : 'Multi-Part Sequential Video'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer Actions ── */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 pb-12">
        {onCancelEdit ? (
          <button
            type="button"
            onClick={onCancelEdit}
            className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setCourseTitle('');
              setDescription('');
              setSelectedCategoryId('');
              setThumbnailUrl(null);
              setModules([makeModule(1)]);
            }}
            className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
          >
            Reset Form
          </button>
        )}

        <button
          type="button"
          onClick={handlePublish}
          disabled={publishing}
          className="px-6 py-2.5 bg-[#c62828] hover:bg-[#a20513] text-white rounded-lg text-xs font-semibold transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
        >
          {publishing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{editingCourseId ? 'Updating Course…' : 'Publishing Course…'}</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{editingCourseId ? 'Update Course' : 'Publish Course'}</span>
            </>
          )}
        </button>
      </div>

      {/* ── Success Celebration Modal ── */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center flex flex-col items-center border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {editingCourseId ? 'Course Updated Successfully' : 'Course Published Successfully'}
            </h3>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              <strong>"{savedCourseTitle}"</strong> is now saved to the LMS repository and available to assigned departments.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowSuccessModal(false);
                if (onCancelEdit) onCancelEdit();
              }}
              className="w-full py-2.5 px-4 bg-[#c62828] hover:bg-[#a20513] text-white font-semibold rounded-lg text-xs transition cursor-pointer shadow-xs"
            >
              Return to Course Directory
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
