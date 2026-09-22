'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  PlayCircle,
  CheckCircle2,
  Clock,
  BookOpen,
  Award,
  Layers,
  ChevronRight,
  ArrowRight,
  Loader2,
  LogOut,
  Shield,
  Gauge,
  Check,
  RotateCcw,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { signout } from '../login/actions';
import { useAppStore } from '@/store/useAppStore';
import LeaderboardCard from '@/components/LeaderboardCard';

// ── Types ─────────────────────────────────────────────────────────────
interface Lesson {
  id: string;
  title: string;
  order_index: number;
  video_url: string | null;
  duration_seconds?: number;
}

interface Module {
  id: string;
  title: string;
  order_index: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url?: string | null;
  has_certificate?: boolean;
  visibility?: 'all' | 'specific';
  categories: { id: string; name: string; slug: string } | null;
  modules: Module[];
  allLessons: Lesson[];
}

interface ProgressRecord {
  lesson_id: string;
  completed_at: string | null;
  is_completed: number | boolean;
  max_watched_time_sec?: number;
}

const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  maintenance: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBDseQD_nFajAkQlyn2dz8Cc3vptceHyo_vENBDA6V2LS1DBoXcI4xQ8XbjkEqybxpYE27IkXWyGSazf3M-JtL8nN1iz9bb9ThUZLvYI51AgAGaNo_zFxjoZqQ8OXJpaHYNeNpx5c8A5d2WFaj8FQFgDt3z2-GQrEYCMI11ROGUkX81c3lsrhS4UvG89KMDkyboQdrmEWYyyZk6c8dG3j9mSRjYN9bCTIp6RvNj7QdGbsInfpZ8-pwE',
  quality: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDS_UaU9mRDR9UKyAYt20UOuIZv15pbWLlo5c4eDLK5pX4GSUwpdJIsu2E9apIelIy757cGEl3Anze-pnk2DSRlH800TJIkgkytF1azIUuYjLAYnZtjCJ0IC6Zuad-bOeaiUIMt8GgNjMUMdjsXmhXX7jjvuDTArNQuQG0HERpUousBZhWvyAyoPIOcofDJ5J8HKLQhQfRGxJppZ5Yzze3RK1JiA_RvJNZSy83nzap8ZqeGYbWQPAWs',
  safety: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDnjXqzDNQrkGeI5Daw6u-56r0wR_DWIu9sNmExX1Xy5eN9B277Va1U8azyhtuwmFinQXLWlmRCuqXU2alvK6X2Y3scjdP9epBRiVNC2LmTEt9UVOD3lETVDNCrpvcUZhM1wLRqHpSIyLn3usWITTmcfM0GbUlqzuS1SgyOSPy0ZxoHnCaKhNb6jnWvnl2EtJurov2JxX34aMbNeKQ1uARpFdsgQ60dIyXo-3V3Mk0rrrcfSJW6CZbL',
  production: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCiH9LHtURVZx2isHpGpg2n4EBO7U_Pp6SB_g_HsfhxaCjvomz7DYS5Sl9eF6lHmturD4l_8EVzp-iO5palsKE9cgFkX3EPDIB4qxbnKDkv2ft-Qg8arWfDSZzEJMcJBms4nqdw_eVKYfm6gWOcnA2puj5IXfiosGqT1q-Km3dcRvet3POrd_PboowU360wGYKSTgo9anOBdM9PrLkzSUUZBbDDwaqVUgNFL1PIh6G47LaSNUYbRXWK',
  mechanical: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDsCTkhoA3PzQvZVyLsSM1jgxKhU3HecYS5UBvBDqSOnufAqJzc7JomxFnVNBkQiSuQzom1k4v-pkRZ94Cq4hjDQoM-RgJsuMPpfvZ4doAqbOtydsdtOBMeuBBlvcQ0M4BV0JYusSs_bPlL75ZU2K21MZ_IkPhhsoTYcDYtE3p-8YvECB2Td9WQe0G_UxLVc1ty9o0DdmtRXhaQzVHLk_FBXWUOZs7xAewM86zRjlyvHVk9FMdPBGcM',
  engineering: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDU8He34NGL4cveMvTzlBF6koVgkxxaaa-XXqWtG-6IY6Oe7Czu1H7iHGj7tZEpP9tVZhuppV1fYmyf9DgUJ7qNFcH3stsszNR79dl9Y5_YbD3V6w-dbfI4vLfB-LPPLpAdO8bsIgY14olV-50BMVT0iXJHca7lAqtVxVJ8KpJ0A1S0u7IMURFYnCMNq-F9rHp6OLIZlGlBd4feGf5uGhZqfiEITOKYNmRMfdkQDSCaiIrpk62siQ3s',
};

function getCourseImage(course: Course): string {
  if (course.thumbnail_url) return course.thumbnail_url;
  const slug = (course.categories?.slug || '').toLowerCase();
  for (const [key, url] of Object.entries(DEFAULT_CATEGORY_IMAGES)) {
    if (slug.includes(key)) return url;
  }
  return DEFAULT_CATEGORY_IMAGES.maintenance;
}

function formatWatchTime(totalSec: number): string {
  if (!totalSec || totalSec <= 0) return '0 min';
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m} min`;
}

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return 'Recently';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) {
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `Today • ${timeStr}`;
  }
  if (diffDays === 1) {
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `Yesterday • ${timeStr}`;
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ── Dashboard Page ────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'inprogress' | 'completed'>('all');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userDept, setUserDept] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [openingCertCourseId, setOpeningCertCourseId] = useState<string | null>(null);
  const [recentProgress, setRecentProgress] = useState<ProgressRecord[]>([]);

  // Safety net: stop spinner after 8s
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(false);
      setDataReady(true);
    }, 8_000);
    return () => clearTimeout(t);
  }, []);

  async function handleSignout() {
    setSigningOut(true);
    clearSession();
    await signout();
  }

  // Zustand app store
  const completedLessons = useAppStore((s) => s.completedLessons);
  const maxWatchedTime = useAppStore((s) => s.maxWatchedTime);
  const getCourseProgress = useAppStore((s) => s.getCourseProgressPercentage);
  const fetchUserData = useAppStore((s) => s.fetchUserData);
  const enrolledCourseIds = useAppStore((s) => s.enrolledCourseIds);
  const clearSession = useAppStore((s) => s.clearSession);
  const courseCertificates = useAppStore((s) => s.courseCertificates);
  const checkAndIssueCertificate = useAppStore((s) => s.checkAndIssueCertificate);

  async function handleOpenCertificate(course: Course) {
    if (courseCertificates[course.id]) {
      router.push(`/certificate/${courseCertificates[course.id]}`);
      return;
    }
    setOpeningCertCourseId(course.id);
    try {
      const res = await checkAndIssueCertificate(course.id);
      if (res?.certificate_id) {
        router.push(`/certificate/${res.certificate_id}`);
      } else {
        alert(res?.reason || 'Certificate is not available for this course yet.');
      }
    } finally {
      setOpeningCertCourseId(null);
    }
  }

  // 1. Check Auth & Load User Data
  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          if (active) router.replace('/login');
          return;
        }
        const data = await res.json();
        const user = data?.user ?? null;
        if (!active) return;
        if (!user) {
          router.replace('/login');
          return;
        }

        setUserEmail(user.email ?? null);
        setUserRole(user.role ?? null);
        setUserDept(user.department ?? null);

        // Fetch user progress and store raw records for activity timeline
        const progRes = await fetch('/api/progress');
        if (progRes.ok) {
          const { progress } = await progRes.json();
          if (active && Array.isArray(progress)) {
            setRecentProgress(progress);
          }
        }

        let success = await fetchUserData();
        if (!success && active) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          if (!active) return;
          await fetchUserData();
        }
      } catch (e) {
        console.error('Dashboard auth check failed', e);
      } finally {
        if (active) setDataReady(true);
      }
    }

    loadData();

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        fetchUserData();
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [fetchUserData, router]);

  // 2. Fetch all course details once enrollment data is ready
  useEffect(() => {
    if (!dataReady) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/courses');
        if (!res.ok) throw new Error('Failed to load courses.');
        const { courses: stubs } = await res.json();

        const detailed: Course[] = await Promise.all(
          (stubs ?? []).map(async (stub: { id: string }) => {
            const r = await fetch(`/api/courses/${stub.id}`);
            if (!r.ok) return { ...stub, modules: [], allLessons: [] };
            const { course } = await r.json();
            const allLessons: Lesson[] = (course.modules ?? []).flatMap(
              (m: Module) => m.lessons ?? []
            );
            return { ...course, allLessons };
          })
        );
        setAllCourses(detailed);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      } finally {
        setLoading(false);
      }
    })();
  }, [dataReady]);

  // 3. User courses list (enrolled or open to user)
  const courses = useMemo(() => {
    return allCourses.filter((c) => enrolledCourseIds.includes(c.id));
  }, [allCourses, enrolledCourseIds]);

  // 4. Compute KPIs and stats
  const allLessonIds = useMemo(() => courses.flatMap((c) => c.allLessons.map((l) => l.id)), [courses]);
  const totalDone = useMemo(() => allLessonIds.filter((id) => completedLessons[id]).length, [allLessonIds, completedLessons]);
  const totalLessons = allLessonIds.length;
  const overallPct = totalLessons ? getCourseProgress(allLessonIds) : 0;

  function coursePct(c: Course) {
    return getCourseProgress(c.allLessons.map((l) => l.id));
  }

  function isCourseStarted(c: Course) {
    const p = coursePct(c);
    return p > 0 || c.allLessons.some((l) => (maxWatchedTime[l.id] || 0) > 0 || completedLessons[l.id]);
  }

  function nextLesson(c: Course): Lesson | undefined {
    return c.allLessons.find((l) => !completedLessons[l.id]);
  }

  // Count metrics
  const completedCoursesCount = useMemo(() => {
    return courses.filter((c) => {
      const p = coursePct(c);
      return (p === 100 && c.allLessons.length > 0) || (c.allLessons.length > 0 && c.allLessons.every((l) => completedLessons[l.id]));
    }).length;
  }, [courses, completedLessons]);

  const inProgressCoursesCount = useMemo(() => {
    return courses.filter((c) => {
      const p = coursePct(c);
      const started = isCourseStarted(c);
      const isDone = (p === 100 && c.allLessons.length > 0) || (c.allLessons.length > 0 && c.allLessons.every((l) => completedLessons[l.id]));
      return started && !isDone;
    }).length;
  }, [courses, completedLessons, maxWatchedTime]);

  // The featured course to resume
  const continueCourse = useMemo(() => {
    // 1st priority: first in-progress course
    const inProg = courses.find((c) => {
      const p = coursePct(c);
      const started = isCourseStarted(c);
      return started && p < 100;
    });
    if (inProg) return inProg;
    // Fallback: most recently completed course or first enrolled course
    return courses[0] || null;
  }, [courses, completedLessons, maxWatchedTime]);

  // Tab filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const p = coursePct(c);
      const started = isCourseStarted(c);
      const isDone = (p === 100 && c.allLessons.length > 0) || (c.allLessons.length > 0 && c.allLessons.every((l) => completedLessons[l.id]));
      if (tab === 'inprogress') return started && !isDone;
      if (tab === 'completed') return isDone;
      return true;
    });
  }, [courses, tab, completedLessons, maxWatchedTime]);

  // Total learning watch time
  const totalWatchedSeconds = useMemo(() => {
    return Object.values(maxWatchedTime).reduce((sum, s) => sum + (s || 0), 0);
  }, [maxWatchedTime]);

  // Recent timeline activities mapping
  const recentActivities = useMemo(() => {
    interface ActivityItem {
      type: 'completed' | 'started';
      time: string;
      title: string;
      courseTitle: string;
    }

    const lessonMap: Record<string, { lesson: Lesson; course: Course }> = {};
    allCourses.forEach((c) => {
      c.allLessons.forEach((l) => {
        lessonMap[l.id] = { lesson: l, course: c };
      });
    });

    const items: ActivityItem[] = recentProgress
      .filter((p) => (p.is_completed || p.completed_at) && lessonMap[p.lesson_id])
      .sort((a, b) => new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime())
      .slice(0, 4)
      .map((p) => {
        const item = lessonMap[p.lesson_id];
        return {
          type: 'completed',
          time: formatRelativeTime(p.completed_at),
          title: `Completed Module: ${item.lesson.title}`,
          courseTitle: item.course.title,
        };
      });

    // If fewer than 2 completed, add enrolled course "started" events
    if (items.length < 3 && courses.length > 0) {
      courses.slice(0, 2).forEach((c) => {
        items.push({
          type: 'started',
          time: 'Enrolled',
          title: `Started Course: ${c.title}`,
          courseTitle: 'Enrolled in technical training program',
        });
      });
    }

    return items;
  }, [recentProgress, allCourses, courses]);

  // Formatted display name
  const employeeName = useMemo(() => {
    if (!userEmail) return 'Employee';
    const userPart = userEmail.split('@')[0];
    return userPart
      .split(/[._-]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }, [userEmail]);

  const userInitials = useMemo(() => {
    if (!userEmail) return 'U';
    const parts = userEmail.split('@')[0].split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return userEmail.slice(0, 2).toUpperCase();
  }, [userEmail]);

  // ── Loading Skeleton ──────────────────────────────────────────────
  if (loading || !dataReady) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-9 h-9 text-[#a20513] animate-spin" />
        <p className="text-sm font-semibold text-[#64748B]">Loading your training dashboard…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col font-sans text-[#191c1e] antialiased">
      {/* ── Top Header Navigation Bar ──────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#E2E8F0] shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-[68px] max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between">
          {/* Logo & Brand Identity */}
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src="/jolly-clamps-logo.png"
              alt="Jolly Clamps"
              className="h-9 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col border-l border-[#E2E8F0] pl-3">
              <span className="font-semibold text-[11px] tracking-wider uppercase text-[#64748B]">
                Technical Training LMS
              </span>
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                PRECISION ENGINEERING
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-2">
            <Link
              href="/dashboard"
              aria-current="page"
              className="px-4 py-2 bg-[#f2f4f6] text-[#a20513] font-bold text-sm rounded-lg border-b-2 border-[#a20513] transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/"
              className="px-4 py-2 text-sm font-semibold text-[#565e74] hover:text-[#191c1e] hover:bg-[#eceef0] rounded-lg transition-colors"
            >
              All Courses
            </Link>
            <a
              href="#my-learning-section"
              className="px-4 py-2 text-sm font-semibold text-[#565e74] hover:text-[#191c1e] hover:bg-[#eceef0] rounded-lg transition-colors"
            >
              My Learning
            </a>
          </nav>

          {/* Right Action Controls: Admin, User Profile, Sign Out */}
          <div className="flex items-center gap-3">
            {userRole === 'admin' && (
              <Link
                href="/admin"
                className="px-3 py-1.5 text-xs font-semibold text-[#191c1e] hover:bg-[#eceef0] transition-colors flex items-center gap-1.5 border border-[#E2E8F0] rounded-lg shadow-sm bg-white"
              >
                <Shield className="w-3.5 h-3.5 text-[#a20513]" />
                <span>Admin Panel</span>
              </Link>
            )}

            {userEmail ? (
              <div className="flex items-center gap-2.5 pl-1 sm:pl-2">
                <div className="relative flex items-center justify-center">
                  <div className="w-9 h-9 rounded-full bg-[#eceef0] border border-[#CBD5E1] text-[#0F172A] flex items-center justify-center font-bold text-xs shadow-sm">
                    {userInitials}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#16A34A] ring-2 ring-white" />
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-bold text-[#0F172A] truncate max-w-[120px]">
                    {employeeName}
                  </span>
                  <span className="text-[10px] text-[#64748B] capitalize">
                    {userDept || userRole || 'Operator'}
                  </span>
                </div>
                <button
                  onClick={handleSignout}
                  disabled={signingOut}
                  title="Sign Out"
                  className="p-1.5 text-[#64748B] hover:text-[#a20513] hover:bg-red-50 rounded-lg transition-colors border-0 bg-transparent cursor-pointer ml-1"
                >
                  {signingOut ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#a20513]" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#a20513] hover:bg-[#85040f] rounded-lg shadow-sm transition-all"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content Body ──────────────────────────────────────── */}
      <main className="w-full pt-[88px] pb-16 flex-1 bg-[#f7f9fb]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex flex-col gap-8">

          {/* ── 1. Welcome Row ─────────────────────────────────────── */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
                Welcome Back, {employeeName}
              </h1>
              <p className="text-sm sm:text-base text-[#64748B]">
                Track your technical training progress and continue building your engineering skills.
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => window.location.reload()}
                className="text-xs font-bold underline hover:text-red-900"
              >
                Retry
              </button>
            </div>
          )}

          {/* ── 2. Top Learning Summary: 4-Column KPI Cards ────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Courses Completed */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-[#16A34A] transition-colors">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#16A34A]" />
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#64748B]">
                  Courses Completed
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#DCFCE7] border border-[#BBF7D0] flex items-center justify-center text-[#166534]">
                  <Check className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[#0F172A] leading-none font-mono">
                  {String(completedCoursesCount).padStart(2, '0')}
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-3 pt-2.5 border-t border-[#E2E8F0]">
                Completed training
              </p>
            </div>

            {/* Card 2: In Progress */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-[#CBD5E1] transition-colors">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#CBD5E1]" />
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#64748B]">
                  In Progress
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center text-[#64748B]">
                  <PlayCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[#0F172A] leading-none font-mono">
                  {String(inProgressCoursesCount).padStart(2, '0')}
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-3 pt-2.5 border-t border-[#E2E8F0]">
                Active courses
              </p>
            </div>

            {/* Card 3: Modules Completed */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-[#CBD5E1] transition-colors">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#CBD5E1]" />
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#64748B]">
                  Modules Completed
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center text-[#64748B]">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[#0F172A] leading-none font-mono">
                  {totalDone} / {totalLessons}
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-3 pt-2.5 border-t border-[#E2E8F0]">
                Learning modules
              </p>
            </div>

            {/* Card 4: Overall Progress */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-[#a20513] transition-colors">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#a20513]" />
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#64748B]">
                  Overall Progress
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#FEE2E2] border border-[#FECACA] flex items-center justify-center text-[#a20513]">
                  <Gauge className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[#0F172A] leading-none font-mono">
                  {overallPct}%
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-3 pt-2.5 border-t border-[#E2E8F0]">
                Across your courses
              </p>
            </div>
          </div>

          {/* ── 3. Continue Learning Feature Section ────────────────── */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <h2 className="text-xl font-bold text-[#0F172A]">Continue Learning</h2>
                <p className="text-xs text-[#64748B]">
                  Current training status and next recommended steps.
                </p>
              </div>
            </div>

            {/* Status Strip: "You're all caught up" when no course is in progress */}
            {inProgressCoursesCount === 0 && courses.length > 0 && (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#DCFCE7] border border-[#BBF7D0] flex items-center justify-center text-[#166534] flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#0F172A]">You&apos;re all caught up</p>
                    <p className="text-xs text-[#64748B]">You have no courses currently in progress.</p>
                  </div>
                </div>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-white text-[#0F172A] font-bold text-xs hover:bg-[#F1F5F9] transition-colors border border-[#CBD5E1] text-center flex-shrink-0"
                >
                  <BookOpen className="w-4 h-4 text-[#64748B]" />
                  <span>Explore All Courses</span>
                </Link>
              </div>
            )}

            {/* Featured Course Card */}
            {continueCourse && (() => {
              const pct = coursePct(continueCourse);
              const next = nextLesson(continueCourse);
              const isDone = (pct === 100 && continueCourse.allLessons.length > 0) || (continueCourse.allLessons.length > 0 && continueCourse.allLessons.every((l) => completedLessons[l.id]));
              const imageUrl = getCourseImage(continueCourse);
              const doneCount = continueCourse.allLessons.filter((l) => completedLessons[l.id]).length;

              return (
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 lg:p-6 shadow-sm relative overflow-hidden">
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${
                      isDone ? 'bg-[#16A34A]' : 'bg-[#a20513]'
                    }`}
                  />
                  <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                    {/* Thumbnail banner */}
                    <div className="relative w-full lg:w-72 h-44 rounded-lg overflow-hidden border border-[#E2E8F0] bg-slate-100 flex-shrink-0">
                      <img
                        src={imageUrl}
                        alt={continueCourse.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute bottom-2.5 right-2.5">
                        <span
                          className={`px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider rounded font-bold flex items-center gap-1 text-white shadow-sm ${
                            isDone ? 'bg-[#16A34A]' : 'bg-[#a20513]'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {isDone ? '✓ Completed • 100%' : `In Progress • ${pct}%`}
                        </span>
                      </div>
                    </div>

                    {/* Course details */}
                    <div className="flex-1 flex flex-col justify-between h-full space-y-3">
                      <div>
                        <span className="font-mono text-[11px] uppercase tracking-wider text-[#64748B] font-bold">
                          {continueCourse.categories?.name || 'Technical Training'}
                        </span>
                        <h3 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight mt-1 mb-2">
                          {continueCourse.title}
                        </h3>
                        {continueCourse.description && (
                          <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed line-clamp-2 max-w-3xl mb-3">
                            {continueCourse.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-[#64748B] text-xs">
                          <span className="inline-flex items-center gap-1.5 bg-[#F1F5F9] px-2.5 py-1 rounded border border-[#E2E8F0]">
                            <Layers className="w-3.5 h-3.5 text-[#0F172A]" />
                            {doneCount} / {continueCourse.allLessons.length} Modules
                          </span>
                          <span className="inline-flex items-center gap-1.5 bg-[#F1F5F9] px-2.5 py-1 rounded border border-[#E2E8F0]">
                            <Clock className="w-3.5 h-3.5 text-[#0F172A]" />
                            {continueCourse.allLessons.length > 0 ? `${continueCourse.allLessons.length * 15} min` : '45 min'}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 font-bold ${
                              isDone ? 'text-[#16A34A]' : 'text-[#a20513]'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {isDone ? 'Completed (100%)' : `In Progress (${pct}%)`}
                          </span>
                        </div>
                      </div>

                      {next && !isDone && (
                        <p className="text-xs text-[#64748B]">
                          Next up: <span className="font-bold text-[#a20513]">{next.title}</span>
                        </p>
                      )}
                    </div>

                    {/* Action button */}
                    <div className="w-full lg:w-56 flex-shrink-0 flex flex-col gap-2.5 pt-4 lg:pt-0 lg:border-l lg:border-[#E2E8F0] lg:pl-6 justify-center">
                      <Link
                        href={`/course/${continueCourse.id}`}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#a20513] text-white font-bold text-xs sm:text-sm hover:bg-[#85040f] transition-colors shadow-sm text-center"
                      >
                        <span>{isDone ? 'Review Course' : 'Continue Learning'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })()}
          </section>

          {/* ── 4. Two-Column Section: My Learning & Learning Progress ── */}
          <div id="my-learning-section" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: My Learning Course List (8 Cols) */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
                <div>
                  <h2 className="text-xl font-bold text-[#0F172A]">My Learning</h2>
                  <p className="text-xs text-[#64748B]">All courses assigned and completed.</p>
                </div>
                {/* Filter Pills */}
                <div className="inline-flex p-1 bg-[#eceef0] rounded-lg border border-[#E2E8F0]">
                  {(['all', 'inprogress', 'completed'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                        tab === t
                          ? 'bg-white text-[#0F172A] shadow-sm'
                          : 'text-[#64748B] hover:text-[#0F172A]'
                      }`}
                    >
                      {t === 'all' ? 'All' : t === 'inprogress' ? 'In Progress' : 'Completed'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Course Items */}
              <div className="flex flex-col gap-3">
                {filteredCourses.map((course) => {
                  const p = coursePct(course);
                  const isDone = (p === 100 && course.allLessons.length > 0) || (course.allLessons.length > 0 && course.allLessons.every((l) => completedLessons[l.id]));
                  const isStarted = isCourseStarted(course);
                  const doneCount = course.allLessons.filter((l) => completedLessons[l.id]).length;
                  const imageUrl = getCourseImage(course);

                  return (
                    <div
                      key={course.id}
                      className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm hover:border-[#a20513] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-slate-100 border border-[#E2E8F0] flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={course.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <PlayCircle className="w-6 h-6 text-[#a20513]" />
                          )}
                        </div>

                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-[#64748B] uppercase">
                              {course.categories?.name || 'Technical'}
                            </span>
                            {isDone ? (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534] font-mono font-bold">
                                ✓ Completed (100%)
                              </span>
                            ) : isStarted ? (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-amber-50 border border-amber-200 text-amber-800 font-mono font-bold">
                                In Progress ({p}%)
                              </span>
                            ) : null}
                          </div>

                          <h4 className="text-base font-bold text-[#0F172A] mt-1 group-hover:text-[#a20513] transition-colors">
                            {course.title}
                          </h4>

                          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-[#64748B]">
                            <span>{doneCount} / {course.allLessons.length} Modules</span>
                            <span>•</span>
                            <span>{course.allLessons.length > 0 ? `${course.allLessons.length * 15} min` : '45 min'}</span>
                            <span>•</span>
                            <span>Last accessed: Today</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto justify-between sm:justify-center border-t sm:border-t-0 border-[#E2E8F0] pt-3 sm:pt-0">
                        {isDone && (course.has_certificate ?? true) && (
                          <button
                            type="button"
                            onClick={() => handleOpenCertificate(course)}
                            disabled={openingCertCourseId === course.id}
                            className="px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>{openingCertCourseId === course.id ? 'Loading...' : 'Certificate'}</span>
                          </button>
                        )}
                        <Link
                          href={`/course/${course.id}`}
                          className="px-3.5 py-1.5 rounded-lg border border-[#CBD5E1] text-[#0F172A] text-xs font-bold hover:bg-[#F1F5F9] transition-colors inline-flex items-center gap-1"
                        >
                          <span>{isDone ? 'Review Course' : isStarted ? 'Continue' : 'Start'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}

                {filteredCourses.length === 0 && (
                  <div className="bg-white border border-dashed border-[#E2E8F0] rounded-xl p-8 text-center text-[#64748B]">
                    <p className="text-sm font-semibold">No courses found in this tab.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Learning Progress Breakdown (4 Cols) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="border-b border-[#E2E8F0] pb-3">
                <h2 className="text-xl font-bold text-[#0F172A]">Learning Progress</h2>
                <p className="text-xs text-[#64748B]">Overview of your technical learning record.</p>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm flex flex-col gap-5">
                {/* Circular Progress Gauge */}
                <div className="flex items-center gap-4 pb-4 border-b border-[#E2E8F0]">
                  <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-[#E2E8F0]"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                      />
                      <path
                        className="text-[#a20513] transition-all duration-700 ease-out"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeDasharray={`${overallPct}, 100`}
                        strokeLinecap="round"
                        strokeWidth="3.5"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-base font-extrabold text-[#0F172A] leading-none font-mono">
                        {overallPct}%
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#0F172A]">Overall Completion</span>
                    <span className="font-mono text-xs text-[#16A34A] font-bold">
                      {overallPct === 100 ? 'All requirements met' : `${overallPct}% completed`}
                    </span>
                  </div>
                </div>

                {/* Progress breakdown items */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#64748B] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                      Courses Completed
                    </span>
                    <span className="font-mono font-bold text-[#0F172A]">{completedCoursesCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#64748B] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#CBD5E1]" />
                      In Progress
                    </span>
                    <span className="font-mono font-bold text-[#0F172A]">{inProgressCoursesCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#64748B] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#CBD5E1]" />
                      Modules Completed
                    </span>
                    <span className="font-mono font-bold text-[#0F172A]">{totalDone} / {totalLessons}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-3 border-t border-[#E2E8F0]">
                    <span className="text-[#64748B]">Learning Time</span>
                    <span className="font-mono font-bold text-[#0F172A]">
                      {formatWatchTime(totalWatchedSeconds)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── 5. Recent Learning Activity Timeline ─────────────────── */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <h2 className="text-xl font-bold text-[#0F172A]">Recent Learning Activity</h2>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
              {recentActivities.length === 0 ? (
                <p className="text-xs text-[#64748B] text-center py-4">
                  Your recent learning milestones will appear here as you complete lessons.
                </p>
              ) : (
                <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-[#E2E8F0]">
                  {recentActivities.map((act, i) => (
                    <div
                      key={i}
                      className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div
                        className={`absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white ${
                          act.type === 'completed' ? 'bg-[#16A34A]' : 'bg-[#a20513]'
                        }`}
                      />
                      <div className="flex flex-col">
                        <span className="font-mono text-[11px] text-[#64748B] uppercase font-semibold">
                          {act.time}
                        </span>
                        <span className="text-sm font-bold text-[#0F172A] mt-0.5">
                          {act.title}
                        </span>
                        <span className="text-xs text-[#64748B]">{act.courseTitle}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold uppercase ${
                            act.type === 'completed'
                              ? 'bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534]'
                              : 'bg-[#F1F5F9] border border-[#CBD5E1] text-[#64748B]'
                          }`}
                        >
                          {act.type === 'completed' ? 'Completed' : 'Started'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ── 6. Factory Leadership Achievement Board ─────────────── */}
          <section>
            <LeaderboardCard title="Leadership Board — Top Factory Achievers" />
          </section>

        </div>
      </main>

      {/* ── Industrial Footer ───────────────────────────────────────── */}
      <footer className="w-full bg-white border-t border-[#E2E8F0] py-5 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left text-[#64748B]">
          <p className="font-mono text-xs tracking-wider uppercase font-bold text-[#0F172A]">
            JOLLY CLAMPS PVT. LTD. • TECHNICAL TRAINING LMS
          </p>
          <p className="text-xs text-[#64748B]">
            © {new Date().getFullYear()} Jolly Clamps Pvt. Ltd. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
