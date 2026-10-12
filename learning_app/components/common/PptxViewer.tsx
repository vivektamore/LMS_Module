"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, AlertCircle, Download, ExternalLink, Check, FileText } from 'lucide-react';
import '@extend-ai/react-pptx/styles.css';

// Dynamically import ReactPptxViewer to ensure it runs only in client-side environment
const DynamicViewer = dynamic(
  async () => {
    const mod = await import('@extend-ai/react-pptx');
    if (typeof mod.setWasmSource === 'function') {
      try {
        mod.setWasmSource('/pptx_wasm_bg.wasm');
      } catch {
        // Ignored if already initialized
      }
    }
    return mod.ReactPptxViewer;
  },
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white gap-3 p-6">
        <Loader2 className="w-8 h-8 animate-spin text-[#c62828]" />
        <span className="text-xs font-mono text-slate-300">Initializing PowerPoint slide engine...</span>
      </div>
    ),
  }
);

interface PptxViewerProps {
  url: string;
  title: string;
  isCompleted?: boolean;
  onMarkComplete?: () => void;
}

export default function PptxViewer({ url, title, isCompleted, onMarkComplete }: PptxViewerProps) {
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'inline' | 'cloud'>('inline');
  const [cloudService, setCloudService] = useState<'office' | 'google'>('office');

  useEffect(() => {
    let isCancelled = false;
    async function loadFile() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to load file from storage (HTTP ${res.status})`);
        }
        const buffer = await res.arrayBuffer();
        if (!isCancelled) {
          setFileBuffer(buffer);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch PowerPoint file.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    if (url) {
      loadFile();
    }

    return () => {
      isCancelled = true;
    };
  }, [url]);

  const fullUrl = typeof window !== 'undefined' ? new URL(url, window.location.href).href : url;
  const officeEmbedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`;
  const googleEmbedUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fullUrl)}&embedded=true`;

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-white select-none overflow-hidden relative">
      {/* ── Slide Viewer Surface ────────────────────────────────────── */}
      <div className="flex-1 w-full h-full min-h-0 relative bg-slate-900 overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-slate-950">
            <Loader2 className="w-8 h-8 animate-spin text-[#c62828]" />
            <span className="text-xs font-semibold text-slate-200">Loading PowerPoint presentation...</span>
            <span className="text-[11px] text-slate-400 font-mono">Parsing slide elements &amp; graphics</span>
          </div>
        ) : error || !fileBuffer ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-3 shadow-lg">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">Slide Preview Notice</h4>
            <p className="text-xs text-slate-300 max-w-md mb-4 leading-relaxed">
              {error || 'Unable to render presentation in native browser mode.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('cloud')}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                <span>Try Office Web Viewer</span>
              </button>
            </div>
          </div>
        ) : viewMode === 'cloud' ? (
          <div className="w-full h-full flex flex-col">
            <iframe
              src={cloudService === 'office' ? officeEmbedUrl : googleEmbedUrl}
              className="w-full flex-1 border-0 bg-white"
              title={title}
            />
          </div>
        ) : (
          <div className="w-full h-full flex flex-col overflow-hidden pptx-canvas-container">
            <DynamicViewer
              source={fileBuffer}
              mode="continuous"
              defaultZoom="fit-width"
              showToolbar={true}
              showThumbnails={true}
              className="w-full h-full"
            />
          </div>
        )}
      </div>

      {/* ── Industrial Action & Completion Bar ──────────────────────── */}
      <div className="bg-slate-950/95 border-t border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="font-semibold text-slate-200 truncate max-w-xs">{title}</span>
          <span className="text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded">
            PPTX SLIDES
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline mr-1">
            🔒 View Only Mode
          </span>

          {!isCompleted && onMarkComplete ? (
            <button
              type="button"
              onClick={onMarkComplete}
              className="px-3.5 py-1.5 rounded-lg bg-[#c62828] hover:bg-[#a20513] text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark Lesson Completed</span>
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-xs flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              <span>Completed</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
