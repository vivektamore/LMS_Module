'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BookOpen, Users, Clock, TrendingUp, ArrowLeft, 
  PlayCircle, UserCheck, Activity, Search, RefreshCw, Loader2, Award, X
} from 'lucide-react';

interface Stats {
  totalCourses: number;
  activeSignIns: number;
  videoHours: number;
  totalSeconds: number;
  formattedWatchTime: string;
  totalEnrollments: number;
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
  role: string;
  department: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  enrolledCoursesCount: number;
  completedLessonsCount: number;
  certificatesCount: number;
  watchedSeconds: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [trend, setTrend] = useState<TrendDay[]>([]);
  const [users, setUsers] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Certificate modal state
  const [certModal, setCertModal] = useState<{
    userId: string;
    email: string;
    certs: { id: string; course_title: string; issued_at: string }[];
    loading: boolean;
  } | null>(null);

  async function fetchAnalytics(isSilent = false) {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const res = await fetch('/api/admin/analytics');
      if (!res.ok) {
        if (res.status === 403) throw new Error('Forbidden: Admin access required.');
        throw new Error('Failed to fetch admin analytics data.');
      }
      const data = await res.json();
      setStats(data.stats);
      setTrend(data.trend);
      setUsers(data.users);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function openCertModal(user: UserProgress) {
    setCertModal({ userId: user.id, email: user.email, certs: [], loading: true });
    try {
      const res = await fetch(`/api/admin/user-certificates?user_id=${user.id}`);
      const data = await res.json();
      setCertModal(prev => prev ? { ...prev, certs: data.certificates || [], loading: false } : null);
    } catch {
      setCertModal(prev => prev ? { ...prev, certs: [], loading: false } : null);
    }
  }

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function formatRelativeTime(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  // Bespoke SVG Trend Chart coordinates computation
  const chartWidth = 500;
  const chartHeight = 220;
  const paddingX = 40;
  const paddingY = 30;

  // Determine whether to scale chart by minutes (if under 1 hour) or hours
  const maxSec = Math.max(...trend.map((d) => d.seconds || 0), 0);
  const useMinutesScale = maxSec < 3600;
  const maxVal = useMinutesScale
    ? Math.max(...trend.map((d) => d.minutes || 0), 5)
    : Math.max(...trend.map((d) => d.hours || 0), 1);

  const points = trend.map((d, i) => {
    const val = useMinutesScale ? (d.minutes || 0) : (d.hours || 0);
    const x = paddingX + (i * (chartWidth - 2 * paddingX)) / Math.max(trend.length - 1, 1);
    const y = chartHeight - paddingY - (val / maxVal) * (chartHeight - 2 * paddingY);
    return { x, y, day: d.day, hours: d.hours, minutes: d.minutes, formatted: d.formatted };
  });

  // SVG curved path formula (smooth quadratic bezier approximation)
  let linePath = '';
  let areaPath = '';
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      linePath += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
    }
    linePath += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
    
    // Closed path for area gradient under line
    areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          <p className="text-sm font-semibold">Loading Live Admin Analytics…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link href="/dashboard" className="text-gray-500 hover:text-indigo-600 flex items-center text-sm font-medium transition">
              <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
            </Link>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Admin Portal</h1>
          <p className="text-gray-500 text-sm mt-0.5">Real-time learning stats, active user sessions, and training progress metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="flex items-center justify-center p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition text-gray-600 hover:text-indigo-600 disabled:opacity-50"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/admin/courses"
            className="flex items-center px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100"
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            Manage Courses
          </Link>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl shadow-sm leading-relaxed">
          ⚠️ <strong>Error loading admin portal:</strong> {error}
        </div>
      )}

      {/* Stat Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {[
            {
              label: 'Total Courses',
              value: stats.totalCourses,
              change: 'Live from catalog',
              icon: BookOpen,
              color: 'bg-indigo-50 text-indigo-600',
              border: 'border-indigo-100',
            },
            {
              label: 'Active Sign-ins (7d)',
              value: stats.activeSignIns,
              change: 'Unique active users',
              icon: UserCheck,
              color: 'bg-emerald-50 text-emerald-600',
              border: 'border-emerald-100',
            },
            {
              label: 'Total Watch Time',
              value: stats.formattedWatchTime || `${stats.videoHours} hrs`,
              change: stats.videoHours > 0 ? `${stats.videoHours} total hours` : 'Live aggregate training time',
              icon: Clock,
              color: 'bg-violet-50 text-violet-600',
              border: 'border-violet-100',
            },
            {
              label: 'Total Enrollments',
              value: stats.totalEnrollments,
              change: 'Course registrations',
              icon: Users,
              color: 'bg-amber-50 text-amber-600',
              border: 'border-amber-100',
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`bg-white rounded-2xl border ${stat.border} p-6 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${stat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Live
                  </span>
                </div>
                <p className="text-3xl font-extrabold text-gray-900 tracking-tight mb-1">{stat.value}</p>
                <p className="text-sm font-semibold text-gray-500">{stat.label}</p>
                <p className="text-xs text-gray-400 mt-1">{stat.change}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Middle Grid: Trend Chart & Quick Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Trend Chart (Bespoke SVG) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-gray-800 text-lg">Daily Watch Activity</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {useMinutesScale 
                  ? 'Minutes of training videos watched daily over the last 7 days' 
                  : 'Hours of training videos watched daily over the last 7 days'}
              </p>
            </div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
              Last 7 Days
            </span>
          </div>

          <div className="relative w-full aspect-[5/2.2] select-none">
            {/* SVG Graph */}
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
              <defs>
                {/* Gradients */}
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.00" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {Array.from({ length: 4 }).map((_, idx) => {
                const y = paddingY + (idx * (chartHeight - 2 * paddingY)) / 3;
                return (
                  <line
                    key={idx}
                    x1={paddingX}
                    y1={y}
                    x2={chartWidth - paddingX}
                    y2={y}
                    stroke="#f1f5f9"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                );
              })}

              {/* Area Under Curve */}
              {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}

              {/* Vector Line */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="url(#lineGrad)"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive Data Dots */}
              {points.map((p, idx) => (
                <g key={p.day}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={hoveredIndex === idx ? 8 : 4}
                    fill={hoveredIndex === idx ? '#4f46e5' : '#ffffff'}
                    stroke={hoveredIndex === idx ? '#ffffff' : '#4f46e5'}
                    strokeWidth={hoveredIndex === idx ? 2 : 2.5}
                    className="transition-all duration-150 cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                  {/* Axis Day Labels */}
                  <text
                    x={p.x}
                    y={chartHeight - 10}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize={11}
                    fontWeight={600}
                  >
                    {p.day}
                  </text>
                </g>
              ))}
            </svg>

            {/* Float Tooltip */}
            {hoveredIndex !== null && points[hoveredIndex] && (
              <div 
                className="absolute bg-gray-900 text-white rounded-lg px-3 py-1.5 shadow-xl text-xs font-bold pointer-events-none transition-all duration-150 border border-gray-800"
                style={{
                  left: `${(points[hoveredIndex].x / chartWidth) * 100}%`,
                  top: `${(points[hoveredIndex].y / chartHeight) * 100 - 18}%`,
                  transform: 'translate(-50%, -100%)'
                }}
              >
                {points[hoveredIndex].formatted} watched
              </div>
            )}
          </div>
        </div>

        {/* Quick System Feed */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-indigo-500" />
              <h2 className="font-bold text-gray-800 text-lg">System Insights</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">Active Class size</p>
                <p className="text-sm font-medium text-gray-800">
                  You have <span className="font-bold text-indigo-700">{users.length} registered accounts</span>. Keep training mandatory safety courses.
                </p>
              </div>
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">Learning Momentum</p>
                <p className="text-sm font-medium text-gray-800">
                  Accumulated <span className="font-bold text-emerald-700">{stats?.formattedWatchTime || `${stats?.videoHours || 0} hrs`}</span> across the factory floor.
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4 mt-4 flex items-center justify-between text-xs text-gray-400 font-semibold">
            <span>MySQL Database Active</span>
            <span className="flex items-center text-emerald-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5" /> Online
            </span>
          </div>
        </div>

      </div>

      {/* Users Progress Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-bold text-gray-800 text-lg">User Directory & Enrollment Progress</h2>
            <p className="text-xs text-gray-400 mt-0.5">List of all registered students, their active status, and completion progress.</p>
          </div>
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search users by email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm placeholder-gray-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4">Last Sign-in</th>
                <th className="px-6 py-4">Enrolled</th>
                <th className="px-6 py-4">Watch Time</th>
                <th className="px-6 py-4">Certificates</th>
                <th className="px-6 py-4 text-right">Lessons Done</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition">
                  {/* User Email & Details */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm uppercase shrink-0">
                        {user.email[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{user.email}</p>
                        <p className="text-xs text-gray-400 truncate">ID: {user.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  {/* Role Badge */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      user.role === 'admin' 
                        ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                        : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  {/* Department Badge */}
                  <td className="px-6 py-4">
                    {user.department ? (
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        {user.department.replace(/_/g, ' ')}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">—</span>
                    )}
                  </td>
                  {/* Joined Date */}
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  {/* Last Sign-in */}
                  <td className="px-6 py-4 text-gray-600 font-medium">
                    {formatRelativeTime(user.last_sign_in_at)}
                  </td>
                  {/* Enrolled Courses count */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{user.enrolledCoursesCount}</span>
                      <span className="text-gray-400">courses</span>
                    </div>
                  </td>
                  {/* Watch Time */}
                  <td className="px-6 py-4">
                    {(() => {
                      const sec = user.watchedSeconds || 0;
                      const h = Math.floor(sec / 3600);
                      const m = Math.floor((sec % 3600) / 60);
                      const s = sec % 60;
                      if (h > 0)  return <span className="font-semibold text-violet-700">{h}h {m}m</span>;
                      if (m > 0)  return <span className="font-semibold text-violet-600">{m}m {s}s</span>;
                      if (s > 0)  return <span className="font-semibold text-violet-500">{s}s</span>;
                      return <span className="text-gray-300 text-xs">—</span>;
                    })()}
                  </td>
                  {/* Completed certificates */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        (user.certificatesCount || 0) > 0 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {user.certificatesCount || 0} earned
                      </span>
                      <button
                        onClick={() => openCertModal(user)}
                        className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-2.5 py-1 rounded-lg transition"
                      >
                        <Award className="w-3.5 h-3.5" />
                        View
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <span className="font-bold text-emerald-600">{user.completedLessonsCount}</span>
                      <span className="text-gray-400 text-xs font-medium uppercase">completed</span>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-gray-400">
                    No users found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Certificate Modal ── */}
      {certModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-500" /> Certificates
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{certModal.email}</p>
              </div>
              <button
                onClick={() => setCertModal(null)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 max-h-80 overflow-y-auto">
              {certModal.loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
              ) : certModal.certs.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No certificates earned yet.</p>
              ) : (
                <ul className="space-y-3">
                  {certModal.certs.map((cert) => (
                    <li key={cert.id} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{cert.course_title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Issued {new Date(cert.issued_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <a
                        href={`/certificate/${cert.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition"
                      >
                        🖨️ Print
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
