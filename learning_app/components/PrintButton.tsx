'use client';

import { useState } from 'react';
import { Printer, ArrowLeft, FileText, Check } from 'lucide-react';
import Link from 'next/link';

type PaperOption = {
  id: string;
  label: string;
  pageSize: string;
  margin: string;
  orientation: 'landscape' | 'portrait';
};

const PAPER_OPTIONS: PaperOption[] = [
  { id: 'a4-landscape', label: 'A4 Landscape (Recommended)', pageSize: 'A4 landscape', margin: '8mm', orientation: 'landscape' },
  { id: 'a4-portrait', label: 'A4 Portrait', pageSize: 'A4 portrait', margin: '12mm', orientation: 'portrait' },
  { id: 'letter-landscape', label: 'US Letter Landscape', pageSize: 'letter landscape', margin: '8mm', orientation: 'landscape' },
  { id: 'letter-portrait', label: 'US Letter Portrait', pageSize: 'letter portrait', margin: '12mm', orientation: 'portrait' },
];

export default function PrintButton() {
  const [selectedPaper, setSelectedPaper] = useState<string>('a4-landscape');
  const [showMenu, setShowMenu] = useState(false);

  const activeOption = PAPER_OPTIONS.find(p => p.id === selectedPaper) || PAPER_OPTIONS[0];

  return (
    <>
      {/* Dynamic Print & Screen Stylesheet */}
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: ${activeOption.pageSize};
          margin: ${activeOption.margin};
        }
        @media print {
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #certificate {
            box-shadow: none !important;
            border-width: 4px !important;
            border-color: #c7d2fe !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: ${activeOption.orientation === 'landscape' ? '28px 48px' : '40px 32px'} !important;
            page-break-inside: avoid !important;
          }
        }
      `}} />

      {/* Floating Toolbar */}
      <div className="fixed top-6 right-6 flex items-center gap-2.5 print:hidden z-50">
        <Link
          href="/dashboard"
          className="bg-white/95 backdrop-blur-sm text-gray-700 border border-gray-200 px-3.5 py-2 rounded-xl text-sm font-medium shadow-sm hover:bg-gray-50 transition-all flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>

        {/* Paper Size Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu(p => !p)}
            className="bg-white/95 backdrop-blur-sm text-gray-700 border border-gray-200 px-3 py-2 rounded-xl text-sm font-medium shadow-sm hover:bg-gray-50 transition-all flex items-center gap-1.5"
            title="Choose Paper Size & Orientation"
          >
            <FileText className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-semibold text-gray-800">
              {activeOption.label.split(' ')[0]} {activeOption.orientation === 'landscape' ? 'Landscape' : 'Portrait'}
            </span>
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                Paper Size & Orientation
              </div>
              <div className="space-y-1 mt-1">
                {PAPER_OPTIONS.map((opt) => {
                  const isSelected = opt.id === selectedPaper;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedPaper(opt.id);
                        setShowMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition ${
                        isSelected
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Print / Save PDF Button */}
        <button
          type="button"
          onClick={() => window.print()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print / PDF</span>
        </button>
      </div>
    </>
  );
}
