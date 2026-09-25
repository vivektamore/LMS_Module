'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  BookOpen, Users, Clock, TrendingUp, ArrowLeft, 
  PlayCircle, UserCheck, Activity, Search, RefreshCw, Loader2, Award, X,
  CheckCircle, Film, Eye, Download, ShieldCheck, Trophy, ChevronRight,
  Filter, ArrowUpRight, BarChart3, AlertCircle, Medal, Sparkles
} from 'lucide-react';

interface Stats {
  totalCourses: number;
  activeSignIns: number;
  videoHours: number;
  totalSeconds: number;
  formattedWatchTime: string;
  totalEnrollments: number;
  completedCount?: number;
  inProgressCount?: number;
  notStartedCount?: number;
  completionRate?: number;
}

interface TrendDay {
  day: string;
  date: string;
  seconds: number;
  minutes: number;
  hours: number;
  formatted: string;
}

interface UserProgress {
  id: string;
  email: string;
  name?: string | null;
  employee_id?: string | null;
  role: string;
  department: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  enrolledCoursesCount: number;
  completedLessonsCount: number;
  certificatesCount: number;
  watchedSeconds: number;
}

interface CourseOverviewItem {
  id: string;
  title: string;
  course_code?: string;
  category_name?: string;
  category_slug?: string;
  module_count: number;
  enrolled_count: number;
  created_at: string;
}

interface EnrollmentItem {
  id: string;
  userId: string;
  courseId: string;
  email: string;
  name?: string | null;
  employeeId?: string | null;
  department: string | null;
  courseTitle: string;
  enrolledAt: string;
  progressPct: number;
  status: 'Completed' | 'In Progress' | 'Not Started';
  watchedSeconds: number;
}

interface LeaderboardUser {
  rank: number;
  id: string;
  email: string;
  name: string;
  department: string | null;
  completedLessons: number;
  certificatesCount: number;
  completedCourses: number;
  watchedSeconds: number;
  badge: string;
  isCurrentUser: boolean;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [trend, setTrend] = useState<TrendDay[]>([]);
  const [users, setUsers] = useState<UserProgress[]>([]);
  const [courses, setCourses] = useState<CourseOverviewItem[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [leaderFilter, setLeaderFilter] = useState<'all' | 'month' | 'shift'>('all');
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Table filters & pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Certificate modal state
  const [certModal, setCertModal] = useState<{
    userId: string;
    email: string;
    certs: { id: string; course_title: string; issued_at: string }[];
    loading: boolean;
  } | null>(null);

  // Individual watch time breakdown modal state
  const [watchModal, setWatchModal] = useState<{
    user: UserProgress;
    totalWatchedSeconds: number;
    watchRecords: any[];
    enrolledCourses: any[];
    loading: boolean;
  } | null>(null);

  async function openWatchModal(user: UserProgress) {
    setWatchModal({
      user,
      totalWatchedSeconds: user.watchedSeconds || 0,
      watchRecords: [],
      enrolledCourses: [],
      loading: true,
    });
    try {
      const res = await fetch(`/api/admin/user-watch-time?user_id=${user.id}`);
      const data = await res.json();
      if (res.ok) {
        setWatchModal({
          user,
          totalWatchedSeconds: data.totalWatchedSeconds || 0,
          watchRecords: data.watchRecords || [],
          enrolledCourses: data.enrolledCourses || [],
          loading: false,
        });
      } else {
        setWatchModal((prev) => (prev ? { ...prev, loading: false } : null));
      }
    } catch {
      setWatchModal((prev) => (prev ? { ...prev, loading: false } : null));
    }
  }

  async function openCertModal(user: UserProgress) {
    setCertModal({ userId: user.id, email: user.email, certs: [], loading: true });
    try {
      const res = await fetch(`/api/admin/user-certificates?user_id=${user.id}`);
      const data = await res.json();
      setCertModal((prev) => (prev ? { ...prev, certs: data.certificates || [], loading: false } : null));
    } catch {
      setCertModal((prev) => (prev ? { ...prev, certs: [], loading: false } : null));
    }
  }

  async function fetchAnalytics(isSilent = false) {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const [analyticsRes, leaderRes] = await Promise.all([
        fetch('/api/admin/analytics'),
        fetch('/api/leaderboard'),
      ]);

      if (!analyticsRes.ok) {
        if (analyticsRes.status === 401) {
          window.location.href = '/login';
          return;
        }
        if (analyticsRes.status === 403) throw new Error('Forbidden: Admin access required.');
        throw new Error('Failed to fetch admin analytics data.');
      }
      const data = await analyticsRes.json();
      setStats(data.stats);
      setTrend(data.trend || []);
      setUsers(data.users || []);
      setCourses(data.courses || []);
      setEnrollments(data.recentEnrollments || []);

      if (leaderRes.ok) {
        const leaderData = await leaderRes.json();
        setLeaders(leaderData.leaderboard || []);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Compute unique departments for filter dropdown
  const departments = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.department) set.add(u.department);
    });
    return Array.from(set).sort();
  }, [users]);

  // Combined enrolled rows (either from recentEnrollments or mapped from users)
  const displayEnrollments = useMemo(() => {
    if (enrollments.length > 0) {
      return enrollments.filter((item) => {
        const matchesQuery = 
          item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.department || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = selectedDept === 'all' || (item.department || '').toLowerCase() === selectedDept.toLowerCase();
        return matchesQuery && matchesDept;
      });
    }

    // Fallback if no enrollments table rows yet: map from users
    return users.map((u) => ({
      id: u.id,
      userId: u.id,
      courseId: 'general',
      email: u.email,
      name: u.name ?? null,
      employeeId: u.employee_id ?? null,
      department: u.department,
      courseTitle: u.enrolledCoursesCount > 0 ? `${u.enrolledCoursesCount} Curricula Assigned` : 'No Assigned Course',
      enrolledAt: u.created_at,
      progressPct: u.completedLessonsCount > 0 ? Math.min(100, u.completedLessonsCount * 25) : 0,
      status: (u.completedLessonsCount > 3 ? 'Completed' : u.completedLessonsCount > 0 ? 'In Progress' : 'Not Started') as 'Completed' | 'In Progress' | 'Not Started',
      watchedSeconds: u.watchedSeconds,
    })).filter((item) => {
      const matchesQuery = 
        item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.department || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = selectedDept === 'all' || (item.department || '').toLowerCase() === selectedDept.toLowerCase();
      return matchesQuery && matchesDept;
    });
  }, [enrollments, users, searchQuery, selectedDept]);

  // Paginated enrollments
  const paginatedEnrollments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return displayEnrollments.slice(start, start + pageSize);
  }, [displayEnrollments, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(displayEnrollments.length / pageSize));

  // Export CSV handler
  function exportCSV() {
    const headers = ['Employee Email', 'Department', 'Course', 'Enrolled Date', 'Progress %', 'Status', 'Watched Seconds'];
    const rows = displayEnrollments.map((e) => [
      `"${e.email}"`,
      `"${e.department || 'N/A'}"`,
      `"${e.courseTitle}"`,
      `"${new Date(e.enrolledAt).toLocaleDateString()}"`,
      `"${e.progressPct}%"`,
      `"${e.status}"`,
      `"${e.watchedSeconds || 0}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `jolly_clamps_enrollments_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Format initials
  function getInitials(email: string) {
    const clean = email.split('@')[0].replace(/[^a-zA-Z]/g, '');
    if (clean.length >= 2) return clean.slice(0, 2).toUpperCase();
    return (email[0] || 'U').toUpperCase();
  }

  // Format technical ID
  function getTechId(email: string, dept: string | null) {
    const prefix = dept ? dept.slice(0, 4).toUpperCase() : 'EMP';
    const hash = Math.abs(email.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0)) % 900 + 100;
    return `JC-${prefix}-${hash}`;
  }

  // Weekly minutes total
  const weeklyMinutes = useMemo(() => {
    return Math.round(trend.reduce((sum, d) => sum + (d.minutes || 0), 0));
  }, [trend]);

  const maxDailyMinutes = useMemo(() => {
    return Math.max(...trend.map((d) => d.minutes || 0), 60);
  }, [trend]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin text-[#c62828]" />
          <p className="text-sm font-semibold text-slate-700">Loading Technical Admin Dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-slate-900 selection:bg-[#c62828] selection:text-white flex flex-col font-sans">
      
      {/* ── Fixed Technical Top Header Bar ────────────────────────────── */}
      <header className="sticky top-0 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-6 py-3.5 shadow-sm">
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] ring-4 ring-[#16A34A]/20"></span>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Admin Dashboard
            </h1>
            <span className="hidden sm:inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-semibold tracking-wider border border-slate-200">
              JC-LMS-SYS
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage technical training, employee enrollments and learning progress.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#c62828]' : 'text-slate-500'}`} />
            <span>Sync</span>
          </button>

          <div className="h-5 w-px bg-slate-200"></div>

          <Link
            href="/admin/courses"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#c62828] hover:bg-[#a20513] text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Courses</span>
          </Link>
        </div>
      </header>

      {/* ── Main Container ─────────────────────────────────────────────── */}
      <main className="w-full max-w-[1300px] mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border-l-4 border-[#c62828] p-4 rounded-r-lg flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-[#c62828] flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold tracking-wider text-[#a20513]">Data Sync Notice</h4>
              <p className="text-xs text-slate-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── 1. KEY PERFORMANCE INDICATORS (4-Card Grid) ──────────────── */}
        <section aria-label="Key Performance Indicators" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          
          {/* Card 1: Total Courses */}
          <div className="bg-white rounded-lg p-5 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all border border-slate-200">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#a20513]"></div>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase block">
                  Total Courses
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    {stats?.totalCourses ?? courses.length}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold uppercase">Curricula</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between text-xs text-slate-500 bg-slate-50 -mx-5 -mb-5 px-5 py-2.5 border-t border-slate-100">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
                <span>{courses.length > 0 ? courses.length : stats?.totalCourses || 0} Published</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                <span>0 Draft</span>
              </span>
            </div>
          </div>

          {/* Card 2: Total Employees */}
          <div className="bg-white rounded-lg p-5 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all border border-slate-200">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#565e74]"></div>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase block">
                  Total Employees
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    {users.length}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold uppercase">Personnel</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between text-xs text-slate-500 bg-slate-50 -mx-5 -mb-5 px-5 py-2.5 border-t border-slate-100">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a20513]"></span>
                <span>{stats?.activeSignIns || 0} Active (7d)</span>
              </span>
              <span className="font-bold text-slate-700">
                {users.length > 0 ? Math.round(((stats?.activeSignIns || 0) / users.length) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Card 3: Active Enrollments */}
          <div className="bg-white rounded-lg p-5 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all border border-slate-200">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#c62828]"></div>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase block">
                  Active Enrollments
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-[#c62828] tracking-tight">
                    {stats?.totalEnrollments ?? enrollments.length}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold uppercase">Assigned</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-[#c62828]">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between text-xs text-slate-500 bg-slate-50 -mx-5 -mb-5 px-5 py-2.5 border-t border-slate-100 font-medium truncate">
              <span>
                {stats?.completedCount || 0} Done • {stats?.inProgressCount || 0} In Progress • {stats?.notStartedCount || 0} Pending
              </span>
            </div>
          </div>

          {/* Card 4: Completion Rate */}
          <div className="bg-white rounded-lg p-5 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all border border-slate-200">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#16A34A]"></div>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase block">
                  Completion Rate
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    {stats?.completionRate || (stats?.totalEnrollments ? Math.round(((stats?.completedCount || 0) / stats.totalEnrollments) * 100) : 0)}%
                  </span>
                  <span className="text-xs text-[#16A34A] font-semibold flex items-center">
                    <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> ISO Benchmark
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-[#16A34A]">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between text-xs text-slate-500 bg-slate-50 -mx-5 -mb-5 px-5 py-2.5 border-t border-slate-100 font-medium">
              <span>{stats?.completedCount || 0} of {stats?.totalEnrollments || enrollments.length || 0} certified</span>
              <span className="text-[#16A34A] font-bold">Standardized</span>
            </div>
          </div>

        </section>

        {/* ── 2. RECENT ENROLLMENTS & USER PROGRESS TABLE ──────────────── */}
        <section className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Table Toolbar */}
          <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 bg-white">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Recent Enrollments & Progress
                </h2>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-bold">
                  {displayEnrollments.length} Records
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Track employee course assignments, individual playback watch time, and certifications.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search name, ID or email..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#c62828] focus:bg-white transition"
                />
              </div>

              {/* Department Dropdown */}
              <div className="relative">
                <select
                  value={selectedDept}
                  onChange={(e) => {
                    setSelectedDept(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 pr-8 text-xs font-medium text-slate-700 focus:outline-none focus:border-[#c62828] cursor-pointer"
                >
                  <option value="all">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Export CSV Button */}
              <button
                type="button"
                onClick={exportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition border border-slate-300 cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 select-none">
                  <th className="py-3 px-4 font-bold">Employee</th>
                  <th className="py-3 px-3 font-bold">Department</th>
                  <th className="py-3 px-4 font-bold">Curriculum / Course</th>
                  <th className="py-3 px-3 font-bold">Enrolled Date</th>
                  <th className="py-3 px-4 font-bold">Progress</th>
                  <th className="py-3 px-3 font-bold text-center">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedEnrollments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-medium">No matching enrollments found.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedEnrollments.map((item) => {
                    const matchedUser = users.find((u) => u.id === item.userId || u.email === item.email);
                    const displayName = matchedUser?.name || item.name || item.email.split('@')[0];
                    const displayEmployeeId = matchedUser?.employee_id || item.employeeId || getTechId(item.email, item.department);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Employee Column */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs uppercase flex-shrink-0">
                              {getInitials(displayName || item.email)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 leading-tight truncate">
                                {displayName}
                              </div>
                              <span className="text-[11px] text-slate-400 font-mono font-medium block">
                                {displayEmployeeId}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-medium text-slate-700 border border-slate-200">
                            {item.department || 'General'}
                          </span>
                        </td>

                        {/* Course Title */}
                        <td className="py-3.5 px-4">
                          <span className="text-slate-800 font-medium line-clamp-1">
                            {item.courseTitle}
                          </span>
                        </td>

                        {/* Enrolled Date */}
                        <td className="py-3.5 px-3 whitespace-nowrap text-xs text-slate-500">
                          {item.enrolledAt ? new Date(item.enrolledAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '20 Sep 2026'}
                        </td>

                        {/* Progress Bar */}
                        <td className="py-3.5 px-4 w-36">
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-slate-100 h-1.5 rounded overflow-hidden">
                              <div
                                className={`h-1.5 rounded transition-all ${
                                  item.progressPct === 100 ? 'bg-[#16A34A]' : 'bg-[#c62828]'
                                }`}
                                style={{ width: `${item.progressPct}%` }}
                              ></div>
                            </div>
                            <span className={`text-xs font-bold ${
                              item.progressPct === 100 ? 'text-[#16A34A]' : 'text-slate-800'
                            }`}>
                              {item.progressPct}%
                            </span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          {item.status === 'Completed' ? (
                            <span className="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[11px] font-bold uppercase tracking-wider border border-emerald-200">
                              Completed
                            </span>
                          ) : item.status === 'In Progress' ? (
                            <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[11px] font-bold uppercase tracking-wider border border-blue-200">
                              In Progress
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[11px] font-bold uppercase tracking-wider border border-slate-200">
                              Not Started
                            </span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {matchedUser && (
                              <button
                                type="button"
                                onClick={() => openWatchModal(matchedUser)}
                                className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition cursor-pointer shadow-sm"
                                title="View individual watch time & playback history"
                              >
                                View Progress
                              </button>
                            )}
                            {matchedUser && matchedUser.certificatesCount > 0 && (
                              <button
                                type="button"
                                onClick={() => openCertModal(matchedUser)}
                                className="px-2 py-1 bg-amber-50 border border-amber-300 hover:bg-amber-100 text-amber-800 rounded-md text-xs font-semibold transition cursor-pointer shadow-sm"
                                title="View employee certificates"
                              >
                                Certs ({matchedUser.certificatesCount})
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

          {/* Table Pagination Footer */}
          <div className="px-5 py-3 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-slate-500 text-xs border-t border-slate-200">
            <div>
              Showing <strong>{Math.min(displayEnrollments.length, (currentPage - 1) * pageSize + 1)}</strong> to{' '}
              <strong>{Math.min(displayEnrollments.length, currentPage * pageSize)}</strong> of{' '}
              <strong>{displayEnrollments.length}</strong> enrollments
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-medium hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                    currentPage === page
                      ? 'bg-[#c62828] text-white shadow-sm'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-medium hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        {/* ── 3. FACTORY LEADERSHIP BOARD (Top Tutorial Achievers) ────── */}
        <section className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 bg-white">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-[#FEF3C7] border border-[#F59E0B] flex items-center justify-center text-[#B45309] shadow-sm flex-shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Factory Leadership Board — Top Tutorial Achievers
                  </h2>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-semibold tracking-wide border border-slate-200">
                    Plant #04 Stamping & Assembly
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#DCFCE7] text-[#166534] text-[11px] font-bold tracking-wide border border-[#166534]/20">
                    Q3 Active Sprint
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recognizing shop-floor technical learners, speed to qualification, and ISO compliance metrics.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start lg:self-center">
              {/* Filter pill group */}
              <div className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setLeaderFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    leaderFilter === 'all'
                      ? 'bg-white font-bold text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Time
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderFilter('month')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    leaderFilter === 'month'
                      ? 'bg-white font-bold text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderFilter('shift')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    leaderFilter === 'shift'
                      ? 'bg-white font-bold text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  This Shift
                </button>
              </div>

              <button
                type="button"
                onClick={() => fetchAnalytics(true)}
                className="w-8 h-8 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition shadow-sm cursor-pointer"
                title="Refresh leaderboard"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Top 3 Podium Cards */}
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Rank 1: Gold */}
            {leaders[0] ? (
              <div className="rounded-xl border-2 border-[#F59E0B] bg-[#FEF3C7]/40 p-5 relative flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 left-0 h-1 bg-[#F59E0B] rounded-t-[10px]"></div>
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-lg bg-[#FEF3C7] border border-[#F59E0B] flex items-center justify-center text-sm font-bold text-[#B45309] shadow-sm">
                          1
                        </div>
                        <Medal className="w-4 h-4 text-[#F59E0B] absolute -top-1.5 -right-1.5 drop-shadow-sm" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-slate-900 truncate">
                            {leaders[0].name || leaders[0].email.split('@')[0]}
                          </span>
                          {leaders[0].isCurrentUser && (
                            <span className="px-1.5 py-0.5 bg-[#c62828] text-white text-[10px] font-bold rounded uppercase tracking-wider">
                              YOU
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mt-0.5 truncate">
                          {leaders[0].department ? `${leaders[0].department} DEPT` : 'MAINTENANCE DEPT'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-white border border-[#FEF3C7] px-2 py-1 rounded-md text-[#B45309] text-xs font-bold shadow-sm">
                      <TrendingUp className="w-3.5 h-3.5 text-[#16A34A]" />
                      <span>{Math.round(leaders[0].watchedSeconds / 60)} pts</span>
                    </div>
                  </div>

                  {/* Skills Track Badge */}
                  <div className="mt-3 p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-1.5 text-slate-800 text-xs font-medium">
                      <span className="w-2 h-2 rounded-full bg-[#16A34A]"></span>
                      <span className="truncate">{leaders[0].badge || 'Torque Calibration Lead'}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                      Certified
                    </span>
                  </div>

                  {/* 3-Stat Industrial Micro Grid */}
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Tutorials</span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5">{leaders[0].completedLessons}</span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Certs</span>
                      <span className="text-sm font-bold text-[#B45309] mt-0.5">{leaders[0].certificatesCount}</span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Watched</span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5">
                        {Math.floor(leaders[0].watchedSeconds / 60)}m
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-amber-200/60 flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-500">Sprint Velocity</span>
                  <span className="font-bold text-[#16A34A] flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> 100% On-Target
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                No Rank 1 user yet
              </div>
            )}

            {/* Rank 2: Silver */}
            {leaders[1] ? (
              <div className="rounded-xl border border-slate-300 bg-white p-5 relative flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 left-0 h-1 bg-slate-400 rounded-t-[10px]"></div>
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center text-sm font-bold text-slate-600 shadow-sm">
                          2
                        </div>
                        <Award className="w-4 h-4 text-slate-500 absolute -top-1.5 -right-1.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 truncate">
                          {leaders[1].name || leaders[1].email.split('@')[0]}
                        </div>
                        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mt-0.5 truncate">
                          {leaders[1].department ? `${leaders[1].department} DEPT` : 'PRODUCTION DEPT'}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 text-xs font-semibold">
                      Rank 2
                    </span>
                  </div>

                  <div className="mt-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs shadow-xs">
                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Track Goal</span>
                    <span className="font-medium text-slate-800 truncate max-w-[150px]">
                      {leaders[1].badge || 'Next: LOTO Protocol'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-col items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Tutorials</span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5">{leaders[1].completedLessons}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-col items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Certs</span>
                      <span className="text-sm font-bold text-slate-700 mt-0.5">{leaders[1].certificatesCount}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-col items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Watched</span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5">
                        {Math.floor(leaders[1].watchedSeconds / 60)}m
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-500">Qualification</span>
                  <span className="text-slate-600 font-semibold">Progressing</span>
                </div>
              </div>
            ) : (
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                No Rank 2 user yet
              </div>
            )}

            {/* Rank 3: Bronze */}
            {leaders[2] ? (
              <div className="rounded-xl border border-slate-200 bg-white p-5 relative flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 left-0 h-1 bg-[#F59E0B]/50 rounded-t-[10px]"></div>
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-lg bg-[#FEF3C7]/40 border border-slate-300 flex items-center justify-center text-sm font-bold text-[#B45309] shadow-sm">
                          3
                        </div>
                        <Award className="w-4 h-4 text-[#B45309] absolute -top-1.5 -right-1.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 truncate">
                          {leaders[2].name || leaders[2].email.split('@')[0]}
                        </div>
                        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mt-0.5 truncate">
                          {leaders[2].department ? `${leaders[2].department} DEPT` : 'QUALITY INSPECTION'}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 text-xs font-semibold">
                      Rank 3
                    </span>
                  </div>

                  <div className="mt-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs shadow-xs">
                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Track Goal</span>
                    <span className="font-medium text-slate-800 truncate max-w-[150px]">
                      {leaders[2].badge || 'Next: Caliper Check'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-col items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Tutorials</span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5">{leaders[2].completedLessons}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-col items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Certs</span>
                      <span className="text-sm font-bold text-slate-700 mt-0.5">{leaders[2].certificatesCount}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-col items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Watched</span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5">
                        {Math.floor(leaders[2].watchedSeconds / 60)}m
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-500">Qualification</span>
                  <span className="text-slate-600 font-semibold">Progressing</span>
                </div>
              </div>
            ) : (
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                No Rank 3 user yet
              </div>
            )}

          </div>

          {/* Footer Ribbon */}
          <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600 text-xs font-medium">
              <span className="text-[#c62828] font-bold">⚡</span>
              <span>
                <strong className="text-slate-900 font-bold">Current Sprint Pacesetter:</strong>{' '}
                {leaders[0] ? (leaders[0].name || leaders[0].email.split('@')[0]) : 'maintenance.pew'} (+{leaders[0] ? Math.floor(leaders[0].watchedSeconds / 60) : 11} min)
              </span>
              <span className="text-slate-300">•</span>
              <span>Shop-Floor Compliance Leaderboard</span>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#c62828] hover:text-[#a20513] transition-colors"
            >
              <span>Employee Dashboard View</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* ── 4. LOWER SECTION: TWO COLUMNS (Courses 65% + Analytics 35%) ─ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (~65% / 8 Cols): Course Overview Table */}
          <div className="lg:col-span-8 bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-slate-200 bg-white">
              <div className="flex items-center gap-2.5">
                <span className="w-1 h-4 bg-[#c62828] rounded-full"></span>
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">Course Overview</h2>
                  <p className="text-xs text-slate-500">Monitor course usage, enrollment counts, and active curricula.</p>
                </div>
              </div>
              <Link
                href="/admin/courses"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#c62828] hover:text-[#a20513] transition-colors"
              >
                <span>Manage Courses</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 select-none">
                    <th className="py-3 px-4 font-bold">Course</th>
                    <th className="py-3 px-3 font-bold">Category</th>
                    <th className="py-3 px-3 font-bold text-center">Modules</th>
                    <th className="py-3 px-3 font-bold text-center">Enrolled</th>
                    <th className="py-3 px-3 font-bold text-center">Status</th>
                    <th className="py-3 px-4 font-bold text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {courses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        No courses created yet.
                      </td>
                    </tr>
                  ) : (
                    courses.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 leading-tight">{c.title}</div>
                          <span className="text-[11px] font-mono font-medium text-slate-500 uppercase">
                            {c.course_code || 'JC-GEN-001'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium border border-slate-200">
                            {c.category_name || 'Technical'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center text-slate-700 font-bold">
                          {c.module_count}
                        </td>
                        <td className="py-3.5 px-3 text-center text-slate-900 font-bold">
                          {c.enrolled_count || 0}
                        </td>
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[11px] font-bold uppercase border border-emerald-200">
                            Published
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap text-xs text-slate-500">
                          {new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 bg-slate-50 flex items-center justify-between text-slate-500 text-xs border-t border-slate-200">
              <span>Showing {courses.length} active curricula</span>
              <span className="text-[#16A34A] font-bold">✓ All Curricula Verified</span>
            </div>
          </div>

          {/* Right Column (~35% / 4 Cols): Training Analytics Bar Chart */}
          <div className="lg:col-span-4 bg-white rounded-lg p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Learning Activity
                  </h2>
                  <p className="text-xs text-slate-500">Training minutes • Last 7 Days</p>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-slate-900">
                    {weeklyMinutes} min
                  </span>
                  <span className="block text-[10px] text-slate-400 uppercase font-semibold">
                    Weekly Total
                  </span>
                </div>
              </div>

              {/* Minimal Industrial Bar Chart (Mon - Sun) */}
              <div className="h-44 flex items-end justify-between gap-2 pt-6 pb-2 px-1">
                {trend.map((d, i) => {
                  const pct = Math.max(12, Math.round((d.minutes / maxDailyMinutes) * 100));
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group h-full justify-end">
                      <span className="text-[10px] text-slate-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        {d.minutes}m
                      </span>
                      <div
                        className="w-full bg-[#565e74] rounded-t transition-all group-hover:bg-[#c62828] cursor-pointer"
                        style={{ height: `${pct}%` }}
                        title={`${d.day} (${d.date}): ${d.minutes} min (${d.formatted})`}
                      ></div>
                      <span className="text-[11px] text-slate-500 uppercase font-bold">
                        {d.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#c62828]"></span> Active Training Peak
              </span>
              <span className="font-bold text-slate-800">
                {stats?.formattedWatchTime || `${stats?.videoHours || 0} hrs total`}
              </span>
            </div>
          </div>

        </div>

      </main>

      {/* ── CERTIFICATES MODAL ────────────────────────────────────────── */}
      {certModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 text-[#a20513]">
                <Award className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-sm">Issued Certificates</h3>
              </div>
              <button
                type="button"
                onClick={() => setCertModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-96 overflow-y-auto space-y-3">
              <div className="text-xs text-slate-500 mb-2">
                Certificates earned by <strong className="text-slate-900">{certModal.email}</strong>:
              </div>
              {certModal.loading ? (
                <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#c62828]" />
                  <span className="text-xs font-semibold">Loading certificates...</span>
                </div>
              ) : certModal.certs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No certificates issued yet.</p>
              ) : (
                certModal.certs.map((c) => (
                  <div key={c.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{c.course_title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Issued on {new Date(c.issued_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Link
                      href={`/certificate/${c.id}`}
                      target="_blank"
                      className="px-2.5 py-1 bg-[#c62828] text-white hover:bg-[#a20513] rounded text-xs font-bold transition flex items-center gap-1 shadow-sm"
                    >
                      <span>View</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── WATCH TIME BREAKDOWN MODAL ─────────────────────────────────── */}
      {watchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2 text-[#a20513]">
                  <Clock className="w-5 h-5" />
                  <h3 className="font-bold text-slate-900 text-sm">
                    Employee Training Playback Breakdown
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {watchModal.user.email} • {watchModal.user.department || 'General Operations'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWatchModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5">
              {watchModal.loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-[#c62828]" />
                  <p className="text-xs font-semibold">Loading playback records...</p>
                </div>
              ) : watchModal.watchRecords.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Film className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-medium">No video watch activity recorded yet for this employee.</p>
                </div>
              ) : (
                <>
                  {/* Total Watched Banner */}
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                    <span className="text-xs text-slate-700 font-semibold">Total Verified Training Time:</span>
                    <span className="text-sm font-bold text-[#c62828]">
                      {Math.floor(watchModal.totalWatchedSeconds / 60)} min {watchModal.totalWatchedSeconds % 60} sec
                    </span>
                  </div>

                  {/* Course Breakdown */}
                  {watchModal.enrolledCourses.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                        Assigned Curricula Progress
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {watchModal.enrolledCourses.map((c: any) => {
                          const percent = c.lesson_count > 0 ? Math.round((c.completed_lessons / c.lesson_count) * 100) : 0;
                          return (
                            <div key={c.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                              <p className="font-bold text-slate-900 text-xs truncate">{c.title}</p>
                              <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                                <span>{c.completed_lessons} / {c.lesson_count} lessons</span>
                                <span className="font-bold text-[#c62828]">{percent}%</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
                                <div className="bg-[#c62828] h-1.5 rounded-full" style={{ width: `${percent}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Playback Sessions Table */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                      Detailed Lesson Sessions
                    </h4>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase font-semibold">
                          <tr>
                            <th className="p-3">Lesson / Module</th>
                            <th className="p-3">Course</th>
                            <th className="p-3">Watched</th>
                            <th className="p-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {watchModal.watchRecords.map((rec: any, idx: number) => {
                            const watched = Number(rec.watched_seconds) || 0;
                            const dur = Number(rec.duration_seconds) || 0;
                            const pct = dur > 0 ? Math.min(100, Math.round((watched / dur) * 100)) : 100;
                            const wMin = Math.floor(watched / 60);
                            const wSec = watched % 60;

                            return (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-3">
                                  <p className="font-semibold text-slate-800">{rec.lesson_title}</p>
                                  <p className="text-[10px] text-slate-400">{rec.module_title}</p>
                                </td>
                                <td className="p-3 text-slate-600 max-w-[140px] truncate">
                                  {rec.course_title}
                                </td>
                                <td className="p-3 text-slate-700 font-semibold">
                                  {wMin}m {wSec}s
                                </td>
                                <td className="p-3 text-right">
                                  {rec.is_completed ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                      ✓ Done
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                      {pct}%
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
