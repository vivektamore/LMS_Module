'use client';

import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PrintButton() {
  return (
    <div className="fixed top-6 right-6 flex items-center gap-3 print:hidden z-50">
      <Link
        href="/dashboard"
        className="bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>
      <button
        type="button"
        onClick={() => window.print()}
        className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 cursor-pointer"
      >
        <Printer className="w-4 h-4" /> Print / Save PDF
      </button>
    </div>
  );
}
