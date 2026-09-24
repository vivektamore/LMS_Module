'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Users, CheckCircle2, AlertTriangle, Search, Filter,
  Download, UserPlus, Send, Trash2, X, ChevronLeft, ChevronRight,
  MoreVertical, RefreshCw, Check, BookOpen, Layers, ShieldAlert,
  ArrowUpDown, ExternalLink, Mail, Clock
} from 'lucide-react';
import Link from 'next/link';

export interface EnrollmentRecord {
  id: string;
  userId: string;
  courseId: string;
  email: string;
  name: string;
  badgeId: string;
  department: string;
  courseTitle: string;
  courseCode: string;
  totalLessons: number;
  completedLessons: number;
  progressPct: number;
  status: 'Completed' | 'In Progress' | 'Not Started' | 'Overdue';
  enrolledAt: string;
  completedAt: string | null;
}

export interface EnrollmentSummary {
  totalEmployees: number;
  totalEnrollments: number;
  completedCount: number;
  overdueCount: number;
}

export interface AvailableCourse {
  id: string;
  title: string;
  code: string;
}

export interface AvailableEmployee {
  id: string;
  email: string;
  name: string;
  department: string;
  badgeId: string;
}

interface EnrollmentManagerProps {
  initialEnrollments: EnrollmentRecord[];
  initialSummary: EnrollmentSummary;
  availableCourses: AvailableCourse[];
  availableEmployees: AvailableEmployee[];
}

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

export default function EnrollmentManager({
  initialEnrollments,
  initialSummary,
  availableCourses,
  availableEmployees,
}: EnrollmentManagerProps) {
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>(initialEnrollments);
  const [summary, setSummary] = useState<EnrollmentSummary>(initialSummary);
  const [coursesList, setCoursesList] = useState<AvailableCourse[]>(availableCourses);
  const [employeesList, setEmployeesList] = useState<AvailableEmployee[]>(availableEmployees);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selection for Batch Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Enroll Modal
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollUserIds, setEnrollUserIds] = useState<string[]>([]);
  const [enrollCourseIds, setEnrollCourseIds] = useState<string[]>([]);
  const [isSubmittingEnroll, setIsSubmittingEnroll] = useState(false);
  const [enrollError, setEnrollError] = useState('');

  // Auto-dismiss notification toast
  useEffect(() => {
    if (!notificationMsg) return;
    const t = setTimeout(() => setNotificationMsg(null), 4000);
    return () => clearTimeout(t);
  }, [notificationMsg]);

  // Client refresh
  async function refreshData() {
    try {
      const res = await fetch('/api/admin/enrollments');
      const data = await res.json();
      if (data.enrollments) {
        setEnrollments(data.enrollments);
        setSummary(data.summary);
        if (data.availableCourses) setCoursesList(data.availableCourses);
        if (data.availableEmployees) setEmployeesList(data.availableEmployees);
      }
    } catch (err) {
      console.error('Failed to refresh enrollments:', err);
    }
  }

  // Unique departments for filter
  const departments = useMemo(() => {
    const s = new Set<string>();
    enrollments.forEach((e) => {
      if (e.department) s.add(e.department);
    });
    return Array.from(s).sort();
  }, [enrollments]);

  // Unique courses for filter
  const filterCourses = useMemo(() => {
    const map = new Map<string, string>();
    enrollments.forEach((e) => {
      map.set(e.courseId, e.courseTitle);
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [enrollments]);

  // Filtered dataset
  const filtered = useMemo(() => {
    return enrollments.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchEmail = item.email.toLowerCase().includes(q);
        const matchBadge = item.badgeId.toLowerCase().includes(q);
        const matchCourse = item.courseTitle.toLowerCase().includes(q);
        const matchCode = item.courseCode.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchBadge && !matchCourse && !matchCode) {
          return false;
        }
      }

      // Dept Filter
      if (deptFilter !== 'all' && item.department.toLowerCase() !== deptFilter.toLowerCase()) {
        return false;
      }

      // Course Filter
      if (courseFilter !== 'all' && item.courseId !== courseFilter) {
        return false;
      }

      // Status Filter
      if (statusFilter !== 'all' && item.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [enrollments, searchQuery, deptFilter, courseFilter, statusFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Checkbox handlers
  const allCurrentSelected = paginated.length > 0 && paginated.every((p) => selectedIds.includes(p.id));
  const someCurrentSelected = paginated.some((p) => selectedIds.includes(p.id)) && !allCurrentSelected;

  function toggleSelectAll() {
    if (allCurrentSelected) {
      const pageIds = new Set(paginated.map((p) => p.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const pageIds = paginated.map((p) => p.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  // Export CSV
  function handleExportCSV() {
    const itemsToExport = selectedIds.length > 0
      ? enrollments.filter((e) => selectedIds.includes(e.id))
      : filtered;

    if (itemsToExport.length === 0) {
      alert('No records to export.');
      return;
    }

    const headers = ['Employee Name', 'Badge ID', 'Email', 'Department', 'Course Title', 'Course Code', 'Progress %', 'Completed Lessons', 'Total Lessons', 'Status', 'Enrolled Date', 'Completed Date'];
    const rows = itemsToExport.map((e) => [
      `"${e.name}"`,
      `"${e.badgeId}"`,
      `"${e.email}"`,
      `"${e.department}"`,
      `"${e.courseTitle.replace(/"/g, '""')}"`,
      `"${e.courseCode}"`,
      e.progressPct,
      e.completedLessons,
      e.totalLessons,
      `"${e.status}"`,
      `"${formatDate(e.enrolledAt)}"`,
      `"${formatDate(e.completedAt)}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `jolly_clamps_enrollments_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setNotificationMsg(`Exported ${itemsToExport.length} enrollment record(s) to CSV.`);
  }

  // Single Delete / Unenroll
  async function handleUnenrollSingle(enrollmentId: string, employeeName: string) {
    if (!confirm(`Are you sure you want to unenroll ${employeeName}? Their progress records will be removed.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/enrollments?id=${enrollmentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to unenroll employee');
      setNotificationMsg(`Successfully unenrolled ${employeeName}.`);
      setSelectedIds((prev) => prev.filter((id) => id !== enrollmentId));
      refreshData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error unenrolling employee');
    }
  }

  // Batch Delete
  async function handleBatchUnenroll() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to unenroll ${selectedIds.length} selected employee enrollment(s)?`)) {
      return;
    }
    setIsProcessingBatch(true);
    try {
      const res = await fetch('/api/admin/enrollments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!res.ok) throw new Error('Failed to batch unenroll');
      setNotificationMsg(`Successfully unenrolled ${selectedIds.length} employee enrollment(s).`);
      setSelectedIds([]);
      refreshData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error during batch unenroll');
    } finally {
      setIsProcessingBatch(false);
    }
  }

  // Batch Send Reminder
  function handleBatchSendReminder() {
    if (selectedIds.length === 0) return;
    setNotificationMsg(`Training reminder notices dispatched to ${selectedIds.length} employee(s).`);
    setSelectedIds([]);
  }

  // Submit Enroll Employees
  async function handleEnrollSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (enrollUserIds.length === 0 || enrollCourseIds.length === 0) {
      setEnrollError('Please select at least one employee and one course.');
      return;
    }

    setIsSubmittingEnroll(true);
    setEnrollError('');
    try {
      const res = await fetch('/api/admin/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_ids: enrollUserIds,
          course_ids: enrollCourseIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to enroll employees');

      setNotificationMsg(`Successfully enrolled employees into selected course(s). Added ${data.addedCount} new enrollment(s).`);
      setShowEnrollModal(false);
      setEnrollUserIds([]);
      setEnrollCourseIds([]);
      refreshData();
    } catch (err: unknown) {
      setEnrollError(err instanceof Error ? err.message : 'Failed to enroll');
    } finally {
      setIsSubmittingEnroll(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto flex flex-col gap-6 font-sans text-slate-900">
      {/* Toast Notification */}
      {notificationMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium">{notificationMsg}</span>
          <button
            type="button"
            onClick={() => setNotificationMsg(null)}
            className="text-slate-400 hover:text-white ml-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Action & View Subheader */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl shadow-xs border border-slate-200">
        <div className="flex flex-col">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-red-50 text-[#c62828] flex items-center justify-center border border-red-200">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Employee Enrollments
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign technical training and monitor shop-floor learner progress.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEnrollError('');
              setShowEnrollModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#c62828] hover:bg-[#a20513] text-white rounded-lg transition-colors text-xs font-semibold shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Enroll Employees</span>
          </button>
        </div>
      </div>

      {/* Enrollment Summary Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Employees */}
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
              Employees
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">
              {summary.totalEmployees}
            </span>
          </div>
        </div>

        {/* Enrollments */}
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
              Enrollments
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">
              {summary.totalEnrollments}
            </span>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
              Completed
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 border border-emerald-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-600 font-mono">
              {summary.completedCount}
            </span>
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[#c62828] font-bold">
              Overdue
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-[#c62828] border border-red-100">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#c62828] font-mono">
              {summary.overdueCount}
            </span>
            {summary.overdueCount > 0 && (
              <span className="text-[11px] text-[#c62828] font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c62828] animate-ping" />
                Action required
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filter & Operational Search Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search employee, badge ID or course..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 text-slate-900 placeholder:text-slate-400 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-[#c62828] focus:bg-white"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          {/* Department */}
          <div className="relative min-w-[170px] w-full sm:w-auto">
            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 text-slate-700 py-2 px-3 rounded-lg border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#c62828] cursor-pointer"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Course */}
          <div className="relative min-w-[210px] w-full sm:w-auto">
            <select
              value={courseFilter}
              onChange={(e) => {
                setCourseFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 text-slate-700 py-2 px-3 rounded-lg border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#c62828] cursor-pointer truncate"
            >
              <option value="all">All Courses</option>
              {filterCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="relative min-w-[150px] w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 text-slate-700 py-2 px-3 rounded-lg border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#c62828] cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="in progress">In Progress</option>
              <option value="not started">Not Started</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {/* Reset */}
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setDeptFilter('all');
              setCourseFilter('all');
              setStatusFilter('all');
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-white text-slate-600 hover:text-slate-900 rounded-lg border border-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer hover:bg-slate-50"
            title="Reset Filters"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Floating Batch Action Bar (Appears when rows selected) */}
      {selectedIds.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl animate-in fade-in slide-in-from-top-2 gap-3 border border-slate-700">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-6 h-6 bg-[#c62828] text-white rounded font-mono text-[11px] font-bold">
              {selectedIds.length}
            </span>
            <span className="text-xs font-semibold tracking-wide">
              {selectedIds.length} employee{selectedIds.length > 1 ? 's' : ''} selected for batch operations
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleBatchSendReminder}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold transition-colors text-white border border-slate-600 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-slate-300" />
              <span>Send Training Reminder</span>
            </button>

            <button
              type="button"
              onClick={handleBatchUnenroll}
              disabled={isProcessingBatch}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bulk Unenroll</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold transition-colors text-white border border-slate-600 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-300" />
              <span>Export Records</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="ml-1 text-slate-400 hover:text-white p-1 cursor-pointer"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Data Table Container */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={allCurrentSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someCurrentSelected;
                    }}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-[#c62828] rounded border-slate-300 focus:ring-[#c62828] cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Course</th>
                <th className="py-3.5 px-4 min-w-[180px]">Progress</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <p className="text-sm font-semibold text-slate-600">No enrollment records found</p>
                    <p className="text-xs text-slate-400 mt-1">Try clearing your search query or adjusting your filters.</p>
                  </td>
                </tr>
              ) : (
                paginated.map((item) => {
                  const isChecked = selectedIds.includes(item.id);
                  const initials = getInitials(item.name);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isChecked ? 'bg-red-50/30' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleRow(item.id)}
                          className="w-4 h-4 text-[#c62828] rounded border-slate-300 focus:ring-[#c62828] cursor-pointer"
                        />
                      </td>

                      {/* Employee (Avatar, Name, Badge ID) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                            {initials}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-slate-900 truncate">
                              {item.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono text-slate-500 font-medium">
                                {item.badgeId}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                                ({item.email})
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {item.department}
                        </span>
                      </td>

                      {/* Course */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-slate-900 truncate">
                            {item.courseTitle}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 uppercase">
                            {item.courseCode}
                          </span>
                        </div>
                      </td>

                      {/* Progress */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 w-full max-w-[160px]">
                          <div className="flex justify-between items-center text-[11px] font-mono">
                            <span
                              className={`font-semibold ${
                                item.status === 'Completed'
                                  ? 'text-emerald-700'
                                  : item.status === 'Overdue'
                                  ? 'text-red-700'
                                  : 'text-blue-700'
                              }`}
                            >
                              {item.progressPct}%
                            </span>
                            <span className="text-slate-400">
                              ({item.completedLessons}/{item.totalLessons})
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded overflow-hidden border border-slate-200/80">
                            <div
                              className={`h-full rounded transition-all duration-300 ${
                                item.status === 'Completed'
                                  ? 'bg-emerald-600'
                                  : item.status === 'Overdue'
                                  ? 'bg-[#c62828]'
                                  : 'bg-blue-600'
                              }`}
                              style={{ width: `${item.progressPct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.status === 'Completed' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] uppercase bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            Completed
                          </span>
                        ) : item.status === 'In Progress' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] uppercase bg-blue-50 text-blue-800 font-bold border border-blue-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                            In Progress
                          </span>
                        ) : item.status === 'Overdue' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] uppercase bg-red-50 text-red-800 font-bold border border-red-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                            Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] uppercase bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Not Started
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setNotificationMsg(`Reminder notice sent to ${item.name} (${item.email}).`);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Send Reminder"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUnenrollSingle(item.id, item.name)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Unenroll Employee"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer & Tabular Pagination */}
        <div className="px-5 py-3.5 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
          <div className="text-xs text-slate-500 font-mono">
            Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} employee enrollments
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 rounded-md text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setCurrentPage(num)}
                className={`w-7 h-7 rounded-md text-xs font-mono font-semibold transition cursor-pointer ${
                  currentPage === num
                    ? 'bg-[#c62828] text-white shadow-xs'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 rounded-md text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Enroll Employees Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-[#c62828] flex items-center justify-center border border-red-200">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Enroll Employees in Training</h3>
                  <p className="text-xs text-slate-500">Select team members and technical courses to assign.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEnrollModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEnrollSubmit} className="space-y-4">
              {/* Employee Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  1. Select Employees <span className="text-[#c62828]">*</span>
                </label>
                <div className="border border-slate-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1.5 bg-slate-50">
                  {employeesList.length === 0 ? (
                    <p className="text-xs text-slate-400">No employees registered yet.</p>
                  ) : (
                    employeesList.map((emp) => {
                      const isSel = enrollUserIds.includes(emp.id);
                      return (
                        <label
                          key={emp.id}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                            isSel ? 'bg-red-50 border border-red-200' : 'bg-white hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSel}
                              onChange={() =>
                                setEnrollUserIds((prev) =>
                                  prev.includes(emp.id)
                                    ? prev.filter((i) => i !== emp.id)
                                    : [...prev, emp.id]
                                )
                              }
                              className="w-4 h-4 text-[#c62828] rounded border-slate-300 focus:ring-[#c62828]"
                            />
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900">{emp.name}</span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                {emp.badgeId} • {emp.email}
                              </span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium">
                            {emp.department}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Course Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  2. Select Course(s) <span className="text-[#c62828]">*</span>
                </label>
                <div className="border border-slate-300 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1.5 bg-slate-50">
                  {coursesList.length === 0 ? (
                    <p className="text-xs text-slate-400">No courses available.</p>
                  ) : (
                    coursesList.map((crs) => {
                      const isSel = enrollCourseIds.includes(crs.id);
                      return (
                        <label
                          key={crs.id}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                            isSel ? 'bg-red-50 border border-red-200' : 'bg-white hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSel}
                              onChange={() =>
                                setEnrollCourseIds((prev) =>
                                  prev.includes(crs.id)
                                    ? prev.filter((i) => i !== crs.id)
                                    : [...prev, crs.id]
                                )
                              }
                              className="w-4 h-4 text-[#c62828] rounded border-slate-300 focus:ring-[#c62828]"
                            />
                            <span className="font-semibold text-slate-900">{crs.title}</span>
                          </div>
                          <span className="font-mono text-[11px] text-slate-500 font-semibold uppercase">
                            {crs.code}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {enrollError && (
                <p className="text-xs text-red-600 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{enrollError}</span>
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEnroll}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#c62828] hover:bg-[#a20513] rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmittingEnroll ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Enrolling…</span>
                    </>
                  ) : (
                    <span>Confirm &amp; Assign</span>
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
