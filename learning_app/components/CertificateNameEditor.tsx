'use client';

import { useState } from 'react';
import { Edit3, Check, X, Loader2 } from 'lucide-react';

interface CertificateNameEditorProps {
  certificateId: string;
  initialName: string;
  userEmail: string;
}

export default function CertificateNameEditor({
  certificateId,
  initialName,
  userEmail,
}: CertificateNameEditorProps) {
  const [name, setName] = useState(initialName || userEmail.split('@')[0]);
  const [isEditing, setIsEditing] = useState(false);
  const [inputVal, setInputVal] = useState(name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!inputVal.trim()) {
      setError('Name cannot be blank');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/certificates/${certificateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_name: inputVal.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update name');

      setName(data.recipient_name);
      setIsEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error updating name');
    } finally {
      setSaving(false);
    }
  }

  if (isEditing) {
    return (
      <div className="my-3 max-w-md mx-auto print:hidden">
        <form onSubmit={handleSave} className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 w-full">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Enter full recipient name (e.g. Vivek Tamore)"
              autoFocus
              className="flex-1 px-4 py-2 text-base font-semibold text-gray-800 bg-white border-2 border-indigo-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
            />
            <button
              type="submit"
              disabled={saving}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center gap-1 transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Save</span>
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setInputVal(name);
                setIsEditing(false);
                setError(null);
              }}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl border border-gray-200 transition cursor-pointer"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
          <p className="text-[11px] text-gray-400">
            Enter the exact full name to print on this official certificate.
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="group relative inline-flex items-center justify-center gap-2 mb-1 flex-wrap">
      <p className="text-3xl font-extrabold text-indigo-800 tracking-tight capitalize">
        {name}
      </p>
      <button
        type="button"
        onClick={() => {
          setInputVal(name);
          setIsEditing(true);
        }}
        title="Edit recipient name for this certificate"
        className="print:hidden opacity-80 group-hover:opacity-100 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition inline-flex items-center gap-1 cursor-pointer shadow-2xs"
      >
        <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
        <span>Edit Name</span>
      </button>
    </div>
  );
}
