"use client";

import { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  count?: number;
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
    if (!newName.trim() || !newSlug.trim()) {
      setFormError('Name and slug are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), slug: newSlug.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create category');
      setCategories((prev) => [...prev, json.category]);
      setNewName(''); setNewSlug(''); setShowForm(false);
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
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 w-full mb-10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mr-4">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Category Management</h2>
            <p className="text-sm text-gray-500">Add, or remove major learning categories</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Category
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg space-y-3">
          <h3 className="text-sm font-semibold text-indigo-800">Add New Category</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 font-medium mb-1 block">Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Hydraulics"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 font-medium mb-1 block">Slug</label>
              <input
                type="text"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder="e.g. hydraulics"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          {formError && (
            <div className="flex items-center gap-2 text-red-600 text-xs">
              <AlertCircle className="w-3.5 h-3.5" /> {formError}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition disabled:opacity-60 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Category
            </button>
            <button
              onClick={() => { setShowForm(false); setFormError(''); }}
              className="px-4 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading categories…
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-600 py-6 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        ) : categories.length === 0 ? (
          <p className="text-center text-gray-400 py-10 text-sm">No categories yet. Add your first one above.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-y border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                <th className="p-4 font-semibold">Category Name</th>
                <th className="p-4 font-semibold">Slug</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="p-4">
                    <span className="font-semibold text-gray-900">{cat.name}</span>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-mono rounded">
                      {cat.slug}
                    </span>
                  </td>
                  <td className="p-4 flex items-center justify-end">
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
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
