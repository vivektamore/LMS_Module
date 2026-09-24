"use client";

import { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Loader2, AlertCircle, Layers, Check } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  count?: number;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')     // remove special chars
    .replace(/[\s_-]+/g, '-')     // replace spaces, underscores, multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '');     // remove leading/trailing hyphens
}

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New category form
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/categories');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load categories');
      setCategories(json.categories ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    const finalSlug = slugify(newSlug.trim() || newName.trim());
    if (!newName.trim() || !finalSlug) {
      setFormError('Category name and slug are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), slug: finalSlug }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create category');
      setCategories((prev) => [...prev, json.category]);
      setNewName('');
      setNewSlug('');
      setShowForm(false);
      // Notify CourseBuilder to refresh its dropdown
      window.dispatchEvent(new Event('category-saved'));
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this category? All linked courses will also be removed.')) return;
    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setCategories((prev) => prev.filter((c) => c.id !== id));
      window.dispatchEvent(new Event('category-saved'));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 w-full overflow-hidden shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-50 text-[#c62828] flex items-center justify-center border border-red-200">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Course Categories</h2>
            <p className="text-xs text-slate-500">Create, organize, or remove technical training categories</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#c62828] hover:bg-[#a20513] text-white rounded-lg transition text-xs font-semibold shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Category</span>
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-5 p-4 bg-slate-50 border border-slate-300 rounded-lg space-y-3 animate-in fade-in">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Add New Category</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-700 font-semibold mb-1 block">Category Name <span className="text-[#c62828]">*</span></label>
              <input
                type="text"
                value={newName}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewName(val);
                  setNewSlug(slugify(val));
                }}
                placeholder="e.g. Machine Maintenance"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#c62828]"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-700 font-semibold block">Category Slug <span className="text-[#c62828]">*</span></label>
                <span className="text-[10px] text-slate-400 font-normal">Auto-generated</span>
              </div>
              <input
                type="text"
                value={newSlug}
                onChange={(e) => setNewSlug(slugify(e.target.value))}
                placeholder="e.g. machine-maintenance"
                className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#c62828]"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Slug is required for category identification (e.g. <span className="font-mono text-slate-700 font-medium">machine-maintenance</span>).
          </p>
          {formError && (
            <div className="flex items-center gap-2 text-red-600 text-xs">
              <AlertCircle className="w-3.5 h-3.5" /> {formError}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => { setShowForm(false); setFormError(''); }}
              className="px-3.5 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="px-4 py-1.5 bg-[#c62828] hover:bg-[#a20513] text-white text-xs font-semibold rounded-lg transition disabled:opacity-60 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Category</span>
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-400 text-xs">
            <Loader2 className="w-4 h-4 animate-spin mr-2 text-[#c62828]" /> Loading categories…
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-600 py-4 text-xs font-medium">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        ) : categories.length === 0 ? (
          <p className="text-center text-slate-400 py-8 text-xs">No categories found. Click &quot;New Category&quot; to create one.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3">Category Name</th>
                <th className="py-2.5 px-3">Slug</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {cat.name}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-mono rounded text-[11px]">
                      {cat.slug}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
