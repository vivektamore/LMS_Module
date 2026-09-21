'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  PlayCircle, CheckCircle, Clock, BookOpen,
  Award, Flame, ChevronRight, BarChart2,
  Bell, TrendingUp, ArrowRight, Loader2, LogOut, X,
} from 'lucide-react';
import { signout } from '../login/actions';
import { useAppStore } from '@/store/useAppStore';

// ── Types ─────────────────────────────────────────────────────────────
interface Lesson {
  id: string;
  title: string;
  order_index: number;
  video_url: string | null;
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
  // derived
  allLessons: Lesson[];
}

const CATEGORY_COLOUR: Record<string, string> = {
  hydraulics: '#0284c7', pneumatics: '#0d9488',
  plc: '#4f46e5', sop: '#dc2626',
};
const CATEGORY_BG: Record<string, string> = {
  hydraulics: '#e0f2fe', pneumatics: '#ccfbf1',
  plc: '#eef2ff', sop: '#fee2e2',
};
function colour(slug?: string) { return CATEGORY_COLOUR[slug ?? ''] ?? '#4f46e5'; }
function bg(slug?: string) { return CATEGORY_BG[slug ?? ''] ?? '#eef2ff'; }

// ── Component ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'inprogress' | 'completed'>('all');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [openingCertCourseId, setOpeningCertCourseId] = useState<string | null>(null);
  // Safety net: if loading is still true after 10s, force-stop to avoid permanent spinner
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(false);
      setDataReady(true);
    }, 10_000);
    return () => clearTimeout(t);
  }, []);

  async function handleSignout() {
    setSigningOut(true);
    clearSession();
    await signout();
  }

  // Zustand
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

  // 1. Fetch backend progress & enrollments first, and get the user email.
  //    Also re-fetch whenever the tab becomes visible again (e.g. returning
  //    from the course page after marking a lesson complete).
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

        // Try fetching user data; retry once if it returns 401 (cookie sync delay)
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

    // Re-fetch silently when the user returns to this browser tab
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // 3. Filter to only enrolled courses
  const courses = allCourses.filter((c) => enrolledCourseIds.includes(c.id));

  // ── Derived stats ─────────────────────────────────────────────────
  const allLessonIds = courses.flatMap((c) => c.allLessons.map((l) => l.id));
  const totalDone = allLessonIds.filter((id) => completedLessons[id]).length;
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
    // find the first uncompleted lesson
    return c.allLessons.find((l) => !completedLessons[l.id]);
  }

  // The "continue" course — first in-progress one
  const continueCourse = courses.find((c) => {
    const p = coursePct(c);
    const started = isCourseStarted(c);
    return started && p < 100;
  });

  // Tab filter
  const filtered = courses.filter((c) => {
    const p = coursePct(c);
    const started = isCourseStarted(c);
    const isDone = (p === 100 && c.allLessons.length > 0) || (c.allLessons.length > 0 && c.allLessons.every((l) => completedLessons[l.id]));
    if (tab === 'inprogress') return started && !isDone;
    if (tab === 'completed') return isDone;
    return true;
  });

  // ── Loading ───────────────────────────────────────────────────────
  if (loading || !dataReady) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Loader2 size={36} color="#4f46e5" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#64748b', fontSize: 14, fontWeight: 500 }}>Loading your dashboard…</p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── No Enrollments ────────────────────────────────────────────────
  if (!loading && courses.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <div style={{ background: '#eef2ff', borderRadius: '50%', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookOpen size={32} color="#4f46e5" />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>No Courses Yet</h2>
        <p style={{ color: '#64748b', fontSize: 15, margin: 0, textAlign: 'center', maxWidth: 360 }}>
          You haven't enrolled in any courses yet. Browse the catalog and enroll to get started!
        </p>
        <Link
          href="/"
          style={{ display: 'inline-block', background: '#4f46e5', color: '#fff', padding: '10px 24px', borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}
        >
          Browse All Courses →
        </Link>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}>

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <header style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={16} color="white" />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Technical Training</span>
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link href="/" style={{ padding: '6px 14px', fontSize: 14, color: '#64748b', textDecoration: 'none', borderRadius: 8, fontWeight: 500 }}>
              All Courses
            </Link>
            <span style={{ padding: '6px 14px', fontSize: 14, color: '#4f46e5', background: '#eef2ff', borderRadius: 8, fontWeight: 600 }}>
              My Dashboard
            </span>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* User Email */}
            {userEmail && (
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500, display: 'none' }} className="sm-show">
                {userEmail}
              </span>
            )}
            {/* User Avatar */}
            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
              {userEmail ? userEmail[0].toUpperCase() : 'U'}
            </div>
            {/* Sign Out Button */}
            <button
              onClick={handleSignout}
              disabled={signingOut}
              title="Sign Out"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: signingOut ? '#f1f5f9' : '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 10, padding: '7px 14px',
                color: signingOut ? '#94a3b8' : '#ef4444',
                cursor: signingOut ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
              }}
            >
              {signingOut
                ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                : <LogOut size={14} />
              }
              <span>{signingOut ? 'Signing out…' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── BODY ───────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

        {/* Error */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px 20px', marginBottom: 24, color: '#dc2626', fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* ── Welcome + Stats ────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 32, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#1e293b' }}>My Learning Dashboard 👋</h1>
            <p style={{ margin: '6px 0 0', fontSize: 15, color: '#64748b' }}>
              Track your progress across all courses.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Overall Progress', value: `${overallPct}%`, icon: BarChart2, iconColor: '#4f46e5', iconBg: '#eef2ff' },
              { label: 'Lessons Done', value: `${totalDone}/${totalLessons}`, icon: CheckCircle, iconColor: '#059669', iconBg: '#d1fae5' },
              { label: 'Streak', value: '—', icon: Flame, iconColor: '#d97706', iconBg: '#fef3c7' },
              { label: 'Certificates', value: courses.filter(c => coursePct(c) === 100 && c.allLessons.length > 0).length.toString(), icon: Award, iconColor: '#7c3aed', iconBg: '#ede9fe' },
            ].map((s) => (
              <div key={s.label} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <s.icon size={17} color={s.iconColor} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>{s.value}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Continue Learning Banner ──────────────────────────── */}
        {continueCourse && (() => {
          const next = nextLesson(continueCourse);
          const pct = coursePct(continueCourse);
          const slug = continueCourse.categories?.slug;
          return (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 24, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', flexWrap: 'wrap' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: bg(slug), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <TrendingUp size={24} color={colour(slug)} />
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Continue Learning</p>
                <p style={{ margin: '3px 0 2px', fontSize: 17, fontWeight: 700, color: '#1e293b' }}>{continueCourse.title}</p>
                {next && (
                  <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                    Next up: <span style={{ color: colour(slug), fontWeight: 600 }}>{next.title}</span>
                  </p>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{continueCourse.allLessons.filter(l => completedLessons[l.id]).length}/{continueCourse.allLessons.length} lessons</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: colour(slug) }}>{pct}%</span>
                </div>
                <div style={{ height: 8, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: colour(slug), borderRadius: 99, transition: 'width 0.5s ease' }} />
                </div>
              </div>
              <Link
                href={`/course/${continueCourse.id}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 22px', background: '#4f46e5', color: 'white', borderRadius: 12, textDecoration: 'none', fontWeight: 600, fontSize: 14, boxShadow: '0 2px 8px rgba(79,70,229,0.35)', flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                <PlayCircle size={16} /> Resume Course
              </Link>
            </div>
          );
        })()}

        {/* ── Two-column layout ─────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>

          {/* LEFT: Playlist ──────────────────────────────────────── */}
          <div>
            {/* Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>My Playlist</h2>
              <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 3 }}>
                {(['all', 'inprogress', 'completed'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{ padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: tab === t ? '#ffffff' : 'transparent', color: tab === t ? '#4f46e5' : '#64748b', boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}
                  >
                    {t === 'all' ? 'All' : t === 'inprogress' ? 'In Progress' : 'Completed'}
                  </button>
                ))}
              </div>
            </div>

            {/* Course Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((course) => {
                const p = coursePct(course);
                const isDone = (p === 100 && course.allLessons.length > 0) || (course.allLessons.length > 0 && course.allLessons.every((l) => completedLessons[l.id]));
                const isStarted = isCourseStarted(course);
                const slug = course.categories?.slug;
                const next = nextLesson(course);
                const doneLessonsCount = course.allLessons.filter((l) => completedLessons[l.id]).length;

                return (
                  <div
                    key={course.id}
                    style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', transition: 'box-shadow 0.2s' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 6px rgba(0,0,0,0.05)')}
                  >
                    {/* Icon or Thumbnail */}
                    <div style={{ width: 56, height: 56, borderRadius: 14, background: bg(slug), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                      {course.thumbnail_url ? (
                        <img src={course.thumbnail_url} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <PlayCircle size={26} color={colour(slug)} />
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        {course.categories && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: colour(slug), background: bg(slug), padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {course.categories.name}
                          </span>
                        )}
                        {isDone ? (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#d1fae5', padding: '2px 8px', borderRadius: 20 }}>
                            ✓ Completed
                          </span>
                        ) : isStarted ? (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '2px 8px', borderRadius: 20 }}>
                            In Progress
                          </span>
                        ) : null}
                      </div>
                      <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {course.title}
                      </p>
                      {!isDone && (
                        <p style={{ margin: '0 0 8px', fontSize: 12, color: '#64748b' }}>
                          {isStarted
                            ? <>In progress · <span style={{ color: colour(slug), fontWeight: 600 }}>Continue: {next?.title ?? 'Next lesson'}</span></>
                            : <>Not started · <span style={{ color: colour(slug) }}>Start: {next?.title ?? '—'}</span></>
                          }
                        </p>
                      )}
                      {isDone && <p style={{ margin: '0 0 8px', fontSize: 12, color: '#059669', fontWeight: 600 }}>All lessons completed 🎉</p>}

                      {/* Progress bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.max(p > 0 ? p : 0, isStarted ? 5 : 0)}%`, background: isDone ? '#059669' : colour(slug), borderRadius: 99, transition: 'width 0.5s ease' }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: isDone ? '#059669' : colour(slug), minWidth: 32 }}>{p}%</span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{doneLessonsCount}/{course.allLessons.length} lessons</span>
                      </div>
                    </div>

                    {/* CTA */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {isDone && (course.has_certificate ?? true) && (
                        <button
                          type="button"
                          onClick={() => handleOpenCertificate(course)}
                          disabled={openingCertCourseId === course.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '8px 16px', background: '#ede9fe',
                            color: '#7c3aed', borderRadius: 10,
                            fontWeight: 600, fontSize: 13,
                            border: '1px solid #ddd6fe', cursor: 'pointer',
                            transition: 'all 0.2s',
                            opacity: openingCertCourseId === course.id ? 0.7 : 1,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#ddd6fe'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#ede9fe'; }}
                        >
                          <Award size={14} /> {openingCertCourseId === course.id ? 'Loading...' : 'Certificate'}
                        </button>
                      )}
                      <Link
                        href={`/course/${course.id}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 16px', background: isDone ? '#f0fdf4' : '#eef2ff', color: isDone ? '#059669' : '#4f46e5', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 13, border: `1px solid ${isDone ? '#bbf7d0' : '#c7d2fe'}`, flexShrink: 0, whiteSpace: 'nowrap', transition: 'opacity 0.15s' }}
                      >
                        {isDone ? 'Review' : isStarted ? 'Continue' : 'Start'}
                        <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                );
              })}

              {!loading && filtered.length === 0 && (
                <div style={{ background: '#ffffff', border: '1px dashed #e2e8f0', borderRadius: 16, padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                  <p style={{ margin: 0, fontSize: 15 }}>No courses in this category.</p>
                </div>
              )}

              {!loading && courses.length === 0 && (
                <div style={{ background: '#ffffff', border: '1px dashed #e2e8f0', borderRadius: 16, padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                  <p style={{ margin: '0 0 8px', fontSize: 15 }}>No courses yet.</p>
                  <Link href="/admin" style={{ color: '#4f46e5', fontSize: 14, textDecoration: 'none', fontWeight: 600 }}>
                    Add courses from Admin →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Sidebar ──────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Per-course Progress */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '18px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <BarChart2 size={14} color="#4f46e5" /> Course Progress
              </h3>
              {courses.length === 0 && (
                <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>No courses enrolled yet.</p>
              )}
              {courses.map((c) => {
                const p = coursePct(c);
                const slug = c.categories?.slug;
                return (
                  <div key={c.id} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: '#475569', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{c.title}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: colour(slug), flexShrink: 0, marginLeft: 6 }}>{p}%</span>
                    </div>
                    <div style={{ height: 5, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${p}%`, background: colour(slug), borderRadius: 99, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Stats */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '18px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} color="#4f46e5" /> Summary
              </h3>
              {[
                { label: 'Total Courses', value: courses.length },
                { label: 'In Progress', value: courses.filter(c => { const p = coursePct(c); return p > 0 && p < 100; }).length },
                { label: 'Completed', value: courses.filter(c => coursePct(c) === 100 && c.allLessons.length > 0).length },
                { label: 'Lessons Complete', value: `${totalDone} / ${totalLessons}` },
              ].map((s) => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f8fafc' }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>{s.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* Explore */}
            <Link
              href="/"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px', background: '#ffffff', border: '1px dashed #c7d2fe', borderRadius: 14, color: '#4f46e5', fontWeight: 600, fontSize: 14, textDecoration: 'none', transition: 'background 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#eef2ff')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
            >
              <BookOpen size={15} /> Explore More Courses <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
