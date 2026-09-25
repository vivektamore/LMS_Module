'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Users, UserPlus, Search, Filter, RefreshCw, X, Check,
  Edit2, Trash2, MoreVertical, CheckCircle2, AlertTriangle,
  ArrowRight, ShieldCheck, Mail, Calendar, Clock, BookOpen,
  UserCheck, UserX, ExternalLink, KeyRound, ChevronLeft, ChevronRight
} from 'lucide-react';
import Link from 'next/link';

export interface UserEnrollmentInfo {
  courseId: string;
  courseTitle: string;
  courseCode: string;
  totalLessons: number;
  completedLessons: number;
  progressPct: number;
  status: 'Completed' | 'In Progress' | 'Not Started';
  enrolledAt: string;
  completedAt: string | null;
}

export interface UserItem {
  id: string;
  email: string;
  name: string;
  employeeId: string;
  role: 'admin' | 'employee' | 'student';
  department: string;
  createdAt: string;
  lastSignInAt: string | null;
  enrolledCount: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  enrollments: UserEnrollmentInfo[];
  isCurrentUser?: boolean;
}

interface UserManagerProps {
  initialUsers: UserItem[];
  currentUserId: string;
}

const ALL_DEPARTMENTS = [
  'MAINTENANCE', 'PRODUCTION', 'QUALITY', 'SAFETY',
  'HR', 'DESIGN', 'DEVELOPMENT', 'IT', 'AI',
  'CENTRAL_PROCESSING_ENGINEERING', 'STORE', 'DISPATCH'
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || 'EM';
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return 'Never signed in';
  try {
    const d = new Date(dateStr);
    const dateFormatted = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeFormatted = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${dateFormatted}, ${timeFormatted}`;
  } catch {
    return '—';
  }
}

export default function UserManager({ initialUsers, currentUserId }: UserManagerProps) {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(initialUsers[0] || null);
  const [showDrawer, setShowDrawer] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Add User Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addDept, setAddDept] = useState('MAINTENANCE');
  const [addEmployeeId, setAddEmployeeId] = useState('');
  const [addRole, setAddRole] = useState<'employee' | 'admin'>('employee');
  const [addPassword, setAddPassword] = useState('12345');
  const [isManualId, setIsManualId] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addError, setAddError] = useState('');

  // Edit User Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editRole, setEditRole] = useState<'employee' | 'admin'>('employee');
  const [editPassword, setEditPassword] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 4000);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // Client refresh
  async function refreshUsers() {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
        if (selectedUser) {
          const updated = data.users.find((u: UserItem) => u.id === selectedUser.id);
          if (updated) setSelectedUser(updated);
        }
      }
    } catch (err) {
      console.error('Failed to refresh users:', err);
    }
  }

  // Auto-generate employee ID when department changes in Add User modal
  useEffect(() => {
    if (showAddModal && !isManualId) {
      fetch(`/api/admin/users/next-id?department=${addDept}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.employee_id) setAddEmployeeId(data.employee_id);
        })
        .catch(() => {});
    }
  }, [addDept, showAddModal, isManualId]);

  // Filtered dataset
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = u.name.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        const matchId = u.employeeId.toLowerCase().includes(q);
        const matchDept = u.department.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchId && !matchDept) return false;
      }

      // Department
      if (deptFilter !== 'all' && u.department.toLowerCase() !== deptFilter.toLowerCase()) {
        return false;
      }

      // Role
      if (roleFilter !== 'all' && u.role.toLowerCase() !== roleFilter.toLowerCase()) {
        return false;
      }

      // Status
      if (statusFilter !== 'all') {
        const isActive = u.role !== 'student';
        if (statusFilter === 'active' && !isActive) return false;
        if (statusFilter === 'inactive' && isActive) return false;
      }

      return true;
    });
  }, [users, searchQuery, deptFilter, roleFilter, statusFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Add User Submission
  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!addEmail.trim()) {
      setAddError('Email address is required.');
      return;
    }

    setIsSubmittingAdd(true);
    setAddError('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: addEmail.trim(),
          name: addName.trim(),
          department: addDept,
          employee_id: addEmployeeId.trim(),
          role: addRole,
          password: addPassword.trim() || '12345',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add user');

      setToastMsg(`User ${addName || addEmail} created with ID ${data.employee_id || addEmployeeId}.`);
      setShowAddModal(false);
      setAddName('');
      setAddEmail('');
      setAddEmployeeId('');
      setIsManualId(false);
      refreshUsers();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Error adding user');
    } finally {
      setIsSubmittingAdd(false);
    }
  }

  // Edit User Submission
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;

    setIsSubmittingEdit(true);
    setEditError('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editUser.id,
          name: editName.trim(),
          email: editEmail.trim(),
          department: editDept,
          employee_id: editEmployeeId.trim(),
          role: editRole,
          password: editPassword.trim() ? editPassword.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');

      setToastMsg(`User ${editName || editEmail} updated successfully.`);
      setShowEditModal(false);
      refreshUsers();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Error updating user');
    } finally {
      setIsSubmittingEdit(false);
    }
  }

  // Delete User
  async function handleDeleteUser(user: UserItem) {
    if (user.id === currentUserId) {
      alert('You cannot delete your own active admin account.');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete user "${user.name}" (${user.email})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users?id=${user.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete user');

      setToastMsg(`User ${user.name} removed successfully.`);
      if (selectedUser?.id === user.id) {
        setSelectedUser(null);
      }
      refreshUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting user');
    }
  }

  // Open Edit Modal
  function openEditModal(user: UserItem) {
    setEditUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditDept(user.department);
    setEditEmployeeId(user.employeeId);
    setEditRole(user.role === 'admin' ? 'admin' : 'employee');
    setEditPassword('');
    setEditError('');
    setShowEditModal(true);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto flex flex-col gap-6 font-sans text-slate-900">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium">{toastMsg}</span>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-slate-400 hover:text-white ml-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            User Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, edit and manage shop-floor employees and LMS access.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-white rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 shadow-xs">
            <Users className="w-4 h-4 text-slate-500" />
            <span>Total Users:</span>
            <span className="font-mono text-[#c62828] font-bold text-sm">
              {users.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setAddName('');
              setAddEmail('');
              setAddDept('MAINTENANCE');
              setAddPassword('12345');
              setAddError('');
              setIsManualId(false);
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#c62828] hover:bg-[#a20513] text-white rounded-lg transition-colors text-xs font-semibold shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add User</span>
          </button>
        </div>
      </div>

      {/* Main Layout Grid (Table + Flyout Drawer) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Filter Bar + Table */}
        <div className={`${showDrawer && selectedUser ? 'xl:col-span-8' : 'xl:col-span-12'} flex flex-col gap-4 transition-all duration-200`}>
          {/* Search & Filter Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search employee, employee ID or email..."
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#c62828] focus:bg-white"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <select
                value={deptFilter}
                onChange={(e) => {
                  setDeptFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-3 rounded-lg bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium focus:outline-none focus:border-[#c62828] cursor-pointer"
              >
                <option value="all">All Departments</option>
                {ALL_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-3 rounded-lg bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium focus:outline-none focus:border-[#c62828] cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="employee">Learner / Employee</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-3 rounded-lg bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium focus:outline-none focus:border-[#c62828] cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setDeptFilter('all');
                  setRoleFilter('all');
                  setStatusFilter('all');
                  setCurrentPage(1);
                }}
                className="h-9 px-3 bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Clear Filters"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* User Table Container */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[620px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3 text-center">Enrolled</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 hidden sm:table-cell">Joined</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        <p className="text-sm font-semibold text-slate-600">No employees match your filters</p>
                        <p className="text-xs text-slate-400 mt-1">Try clearing your search query or selecting &quot;All Departments&quot;.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user) => {
                      const isSelected = selectedUser?.id === user.id && showDrawer;
                      const isCurrentUser = user.id === currentUserId;
                      const initials = getInitials(user.name);

                      return (
                        <tr
                          key={user.id}
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDrawer(true);
                          }}
                          className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-red-50/40 border-l-4 border-[#c62828]'
                              : ''
                          }`}
                        >
                          {/* Employee (Avatar, Name, ID) */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                                  isCurrentUser
                                    ? 'bg-[#c62828] text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}
                              >
                                {initials}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-slate-900 truncate">
                                    {user.name}
                                  </span>
                                  {isCurrentUser && (
                                    <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono text-[9px] uppercase font-bold tracking-tight">
                                      YOU
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] font-mono text-slate-500 font-medium">
                                  {user.employeeId}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Department */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {user.department}
                            </span>
                          </td>

                          {/* Role */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {user.role === 'admin' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEE2E2] text-[#c62828] border border-red-200 uppercase tracking-wider font-mono">
                                ADMIN
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider font-mono">
                                LEARNER
                              </span>
                            )}
                          </td>

                          {/* Enrolled Courses */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] font-semibold text-slate-700">
                              {user.enrolledCount} {user.enrolledCount === 1 ? 'Course' : 'Courses'}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#DCFCE7] border border-emerald-200 text-[#166534] text-[11px] font-semibold uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Active
                            </span>
                          </td>

                          {/* Joined */}
                          <td className="py-3 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap hidden sm:table-cell">
                            {formatDate(user.createdAt)}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => openEditModal(user)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Edit User"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {!isCurrentUser && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(user)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500 font-mono">
                Showing {filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} employees
              </span>

              <div className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="w-8 h-8 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCurrentPage(num)}
                    className={`w-8 h-8 rounded border text-xs font-mono font-semibold transition cursor-pointer ${
                      currentPage === num
                        ? 'border-[#c62828] bg-[#c62828] text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {num}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="w-8 h-8 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Persistent Profile Flyout Drawer */}
        {showDrawer && selectedUser && (
          <div className="xl:col-span-4 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-2">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-[#c62828]" />
                <span>Employee Profile &amp; Access</span>
              </div>
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="w-7 h-7 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Close Inspector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-4 flex flex-col gap-4">
              {/* Profile Identity Block */}
              <div className="flex items-start gap-3 pb-4 border-b border-slate-200">
                <div className="w-12 h-12 rounded-full bg-[#c62828] text-white font-bold text-base flex items-center justify-center shrink-0 shadow-xs">
                  {getInitials(selectedUser.name)}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 truncate">
                      {selectedUser.name}
                    </h2>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase font-mono">
                      {selectedUser.role}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-slate-500 font-semibold mt-0.5">
                    {selectedUser.employeeId}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <span className="text-[11px] text-emerald-700 uppercase font-bold">
                      Active Employee
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {selectedUser.department}
                    </span>
                  </div>
                </div>
              </div>

              {/* Account Information Card */}
              <div className="flex flex-col gap-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-200/80">
                  <span className="text-slate-500">Registered Email:</span>
                  <span className="font-mono text-slate-800 font-semibold select-all">
                    {selectedUser.email}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-200/80">
                  <span className="text-slate-500">Joined:</span>
                  <span className="font-mono text-slate-800">
                    {formatDate(selectedUser.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500">Last Login:</span>
                  <span className="font-mono text-slate-800 font-medium">
                    {formatDateTime(selectedUser.lastSignInAt)}
                  </span>
                </div>
              </div>

              {/* Learning Summary: Enrollment Overview */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">
                    Enrollment Overview
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-900">
                    {selectedUser.enrolledCount} Enrolled
                  </span>
                </div>

                {/* 3 KPI Blocks */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-emerald-50/50 border border-emerald-200">
                    <span className="block text-lg font-bold text-emerald-700 font-mono">
                      {selectedUser.completedCount}
                    </span>
                    <span className="text-[10px] text-emerald-800 uppercase font-semibold">
                      Completed
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-50/50 border border-blue-200">
                    <span className="block text-lg font-bold text-blue-700 font-mono">
                      {selectedUser.inProgressCount}
                    </span>
                    <span className="text-[10px] text-blue-800 uppercase font-semibold">
                      In Progress
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="block text-lg font-bold text-slate-600 font-mono">
                      {selectedUser.notStartedCount}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">
                      Not Started
                    </span>
                  </div>
                </div>

                {/* Course Summary Cards */}
                <div className="flex flex-col gap-2 mt-1 max-h-56 overflow-y-auto">
                  {selectedUser.enrollments.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded border border-dashed border-slate-200">
                      No training courses assigned yet.
                    </p>
                  ) : (
                    selectedUser.enrollments.map((crs) => (
                      <div
                        key={crs.courseId}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-900 leading-tight">
                            {crs.courseTitle}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase font-mono shrink-0 ${
                              crs.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {crs.status}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded overflow-hidden">
                          <div
                            className={`h-full rounded transition-all duration-300 ${
                              crs.status === 'Completed' ? 'bg-emerald-600' : 'bg-blue-600'
                            }`}
                            style={{ width: `${crs.progressPct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>Progress: {crs.progressPct}%</span>
                          <span>
                            {crs.completedLessons} / {crs.totalLessons} Lessons
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Link to Enrollments */}
                <Link
                  href="/admin/enrollments"
                  className="mt-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-50 text-[#c62828] text-xs font-semibold border border-slate-200 rounded-lg transition-colors text-center"
                >
                  <span>View Full Records in Enrollments</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Drawer Footer Action Bar */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2 mt-auto">
              <button
                type="button"
                onClick={() => openEditModal(selectedUser)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit Details</span>
              </button>

              {selectedUser.id !== currentUserId && (
                <button
                  type="button"
                  onClick={() => handleDeleteUser(selectedUser)}
                  className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-white hover:bg-red-50 text-red-700 text-xs font-semibold border border-red-200 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add New User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <UserPlus className="w-5 h-5 text-[#c62828]" />
                <span>Add New User</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddSubmit} className="p-5 flex flex-col gap-4">
              {/* Field 1: Name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-900">
                  Employee Name <span className="text-[#c62828]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Rohan Deshmukh"
                  className="h-9 px-3 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-[#c62828]"
                />
              </div>

              {/* Field 2 & 3: Department & Auto Employee ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-900">
                    Department <span className="text-[#c62828]">*</span>
                  </label>
                  <select
                    value={addDept}
                    onChange={(e) => {
                      setAddDept(e.target.value);
                      setIsManualId(false);
                    }}
                    className="h-9 px-3 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-[#c62828] cursor-pointer"
                  >
                    {ALL_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-900">
                      Employee ID <span className="text-[#c62828]">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        fetch(`/api/admin/users/next-id?department=${addDept}`)
                          .then((r) => r.json())
                          .then((d) => {
                            if (d.employee_id) setAddEmployeeId(d.employee_id);
                            setIsManualId(false);
                          });
                      }}
                      className="text-[10px] text-[#c62828] hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                      title="Auto-generate next ID for this department"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>Auto</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={addEmployeeId}
                    onChange={(e) => {
                      setAddEmployeeId(e.target.value.toUpperCase());
                      setIsManualId(true);
                    }}
                    placeholder="e.g. JC-MNT-003"
                    className="h-9 px-3 rounded-lg bg-white border border-slate-300 text-slate-900 font-mono text-xs uppercase focus:outline-none focus:border-[#c62828]"
                  />
                </div>
              </div>

              {/* Field 4: Email */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-900">
                  Email Address <span className="text-[#c62828]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="e.g. rohan.deshmukh@jollyclamps.com"
                  className="h-9 px-3 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-[#c62828]"
                />
              </div>

              {/* Field 5: Role & PIN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-900">
                    Role
                  </label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as 'employee' | 'admin')}
                    className="h-9 px-3 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-[#c62828] cursor-pointer"
                  >
                    <option value="employee">Learner (Employee)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-900">
                    Initial Password / PIN
                  </label>
                  <input
                    type="text"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    placeholder="12345"
                    className="h-9 px-3 rounded-lg bg-white border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-[#c62828]"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Default PIN is <span className="font-mono font-semibold text-slate-700">12345</span>. The employee can sign in immediately using this PIN.
              </p>

              {addError && (
                <p className="text-xs text-red-600 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{addError}</span>
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#c62828] hover:bg-[#a20513] rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmittingAdd ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating…</span>
                    </>
                  ) : (
                    <span>Save &amp; Create User</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Edit2 className="w-4 h-4 text-[#c62828]" />
                <span>Edit User Details</span>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-7 h-7 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-900">
                  Employee Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-9 px-3 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-[#c62828]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-900">
                    Department
                  </label>
                  <select
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                    className="h-9 px-3 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-[#c62828] cursor-pointer"
                  >
                    {ALL_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-900">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    required
                    value={editEmployeeId}
                    onChange={(e) => setEditEmployeeId(e.target.value.toUpperCase())}
                    className="h-9 px-3 rounded-lg bg-white border border-slate-300 text-slate-900 font-mono text-xs uppercase focus:outline-none focus:border-[#c62828]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-900">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="h-9 px-3 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-[#c62828]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-900">
                    Role
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as 'employee' | 'admin')}
                    className="h-9 px-3 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-[#c62828] cursor-pointer"
                  >
                    <option value="employee">Learner (Employee)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-900">
                    Reset Password (optional)
                  </label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    className="h-9 px-3 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-[#c62828]"
                  />
                </div>
              </div>

              {editError && (
                <p className="text-xs text-red-600 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{editError}</span>
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#c62828] hover:bg-[#a20513] rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmittingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
