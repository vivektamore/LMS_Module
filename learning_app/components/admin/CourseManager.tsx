'use client';

import { useState, useEffect, useMemo } from 'react';
import CategoryManager from '@/components/admin/CategoryManager';
import { CourseBuilder } from '@/components/admin/CourseBuilder';
import {
  Plus, Search, X, Edit2, Eye, Trash2, Archive, ArchiveRestore,
  BookOpen, Users, Clock, CheckCircle2, AlertTriangle, Layers,
  ChevronLeft, ChevronRight, HelpCircle, ArrowLeft, Filter, RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export interface CourseItem {
  id: string;
  title: string;
  course_code?: string;
  description?: string;
  thumbnail_url?: string | null;
  category?: string;
  categoryId?: string;
  departments?: string[];
  modules: number;
  lessons: number;
  totalDurationSeconds?: number;
  enrollments?: number;
  createdAt?: string;
  status: 'Published' | 'Draft' | 'Archived';
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

interface CourseManagerProps {
  initialCourses: CourseItem[];
  initialCategories?: CategoryItem[];
}

function formatDuration(sec: number) {
  if (!sec || sec <= 0) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return `${sec}s`;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

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

// Return assigned course code or generate deterministic department-based SOP code e.g. JC-MNT-001
function getCourseCode(course: CourseItem) {
  if (course.course_code && course.course_code.trim()) {
    return course.course_code.trim();
  }

  let deptCode = 'GEN';

  if (course.departments && course.departments.length > 0) {
    deptCode = DEPT_CODE_MAP[course.departments[0]] || course.departments[0].slice(0, 3).toUpperCase();
  } else if (course.category) {
    const cat = course.category.toUpperCase();
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

export default function CourseManager({ initialCourses, initialCategories = [] }: CourseManagerProps) {
  const router = useRouter();

  // Navigation & View Mode: 'manage' = directory table, 'builder' = create/edit form
  const [viewMode, setViewMode] = useState<'manage' | 'builder'>('manage');
  const [courses, setCourses] = useState<CourseItem[]>(initialCourses);
  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modals & Safety Dialogs
  const [archiveTarget, setArchiveTarget] = useState<CourseItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CourseItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [recentlySavedId, setRecentlySavedId] = useState<string | null>(null);

  // Sync when initialCourses changes
  useEffect(() => {
    setCourses(initialCourses);
  }, [initialCourses]);

  // Load categories if not provided
  useEffect(() => {
    if (initialCategories.length === 0) {
      fetch('/api/categories')
        .then((res) => res.json())
        .then((data) => {
          if (data.categories) setCategories(data.categories);
        })
        .catch(() => { });
    }
  }, [initialCategories]);

  // Client-side refresh
  async function refreshCourses() {
    try {
      const res = await fetch('/api/courses?admin=true');
      const data = await res.json();
      if (data.courses) {
        setCourses(
          data.courses.map((c: any) => ({
            id: c.id,
            title: c.title,
            course_code: c.course_code || '',
            description: c.description || '',
            thumbnail_url: c.thumbnail_url || null,
            category: c.categories?.name || 'Uncategorized',
            categoryId: c.categories?.id || '',
            departments: c.departments || [],
            modules: Number(c.module_count || 0),
            lessons: Number(c.lessons?.length || 0),
            totalDurationSeconds: Number(c.total_duration_seconds || 0),
            enrollments: Number(c.enrollmentCount || 0),
            createdAt: c.created_at,
            status: 'Published',
          }))
        );
      }
    } catch (err) {
      console.error('Failed to refresh courses:', err);
    }
  }

  // Telemetry metrics
  const metrics = useMemo(() => {
    const total = courses.length;
    const published = courses.filter((c) => c.status === 'Published').length;
    const draft = courses.filter((c) => c.status === 'Draft').length;
    const archived = courses.filter((c) => c.status === 'Archived').length;
    return { total, published, draft, archived };
  }, [courses]);

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'published' && c.status !== 'Published') return false;
        if (statusFilter === 'draft' && c.status !== 'Draft') return false;
        if (statusFilter === 'archived' && c.status !== 'Archived') return false;
      }
      // Category filter
      if (selectedCategory !== 'all') {
        if (c.category?.toLowerCase() !== selectedCategory.toLowerCase()) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = getCourseCode(c).toLowerCase();
        const title = c.title.toLowerCase();
        const desc = (c.description || '').toLowerCase();
        if (!title.includes(q) && !code.includes(q) && !desc.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [courses, statusFilter, selectedCategory, searchQuery]);

  // Actions
  function handleOpenCreate() {
    setEditingCourseId(null);
    setViewMode('builder');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleEditCourse(courseId: string) {
    setEditingCourseId(courseId);
    setViewMode('builder');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleToggleArchive(course: CourseItem) {
    const newStatus = course.status === 'Archived' ? 'Published' : 'Archived';
    setCourses((prev) =>
      prev.map((c) => (c.id === course.id ? { ...c, status: newStatus } : c))
    );
    setArchiveTarget(null);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/courses/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete course');

      setCourses((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      if (editingCourseId === deleteTarget.id) {
        setEditingCourseId(null);
      }
      setDeleteTarget(null);
      await refreshCourses();
      router.refresh();
    } catch (err: any) {
      alert(`Delete Error: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleCourseSaved(savedId?: string) {
    if (savedId) {
      setRecentlySavedId(savedId);
      setTimeout(() => setRecentlySavedId(null), 5000);
    }
    await refreshCourses();
    router.refresh();
    setViewMode('manage');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="flex flex-col w-full font-sans antialiased text-slate-900">
      {/* ─────────────────────────────────────────────────────────────
          VIEW 1: MANAGE COURSES DIRECTORY
      ───────────────────────────────────────────────────────────── */}
      {viewMode === 'manage' && (
        <div className="w-full flex flex-col gap-6" id="courseDirectoryRoot">
          {/* Top Bar: Header & Primary CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Manage Courses
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Create, update and manage technical training courses.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowCategoryModal((v) => !v)}
                className="h-10 px-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold tracking-wide transition shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Layers className="w-4 h-4 text-slate-500" />
                <span>Categories</span>
              </button>
              <button
                type="button"
                onClick={handleOpenCreate}
                id="openCreateCourseBtn"
                className="h-10 px-5 bg-[#c62828] hover:bg-[#a20513] text-white rounded-lg text-sm font-semibold tracking-wide transition shadow-sm flex items-center gap-2 cursor-pointer active:translate-y-px"
              >
                <Plus className="w-4 h-4" />
                <span>Create Course</span>
              </button>
            </div>
          </div>

          {/* Telemetry Metric Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Courses */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  Courses
                </span>
                <BookOpen className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-bold text-slate-900">{metrics.total}</span>
                <span className="text-xs text-slate-500 font-medium">total</span>
              </div>
            </div>

            {/* Published Active */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  Published
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-bold text-slate-900">{metrics.published}</span>
                <span className="text-xs text-emerald-700 font-medium">active</span>
              </div>
            </div>

            {/* Draft */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  Draft
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-bold text-slate-900">{metrics.draft}</span>
                <span className="text-xs text-amber-800 font-medium">in progress</span>
              </div>
            </div>

            {/* Archived */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  Archived
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-bold text-slate-900">{metrics.archived}</span>
                <span className="text-xs text-slate-500 font-medium">inactive</span>
              </div>
            </div>
          </div>

          {/* Category Management Collapsible Panel */}
          {showCategoryModal && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#c62828]" />
                  <h3 className="font-bold text-slate-900 text-base">Course Categories</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <CategoryManager />
            </div>
          )}

          {/* Filter & Search Controls Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0" id="statusFilterGroup">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${statusFilter === 'all'
                    ? 'bg-[#c62828] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                <span>All</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${statusFilter === 'all' ? 'bg-white/20' : 'bg-slate-100 text-slate-600'
                  }`}>
                  {metrics.total}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('published')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${statusFilter === 'published'
                    ? 'bg-[#c62828] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                <span>Published</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${statusFilter === 'published' ? 'bg-white/20' : 'bg-slate-100 text-slate-600'
                  }`}>
                  {metrics.published}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('draft')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${statusFilter === 'draft'
                    ? 'bg-[#c62828] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                <span>Draft</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${statusFilter === 'draft' ? 'bg-white/20' : 'bg-slate-100 text-slate-600'
                  }`}>
                  {metrics.draft}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('archived')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${statusFilter === 'archived'
                    ? 'bg-[#c62828] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                <span>Archived</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${statusFilter === 'archived' ? 'bg-white/20' : 'bg-slate-100 text-slate-600'
                  }`}>
                  {metrics.archived}
                </span>
              </button>
            </div>

            {/* Search & Category Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
              {/* Search Field */}
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search courses, course code..."
                  className="w-full h-9 pl-9 pr-8 rounded-lg border border-slate-300 bg-[#f8fafc] focus:bg-white text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-[#c62828] focus:ring-1 focus:ring-[#c62828] transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Dropdown */}
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full sm:w-auto h-9 pl-3 pr-8 rounded-lg border border-slate-300 bg-[#f8fafc] text-slate-900 text-xs font-medium focus:outline-none focus:border-[#c62828] focus:bg-white transition cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* High-Density Course Directory Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[980px]" id="coursesTable">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4 w-[36%]" scope="col">Course Title &amp; Specification</th>
                    <th className="py-3 px-4 w-[14%]" scope="col">Category</th>
                    <th className="py-3 px-4 text-center w-[9%]" scope="col">Modules</th>
                    <th className="py-3 px-4 text-center w-[12%]" scope="col">Lessons &amp; Duration</th>
                    <th className="py-3 px-4 text-center w-[9%]" scope="col">Enrollments</th>
                    <th className="py-3 px-4 w-[10%]" scope="col">Status</th>
                    <th className="py-3 px-4 w-[10%]" scope="col">Created</th>
                    <th className="py-3 px-4 text-right w-[10%]" scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredCourses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 px-4 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <BookOpen className="w-10 h-10 text-slate-300 mb-2" />
                          <h4 className="text-base font-bold text-slate-800">No matching courses found</h4>
                          <p className="text-xs text-slate-500 mt-1 max-w-sm">
                            {courses.length === 0
                              ? 'No curriculum specifications created yet. Click "Create Course" to get started.'
                              : 'No courses match your active search or filter. Adjust your criteria or reset filters.'}
                          </p>
                          {courses.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setStatusFilter('all');
                                setSelectedCategory('all');
                                setSearchQuery('');
                              }}
                              className="mt-4 px-3 py-1.5 text-xs font-semibold bg-slate-100 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                            >
                              Reset All Filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCourses.map((course) => {
                      const isRecent = course.id === recentlySavedId;
                      const code = getCourseCode(course);
                      const isArchived = course.status === 'Archived';
                      return (
                        <tr
                          key={course.id}
                          className={`hover:bg-slate-50/80 transition-colors group ${isRecent ? 'bg-red-50/40 border-l-4 border-[#c62828]' : ''
                            } ${isArchived ? 'opacity-70 bg-slate-50/40' : ''}`}
                        >
                          {/* Title & Specs */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {/* 16:9 Thumbnail Preview */}
                              <div className="relative w-14 h-10 rounded-md overflow-hidden border border-slate-200 shrink-0 bg-slate-100 flex items-center justify-center">
                                {course.thumbnail_url ? (
                                  <img
                                    src={course.thumbnail_url}
                                    alt={course.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
                                    <BookOpen className="w-5 h-5 text-slate-400" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-[#c62828]/5 mix-blend-multiply pointer-events-none"></div>
                              </div>

                              <div className="flex flex-col min-w-0">
                                <button
                                  type="button"
                                  onClick={() => handleEditCourse(course.id)}
                                  className="font-semibold text-slate-900 hover:text-[#c62828] text-sm transition-colors truncate text-left cursor-pointer"
                                >
                                  {course.title}
                                </button>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[11px] font-mono font-medium text-slate-500 uppercase">
                                    {code}
                                  </span>
                                  {isRecent && (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                                      Saved ✓
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Category Badge */}
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {course.category || 'General'}
                            </span>
                          </td>

                          {/* Modules Count */}
                          <td className="py-3 px-4 text-center font-mono text-xs font-semibold text-slate-800">
                            {course.modules}
                          </td>

                          {/* Lessons & Duration */}
                          <td className="py-3 px-4 text-center">
                            <div className="text-xs font-medium text-slate-800">
                              {course.lessons} {course.lessons === 1 ? 'lesson' : 'lessons'}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {formatDuration(course.totalDurationSeconds || 0)}
                            </div>
                          </td>

                          {/* Enrollments Count */}
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1 text-slate-700">
                              <Users className="w-3.5 h-3.5 text-[#c62828]" />
                              <span className="font-mono text-xs font-semibold">
                                {course.enrollments ?? 0}
                              </span>
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-4">
                            {course.status === 'Published' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                Published
                              </span>
                            )}
                            {course.status === 'Draft' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                Draft
                              </span>
                            )}
                            {course.status === 'Archived' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                                Archived
                              </span>
                            )}
                          </td>

                          {/* Created Date */}
                          <td className="py-3 px-4 font-mono text-xs text-slate-500">
                            {formatDate(course.createdAt)}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => handleEditCourse(course.id)}
                                className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                                title="Edit Course"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Preview */}
                              <Link
                                href={`/course/${course.id}`}
                                target="_blank"
                                className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                                title="Preview Course"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>

                              {/* Archive / Restore */}
                              <button
                                type="button"
                                onClick={() => setArchiveTarget(course)}
                                className="p-1.5 rounded text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition cursor-pointer"
                                title={isArchived ? 'Restore Course' : 'Archive Course'}
                              >
                                {isArchived ? (
                                  <ArchiveRestore className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Archive className="w-4 h-4" />
                                )}
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(course)}
                                className="p-1.5 rounded text-slate-500 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                title="Delete Course"
                              >
                                <Trash2 className="w-4 h-4" />
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

            {/* Table Footer */}
            <div className="bg-[#f8fafc] border-t border-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-xs">
              <div className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-slate-400" />
                <span>Course categories can be added or updated via</span>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal((v) => !v)}
                  className="text-[#c62828] hover:underline font-semibold cursor-pointer"
                >
                  Manage Categories
                </button>
                <span>.</span>
              </div>
              <div className="font-mono text-slate-600">
                Showing {filteredCourses.length} of {courses.length} courses
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW 2: CREATE / EDIT COURSE & CURRICULUM BUILDER
      ───────────────────────────────────────────────────────────── */}
      {viewMode === 'builder' && (
        <div className="w-full flex flex-col gap-6" id="courseBuilderContainer">
          <CourseBuilder
            editingCourseId={editingCourseId}
            onCourseSaved={handleCourseSaved}
            onCancelEdit={() => {
              setEditingCourseId(null);
              setViewMode('manage');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SAFETY MODAL: ARCHIVE COURSE
      ───────────────────────────────────────────────────────────── */}
      {archiveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-300 rounded-xl max-w-md w-full p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Archive className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="font-bold text-slate-900 text-base">
                  {archiveTarget.status === 'Archived' ? 'Restore Course Curriculum?' : 'Archive Course Curriculum?'}
                </h3>
                <p className="font-mono text-xs text-slate-500 mt-0.5">
                  TARGET: {getCourseCode(archiveTarget)}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Are you sure you want to {archiveTarget.status === 'Archived' ? 'restore' : 'archive'}{' '}
              <strong className="text-slate-900 font-semibold">{archiveTarget.title}</strong>?
            </p>

            <div className="bg-slate-50 border-l-2 border-[#c62828] p-3 rounded text-xs text-slate-600 leading-relaxed">
              <strong>Operational Note:</strong>{' '}
              {archiveTarget.status === 'Archived'
                ? 'Learners will immediately be able to view and enroll in this course again.'
                : 'Enrolled learners retain read-only certification access, but new enrollments will be locked.'}
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => setArchiveTarget(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleArchive(archiveTarget)}
                className="px-4 py-2 bg-[#c62828] text-white rounded-lg text-xs font-semibold hover:bg-[#a20513] transition shadow-xs cursor-pointer"
              >
                {archiveTarget.status === 'Archived' ? 'Confirm Restore' : 'Confirm Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SAFETY MODAL: DELETE COURSE
      ───────────────────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-300 rounded-xl max-w-md w-full p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="font-bold text-slate-900 text-base">
                  Delete Course Curriculum?
                </h3>
                <p className="font-mono text-xs text-slate-500 mt-0.5">
                  TARGET: {getCourseCode(deleteTarget)}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Are you sure you want to permanently delete{' '}
              <strong className="text-slate-900 font-semibold">{deleteTarget.title}</strong>?
            </p>

            <div className="bg-red-50 border-l-2 border-red-500 p-3 rounded text-xs text-red-800 leading-relaxed">
              <strong>Permanent Action:</strong> All modules, lessons, video records, and quiz checkpoints linked to this course will be permanently removed.
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? 'Deleting…' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
