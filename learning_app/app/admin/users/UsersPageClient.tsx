'use client';

import { useState } from 'react';
import { Users, Mail, ShieldCheck, Plus, X, Loader2, Trash2, Building2, Pencil } from 'lucide-react';

const DEPARTMENTS = [
  'HR','SAFETY','MAINTENANCE','PRODUCTION','QUALITY',
  'DESIGN','DEVELOPMENT','IT','AI',
  'CENTRAL_PROCESSING_ENGINEERING','STORE','DISPATCH'
];

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

type UserRow = {
  id: string;
  email: string;
  role: string;
  department: string | null;
  created_at: string;
  enrolledCourses: string[];
};

type CreateForm = { email: string; password: string; role: string; department: string };
type EditForm   = { id: string; email: string; role: string; department: string; password: string };

async function refreshUsers(): Promise<UserRow[]> {
  const res = await fetch('/api/admin/users');
  const data = await res.json();
  return (data.users || []).map((u: any) => ({
    ...u,
    enrolledCourses: u.course_titles ? u.course_titles.split('|||') : [],
  }));
}

export default function UsersPageClient({
  initialUsers,
  currentUserId,
}: {
  initialUsers: UserRow[];
  currentUserId: string;
}) {
  const [users, setUsers]           = useState<UserRow[]>(initialUsers);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>({ email: '', password: '', role: 'employee', department: '' });
  const [creating, setCreating]     = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit modal
  const [showEdit, setShowEdit]     = useState(false);
  const [editForm, setEditForm]     = useState<EditForm>({ id: '', email: '', role: 'employee', department: '', password: '' });
  const [saving, setSaving]         = useState(false);
  const [editError, setEditError]   = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Create ─────────────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      setUsers(await refreshUsers());
      setShowCreate(false);
      setCreateForm({ email: '', password: '', role: 'employee', department: '' });
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  // ── Edit ───────────────────────────────────────────────────────────────────
  function openEdit(user: UserRow) {
    setEditForm({ id: user.id, email: user.email, role: user.role, department: user.department || '', password: '' });
    setEditError(null);
    setShowEdit(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setEditError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');
      setUsers(await refreshUsers());
      setShowEdit(false);
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  // ── Shared form field helpers ───────────────────────────────────────────────
  function ModalInput({ label, type = 'text', value, onChange, placeholder, required = false, minLength }: {
    label: string; type?: string; value: string;
    onChange: (v: string) => void; placeholder?: string;
    required?: boolean; minLength?: number;
  }) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
        <input
          type={type} required={required} minLength={minLength}
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    );
  }

  function RoleSelect({ value, onChange, allowAdmin = false }: { value: string; onChange: (v: string) => void; allowAdmin?: boolean }) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="employee">Employee</option>
          {allowAdmin && <option value="admin">Admin</option>}
        </select>
        {!allowAdmin && (
          <p className="text-xs text-gray-400 mt-1">Admin accounts are created by developers only.</p>
        )}
      </div>
    );
  }

  function DeptSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">-- No Department --</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{DEPT_LABELS[d]}</option>)}
        </select>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-8">

      {/* Page Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
          <p className="text-gray-500 mt-1">Create, edit and manage employees, departments and access.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-medium text-sm">
            <Users className="w-4 h-4" />
            <span>Total: {users.length}</span>
          </div>
          <button
            onClick={() => { setCreateError(null); setShowCreate(true); }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
              <th className="p-4 font-medium">User Email</th>
              <th className="p-4 font-medium">Role</th>
              <th className="p-4 font-medium">Department</th>
              <th className="p-4 font-medium">Enrolled Courses</th>
              <th className="p-4 font-medium">Joined</th>
              <th className="p-4 font-medium text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  No users yet. Click "Add User" to create one.
                </td>
              </tr>
            )}
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                    {user.email}
                    {user.id === currentUserId && (
                      <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-semibold">You</span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-700'
                      : user.role === 'employee' ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {user.role === 'admin' && <ShieldCheck className="w-3 h-3 mr-1" />}
                    {user.role.toUpperCase()}
                  </span>
                </td>
                <td className="p-4 text-sm">
                  {user.department ? (
                    <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                      <Building2 className="w-3 h-3" />{DEPT_LABELS[user.department] || user.department}
                    </span>
                  ) : (
                    <span className="text-gray-400 italic text-xs">No dept.</span>
                  )}
                </td>
                <td className="p-4 text-sm text-gray-600">
                  {user.enrolledCourses.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {user.enrolledCourses.map((cName, idx) => (
                        <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">{cName}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">None</span>
                  )}
                </td>
                <td className="p-4 text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString('en-GB', {
                    year: 'numeric', month: 'short', day: 'numeric',
                  })}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-center gap-2">
                    {/* Edit button — always visible */}
                    <button
                      onClick={() => openEdit(user)}
                      className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit user"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Delete button — hidden for own account */}
                    {user.id === currentUserId ? (
                      <span className="w-7" />
                    ) : (
                      <button
                        onClick={() => handleDelete(user.id)}
                        disabled={deletingId === user.id}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete user"
                      >
                        {deletingId === user.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Create User Modal ──────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 m-4">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Create New User</h2>
                <p className="text-sm text-gray-500 mt-0.5">Add an employee or admin account</p>
              </div>
              <button onClick={() => setShowCreate(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-100">⚠️ {createError}</div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <ModalInput label="Email Address" type="email" required value={createForm.email}
                onChange={v => setCreateForm(f => ({ ...f, email: v }))} placeholder="employee@company.com" />
              <ModalInput label="Password" type="password" required minLength={6} value={createForm.password}
                onChange={v => setCreateForm(f => ({ ...f, password: v }))} placeholder="Min. 6 characters" />
              <RoleSelect value={createForm.role} onChange={v => setCreateForm(f => ({ ...f, role: v }))} />
              <DeptSelect value={createForm.department} onChange={v => setCreateForm(f => ({ ...f, department: v }))} />

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 flex justify-center items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-70">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ────────────────────────────────────────────────── */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 m-4">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Edit User</h2>
                <p className="text-sm text-gray-500 mt-0.5 truncate max-w-xs">{editForm.email}</p>
              </div>
              <button onClick={() => setShowEdit(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-100">⚠️ {editError}</div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <ModalInput label="Email Address" type="email" required value={editForm.email}
                onChange={v => setEditForm(f => ({ ...f, email: v }))} />
              <RoleSelect value={editForm.role} onChange={v => setEditForm(f => ({ ...f, role: v }))} />
              <DeptSelect value={editForm.department} onChange={v => setEditForm(f => ({ ...f, department: v }))} />

              {/* Optional password reset */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span>
                </label>
                <input
                  type="password" minLength={6} value={editForm.password}
                  onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Leave blank to keep existing"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEdit(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 flex justify-center items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-70">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
