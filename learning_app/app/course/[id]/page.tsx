"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { use } from 'react';
import {
  PlayCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Clock,
  BookOpen,
  Maximize,
  Minimize,
  Award,
  ListVideo,
  SkipForward,
  SkipBack,
  Check,
  Lock,
  AlertCircle,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface Quiz {
  id: string;
  timestamp_sec: number;
  question: string;
  options: string[];
  correct_index: number;
}

interface Lesson {
  id: string;
  title: string;
  type: 'single' | 'playlist';
  video_url: string | null;
  playlist_urls: { title: string; url: string }[] | null;
  duration_seconds: number;
  order_index: number;
  lesson_quizzes?: Quiz[];
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
}

const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  maintenance: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBDseQD_nFajAkQlyn2dz8Cc3vptceHyo_vENBDA6V2LS1DBoXcI4xQ8XbjkEqybxpYE27IkXWyGSazf3M-JtL8nN1iz9bb9ThUZLvYI51AgAGaNo_zFxjoZqQ8OXJpaHYNeNpx5c8A5d2WFaj8FQFgDt3z2-GQrEYCMI11ROGUkX81c3lsrhS4UvG89KMDkyboQdrmEWYyyZk6c8dG3j9mSRjYN9bCTIp6RvNj7QdGbsInfpZ8-pwE',
  quality: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDS_UaU9mRDR9UKyAYt20UOuIZv15pbWLlo5c4eDLK5pX4GSUwpdJIsu2E9apIelIy757cGEl3Anze-pnk2DSRlH800TJIkgkytF1azIUuYjLAYnZtjCJ0IC6Zuad-bOeaiUIMt8GgNjMUMdjsXmhXX7jjvuDTArNQuQG0HERpUousBZhWvyAyoPIOcofDJ5J8HKLQhQfRGxJppZ5Yzze3RK1JiA_RvJNZSy83nzap8ZqeGYbWQPAWs',
  safety: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDnjXqzDNQrkGeI5Daw6u-56r0wR_DWIu9sNmExX1Xy5eN9B277Va1U8azyhtuwmFinQXLWlmRCuqXU2alvK6X2Y3scjdP9epBRiVNC2LmTEt9UVOD3lETVDNCrpvcUZhM1wLRqHpSIyLn3usWITTmcfM0GbUlqzuS1SgyOSPy0ZxoHnCaKhNb6jnWvnl2EtJurov2JxX34aMbNeKQ1uARpFdsgQ60dIyXo-3V3Mk0rrrcfSJW6CZbL',
  production: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCiH9LHtURVZx2isHpGpg2n4EBO7U_Pp6SB_g_HsfhxaCjvomz7DYS5Sl9eF6lHmturD4l_8EVzp-iO5palsKE9cgFkX3EPDIB4qxbnKDkv2ft-Qg8arWfDSZzEJMcJBms4nqdw_eVKYfm6gWOcnA2puj5IXfiosGqT1q-Km3dcRvet3POrd_PboowU360wGYKSTgo9anOBdM9PrLkzSUUZBbDDwaqVUgNFL1PIh6G47LaSNUYbRXWK',
  mechanical: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDsCTkhoA3PzQvZVyLsSM1jgxKhU3HecYS5UBvBDqSOnufAqJzc7JomxFnVNBkQiSuQzom1k4v-pkRZ94Cq4hjDQoM-RgJsuMPpfvZ4doAqbOtydsdtOBMeuBBlvcQ0M4BV0JYusSs_bPlL75ZU2K21MZ_IkPhhsoTYcDYtE3p-8YvECB2Td9WQe0G_UxLVc1ty9o0DdmtRXhaQzVHLk_FBXWUOZs7xAewM86zRjlyvHVk9FMdPBGcM',
  engineering: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDU8He34NGL4cveMvTzlBF6koVgkxxaaa-XXqWtG-6IY6Oe7Czu1H7iHGj7tZEpP9tVZhuppV1fYmyf9DgUJ7qNFcH3stsszNR79dl9Y5_YbD3V6w-dbfI4vLfB-LPPLpAdO8bsIgY14olV-50BMVT0iXJHca7lAqtVxVJ8KpJ0A1S0u7IMURFYnCMNq-F9rHp6OLIZlGlBd4feGf5uGhZqfiEITOKYNmRMfdkQDSCaiIrpk62siQ3s',
};

function fmtSeconds(sec: number): string {
  if (!sec || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Course Player Page ────────────────────────────────────────────────
export default function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Playlist
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const playlistVideoRef = useRef<HTMLVideoElement>(null);
  const maxPlaylistWatchedRef = useRef<Record<number, number>>({});
  const [completedPlaylistParts, setCompletedPlaylistParts] = useState<Record<number, boolean>>({});

  // Certificate state & modal
  const [earnedCertId, setEarnedCertId] = useState<string | null>(null);
  const [showCertCelebration, setShowCertCelebration] = useState(false);

  // Anti-skip & Quizzes
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const activeQuizRef = useRef<Quiz | null>(null);
  const [answeredQuizzes, setAnsweredQuizzes] = useState<Record<string, boolean>>({});
  const maxWatchedRef = useRef(0);
  const rewindingRef = useRef(false);

  // Quiz feedback
  const [quizFeedback, setQuizFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const quizAttemptsRef = useRef<Record<string, number>>({});

  // ── Training Restrictions: Minimize & Play Speed Warnings ───────────
  const [tabInactiveWarning, setTabInactiveWarning] = useState(false);
  const [speedWarning, setSpeedWarning] = useState(false);
  const [antiSkipNotice, setAntiSkipNotice] = useState(false);

  // Scrubber time display
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Zustand Store
  const completedLessons = useAppStore((s) => s.completedLessons);
  const markLessonComplete = useAppStore((s) => s.markLessonComplete);
  const getCourseProgress = useAppStore((s) => s.getCourseProgressPercentage);
  const maxWatchedTime = useAppStore((s) => s.maxWatchedTime);
  const updateMaxWatchedTime = useAppStore((s) => s.updateMaxWatchedTime);
  const syncWatchtime = useAppStore((s) => s.syncWatchtime);
  const fetchUserData = useAppStore((s) => s.fetchUserData);
  const enrollInCourse = useAppStore((s) => s.enrollInCourse);
  const courseCertificates = useAppStore((s) => s.courseCertificates);
  const checkAndIssueCertificate = useAppStore((s) => s.checkAndIssueCertificate);

  // 1. Authenticate and hydrate user state
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const { user } = res.ok ? await res.json() : { user: null };
        if (!user) {
          router.push('/login');
        } else {
          await fetchUserData();
          setAuthChecked(true);
        }
      } catch {
        router.push('/login');
      }
    };
    checkAuth();
  }, [fetchUserData, router]);

  // 2. Fetch Course
  useEffect(() => {
    if (!id || !authChecked) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/courses/${id}`);
        if (!res.ok) throw new Error('Course not found.');
        const { course: data }: { course: Course } = await res.json();
        setCourse(data);

        // Auto-enroll user in course
        enrollInCourse(id);

        // Expand first module and select first lesson
        if (data.modules?.length) {
          setExpandedModules([data.modules[0].id]);
          const firstLesson = data.modules[0].lessons?.[0];
          if (firstLesson) {
            setActiveLessonId(firstLesson.id);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load course.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, authChecked, enrollInCourse]);

  // 3. Reset states when active lesson changes
  useEffect(() => {
    if (activeLessonId) {
      const state = useAppStore.getState();
      maxWatchedRef.current = state.maxWatchedTime[activeLessonId] || 0;
      setAnsweredQuizzes({});
      activeQuizRef.current = null;
      setActiveQuiz(null);
      setQuizFeedback(null);
      setSelectedOption(null);
      setPlaylistIndex(0);
      setCompletedPlaylistParts({});
      maxPlaylistWatchedRef.current = {};
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [activeLessonId]);

  // 4. Strict Enforcement: Auto-Pause when Tab is Minimized or Switched
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        let wasPlaying = false;
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
          wasPlaying = true;
        }
        if (playlistVideoRef.current && !playlistVideoRef.current.paused) {
          playlistVideoRef.current.pause();
          wasPlaying = true;
        }
        if (wasPlaying) {
          setTabInactiveWarning(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // 5. Strict Enforcement: Lock Playback Rate to 1.0x & Block Acceleration Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block standard playback speed shortcut keys (> / < / Shift+.)
      if (e.key === '>' || e.key === '<' || (e.shiftKey && (e.key === '.' || e.key === ','))) {
        e.preventDefault();
        setSpeedWarning(true);
        setTimeout(() => setSpeedWarning(false), 2500);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Strict rate change guard
  function enforceStandardPlaybackRate(videoEl: HTMLVideoElement | null) {
    if (videoEl && videoEl.playbackRate !== 1.0) {
      videoEl.playbackRate = 1.0;
      setSpeedWarning(true);
      setTimeout(() => setSpeedWarning(false), 2500);
    }
  }

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      playerContainerRef.current?.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  }

  // ── Derived helpers ─────────────────────────────────────────────────
  const allLessons: Lesson[] = useMemo(() => course?.modules.flatMap((m) => m.lessons) ?? [], [course]);
  const activeLesson = useMemo(() => allLessons.find((l) => l.id === activeLessonId) ?? null, [allLessons, activeLessonId]);
  const allLessonIds = useMemo(() => allLessons.map((l) => l.id), [allLessons]);
  const progressPct = getCourseProgress(allLessonIds);
  const isCourseComplete = progressPct === 100 || (allLessonIds.length > 0 && allLessonIds.every((lid) => completedLessons[lid]));

  // Default video player image dynamically taken from course thumbnail_url
  const posterImage = useMemo(() => {
    if (course?.thumbnail_url) return course.thumbnail_url;
    const slug = (course?.categories?.slug || '').toLowerCase();
    for (const [key, url] of Object.entries(DEFAULT_CATEGORY_IMAGES)) {
      if (slug.includes(key)) return url;
    }
    return 'https://lh3.googleusercontent.com/aida-public/AB6AXuBjfAGTNuTdHtTmN0kNFGCYoDm9_cq6A9K4-BYpV35uO1KWQOK1H5333vUhiQsmQ2NmPAbBSxg0paj9aHcCrNm_5FePJDOU7DSMqjf2lBTHy6y9aSql3W25q7vgTOi5R43xBmCYvqv0gSVvUIVMDUCD-RExc42Q6k3kSHTjzlFO-GHXQY5bSzBYrq0L5HBFStn0B0iozeLotbka4ClIG3S0KO21YXtWUvZWFLBsQ_achhyLS0n1zhT2';
  }, [course]);

  const toggleModule = (modId: string) =>
    setExpandedModules((prev) =>
      prev.includes(modId) ? prev.filter((mid) => mid !== modId) : [...prev, modId]
    );

  // Sync watch position on unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeLessonId && maxWatchedRef.current > 0) {
        const total = videoRef.current?.duration || activeLesson?.duration_seconds || 0;
        try {
          const payload = JSON.stringify({
            lesson_id: activeLessonId,
            watched_seconds: Math.round(maxWatchedRef.current),
            total_seconds: Math.round(total),
          });
          const blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon?.('/api/progress/watchtime', blob);
        } catch {}
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (activeLessonId && maxWatchedRef.current > 0) {
        const total = videoRef.current?.duration || activeLesson?.duration_seconds || 0;
        syncWatchtime(activeLessonId, maxWatchedRef.current, total);
      }
    };
  }, [activeLessonId, activeLesson, syncWatchtime]);

  function handleLessonClick(lesson: Lesson) {
    if (activeLessonId !== lesson.id) {
      if (activeLessonId && maxWatchedRef.current > 0) {
        const total = videoRef.current?.duration || activeLesson?.duration_seconds || 0;
        syncWatchtime(activeLessonId, maxWatchedRef.current, total);
      }
      setActiveLessonId(lesson.id);
      setIsPlaying(false);
    }
  }

  // ── Mark Complete & Auto-advance ────────────────────────────────────
  async function handleMarkComplete() {
    if (!activeLessonId || !activeLesson) return;

    let finalWatched = maxWatchedRef.current;
    let totalSec = videoRef.current?.duration || activeLesson.duration_seconds || 0;

    if (activeLesson.type === 'playlist') {
      finalWatched = Object.values(maxPlaylistWatchedRef.current).reduce((a, b) => a + b, 0);
      totalSec = activeLesson.duration_seconds || totalSec || 300;
    }

    if (finalWatched > 0) {
      await syncWatchtime(activeLessonId, finalWatched, totalSec);
    }

    markLessonComplete(activeLessonId);

    // Auto-advance to next lesson
    const idx = allLessons.findIndex((l) => l.id === activeLessonId);
    const next = allLessons[idx + 1];
    if (next) {
      setActiveLessonId(next.id);
      setIsPlaying(false);
      const ownerModule = course?.modules.find((m) =>
        m.lessons.some((l) => l.id === next.id)
      );
      if (ownerModule && !expandedModules.includes(ownerModule.id)) {
        setExpandedModules((prev) => [...prev, ownerModule.id]);
      }
    }

    // Auto-check and issue certificate if all lessons done
    const remainingIncomplete = allLessons.filter(
      (l) => l.id !== activeLessonId && !completedLessons[l.id]
    );
    if (remainingIncomplete.length === 0 && id) {
      setTimeout(async () => {
        const certRes = await checkAndIssueCertificate(id);
        if (certRes?.issued && certRes?.certificate_id) {
          setEarnedCertId(certRes.certificate_id);
          setShowCertCelebration(true);
        }
      }, 600);
    }
  }

  // ── Playlist Handlers (Sequential + Anti-Skip) ──────────────────────
  function handlePlaylistTimeUpdate() {
    if (!playlistVideoRef.current || !activeLesson) return;
    const v = playlistVideoRef.current;
    enforceStandardPlaybackRate(v);

    const t = v.currentTime;
    const dur = v.duration || 0;
    setCurrentTime(t);
    setDuration(dur);

    const currentMax = maxPlaylistWatchedRef.current[playlistIndex] || 0;

    // Anti-skip enforcement
    if (t > currentMax) {
      if (t - currentMax > 1.5) {
        v.currentTime = currentMax;
        setAntiSkipNotice(true);
        setTimeout(() => setAntiSkipNotice(false), 2000);
        return;
      }
      maxPlaylistWatchedRef.current[playlistIndex] = t;
    }

    // When part finishes
    if (dur > 0 && t >= dur - 1.5) {
      setCompletedPlaylistParts((prev) => (prev[playlistIndex] ? prev : { ...prev, [playlistIndex]: true }));
      if (playlistIndex === activeLesson.playlist_urls!.length - 1 && !completedLessons[activeLesson.id]) {
        handleMarkComplete();
      }
    }

    if (Math.floor(t) % 5 === 0 && t > 0) {
      const estimatedTotal = activeLesson.duration_seconds || 300;
      const totalWatched = Object.values(maxPlaylistWatchedRef.current).reduce((a, b) => a + b, 0);
      updateMaxWatchedTime(activeLesson.id, totalWatched, estimatedTotal);
    }
  }

  function handlePlaylistSeeking() {
    if (!playlistVideoRef.current) return;
    const currentMax = maxPlaylistWatchedRef.current[playlistIndex] || 0;
    if (playlistVideoRef.current.currentTime > currentMax + 1.5) {
      playlistVideoRef.current.currentTime = currentMax;
      setAntiSkipNotice(true);
      setTimeout(() => setAntiSkipNotice(false), 2000);
    }
  }

  // ── Single Video Handlers (Anti-Skip + Quizzes) ─────────────────────
  function handleTimeUpdate() {
    if (!videoRef.current || !activeLesson) return;
    const v = videoRef.current;
    enforceStandardPlaybackRate(v);

    const t = v.currentTime;
    const dur = v.duration || activeLesson.duration_seconds || 0;
    setCurrentTime(t);
    setDuration(dur);

    // Anti-skip logic
    if (t > maxWatchedRef.current) {
      if (t - maxWatchedRef.current > 1.0) {
        v.currentTime = maxWatchedRef.current;
        setAntiSkipNotice(true);
        setTimeout(() => setAntiSkipNotice(false), 2000);
        return;
      }
      maxWatchedRef.current = t;
    }

    // Persist to DB periodically
    if (Math.floor(t) % 5 === 0 && t > 0) {
      const total = v.duration || activeLesson.duration_seconds || 0;
      updateMaxWatchedTime(activeLesson.id, maxWatchedRef.current, total);
    }

    // In-video Quiz Checkpoint
    if (activeLesson.lesson_quizzes?.length) {
      const pendingQuiz = activeLesson.lesson_quizzes.find(
        (q) => Math.floor(t) === q.timestamp_sec && !answeredQuizzes[q.id]
      );
      if (pendingQuiz && !activeQuizRef.current) {
        activeQuizRef.current = pendingQuiz;
        setActiveQuiz(pendingQuiz);
        videoRef.current?.pause();
      }
    }
  }

  function handleSeeking() {
    if (!videoRef.current || !activeLesson) return;
    if (rewindingRef.current) return;

    if (activeQuizRef.current) {
      videoRef.current.currentTime = activeQuizRef.current.timestamp_sec;
      return;
    }

    if (videoRef.current.currentTime > maxWatchedRef.current + 1.0) {
      videoRef.current.currentTime = maxWatchedRef.current;
      setAntiSkipNotice(true);
      setTimeout(() => setAntiSkipNotice(false), 2000);
    }
  }

  // ── Quiz Submission Handler ─────────────────────────────────────────
  function handleQuizAnswer(quizId: string, optionIndex: number) {
    if (!activeQuiz || activeQuiz.id !== quizId || quizFeedback) return;

    setSelectedOption(optionIndex);

    if (activeQuiz.correct_index === optionIndex) {
      setQuizFeedback('correct');
      setTimeout(() => {
        setAnsweredQuizzes((prev) => ({ ...prev, [quizId]: true }));
        activeQuizRef.current = null;
        setActiveQuiz(null);
        setQuizFeedback(null);
        setSelectedOption(null);
        quizAttemptsRef.current[quizId] = 0;
        if (videoRef.current) {
          videoRef.current.play().catch(() => {});
        }
      }, 1200);
    } else {
      const prevAttempts = quizAttemptsRef.current[quizId] || 0;
      const newAttempts = prevAttempts + 1;
      quizAttemptsRef.current[quizId] = newAttempts;
      setQuizFeedback('wrong');

      if (newAttempts >= 2) {
        setTimeout(() => {
          rewindingRef.current = true;
          maxWatchedRef.current = 0;
          activeQuizRef.current = null;
          setActiveQuiz(null);
          setQuizFeedback(null);
          setSelectedOption(null);
          quizAttemptsRef.current[quizId] = 0;
          setAnsweredQuizzes((prev) => {
            const next = { ...prev };
            delete next[quizId];
            return next;
          });

          if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => {}).finally(() => {
              rewindingRef.current = false;
            });
          } else {
            rewindingRef.current = false;
          }
        }, 1800);
      } else {
        setTimeout(() => {
          setQuizFeedback(null);
          setSelectedOption(null);
        }, 1500);
      }
    }
  }

  // ── Loading & Error States ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#c62828]" />
        <p className="text-sm font-semibold text-[#64748B]">Loading technical training workspace…</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Course Not Found</h2>
        <p className="text-sm text-slate-500 mb-4">{error ?? 'Unable to retrieve course details.'}</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#c62828] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#b71c1c] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 text-slate-800 antialiased min-h-screen flex flex-col justify-between font-sans">

      {/* ── Top Header Navigation Bar ──────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Back link, Category pill, Course Title */}
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-[#c62828] transition-colors py-1 px-2 -ml-2 rounded hover:bg-slate-100 flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Link>

            <div className="h-4 w-[1px] bg-slate-200 hidden sm:block flex-shrink-0" />

            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-semibold tracking-wider font-mono uppercase bg-slate-100 text-slate-700 border border-slate-300 flex-shrink-0">
              {course.categories?.name || 'Technical'}
            </span>

            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
              {course.title}
            </h1>
          </div>

          {/* Right: Progress Indicators & Certificate Action */}
          <div className="flex items-center space-x-3 sm:space-x-4 flex-shrink-0">
            <div className="hidden md:flex flex-col items-end text-right">
              <div className="flex items-center space-x-2">
                <span
                  className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded ${
                    isCourseComplete
                      ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                      : 'text-slate-700 bg-slate-100 border border-slate-300'
                  }`}
                >
                  {isCourseComplete ? (
                    <>
                      <Check className="w-3 h-3 mr-1 text-emerald-600" />
                      Course Completed
                    </>
                  ) : (
                    'In Progress'
                  )}
                </span>
                <span className="text-xs font-mono font-bold text-slate-800">
                  {progressPct}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                {allLessonIds.filter((lid) => completedLessons[lid]).length} / {allLessonIds.length} Lessons
              </p>
            </div>

            {/* Certificate Button */}
            {(earnedCertId || courseCertificates[id]) && (
              <Link
                href={`/certificate/${earnedCertId || courseCertificates[id]}`}
                className="inline-flex items-center px-3.5 py-2 border border-[#c62828] text-xs font-bold rounded shadow-sm text-white bg-[#c62828] hover:bg-[#b71c1c] transition-colors"
              >
                <Award className="w-4 h-4 mr-1.5 text-white" />
                <span>View Certificate</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Learning Workspace ────────────────────────────────── */}
      <main className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ── LEFT COLUMN: Course Curriculum Sidebar (4 Cols) ───────── */}
          <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden flex flex-col">
            {/* Curriculum Header & Progress */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/60">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center font-mono">
                  <BookOpen className="w-4 h-4 mr-2 text-[#c62828]" />
                  Course Curriculum
                </h2>
                <span className="text-xs font-mono font-semibold text-slate-700">
                  {allLessons.length} Lesson{allLessons.length !== 1 ? 's' : ''}
                </span>
              </div>
              {/* Red Progress Bar */}
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#c62828] h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Accordion Modules & Lessons */}
            <div className="divide-y divide-slate-100">
              {course.modules.map((module, modIdx) => {
                const isExpanded = expandedModules.includes(module.id);
                const modCompleted = module.lessons.filter((l) => completedLessons[l.id]).length;
                const isModDone = modCompleted === module.lessons.length && module.lessons.length > 0;

                return (
                  <div key={module.id} className="flex flex-col">
                    {/* Module Section Header */}
                    <button
                      type="button"
                      onClick={() => toggleModule(module.id)}
                      className="bg-slate-100/70 px-4 py-3 border-b border-slate-200 flex items-center justify-between hover:bg-slate-100 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center space-x-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        )}
                        <span className="text-xs font-mono font-bold text-slate-500">
                          M{modIdx + 1}:
                        </span>
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                          {module.title}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                          isModDone
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isModDone ? 'Completed' : `${modCompleted}/${module.lessons.length}`}
                      </span>
                    </button>

                    {/* Lessons list inside expanded module */}
                    {isExpanded && (
                      <div className="divide-y divide-slate-100 bg-white">
                        {module.lessons.map((lesson) => {
                          const isActive = activeLessonId === lesson.id;
                          const isDone = !!completedLessons[lesson.id];
                          const isInProg = !isDone && (maxWatchedTime[lesson.id] || 0) > 0;
                          const isPlaylist = lesson.type === 'playlist' && !!lesson.playlist_urls?.length;

                          return (
                            <div
                              key={lesson.id}
                              className={`transition-colors ${
                                isActive ? 'border-l-4 border-l-[#c62828] bg-red-50/20' : 'hover:bg-slate-50/80'
                              }`}
                            >
                              {/* Primary Lesson Click Target */}
                              <div
                                onClick={() => handleLessonClick(lesson)}
                                className="p-3.5 flex items-start justify-between cursor-pointer"
                              >
                                <div className="flex items-start space-x-2.5 min-w-0">
                                  {isDone ? (
                                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                                      <Check className="w-3.5 h-3.5" />
                                    </span>
                                  ) : isInProg ? (
                                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                      <PlayCircle className="w-3.5 h-3.5" />
                                    </span>
                                  ) : (
                                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                                      <PlayCircle className="w-3.5 h-3.5" />
                                    </span>
                                  )}

                                  <div className="min-w-0">
                                    <h3
                                      className={`text-xs font-bold leading-snug truncate ${
                                        isActive ? 'text-slate-900' : 'text-slate-700'
                                      }`}
                                    >
                                      {lesson.title}
                                    </h3>
                                    <div className="flex items-center space-x-2 mt-1 text-[11px] text-slate-500 font-mono">
                                      <span className="flex items-center">
                                        <Clock className="w-3 h-3 mr-1" />
                                        {fmtSeconds(lesson.duration_seconds)}
                                      </span>
                                      {isPlaylist && (
                                        <>
                                          <span>•</span>
                                          <span>{lesson.playlist_urls!.length} parts</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Status badge */}
                                {isActive && (
                                  <span className="inline-flex items-center text-[10px] font-bold text-[#c62828] uppercase tracking-wider bg-white border border-red-200 px-1.5 py-0.5 rounded shadow-xs flex-shrink-0 ml-2">
                                    {isPlaylist ? `Part ${playlistIndex + 1} of ${lesson.playlist_urls!.length}` : 'Now Playing'}
                                  </span>
                                )}
                              </div>

                              {/* Nested Sub-lessons / Sequential Parts for Active Playlist */}
                              {isActive && isPlaylist && (
                                <div className="pl-9 pr-3 pb-3 space-y-1.5">
                                  {lesson.playlist_urls!.map((part, pIdx) => {
                                    const isPartUnlocked = isDone || pIdx === 0 || !!completedPlaylistParts[pIdx - 1];
                                    const isPartDone = isDone || !!completedPlaylistParts[pIdx];
                                    const isPartCurrent = pIdx === playlistIndex;

                                    return (
                                      <div
                                        key={pIdx}
                                        onClick={() => {
                                          if (isPartUnlocked) {
                                            setPlaylistIndex(pIdx);
                                            setIsPlaying(true);
                                          }
                                        }}
                                        title={
                                          !isPartUnlocked
                                            ? `Sequential Requirement: Finish Part ${pIdx} first to unlock this video.`
                                            : undefined
                                        }
                                        className={`p-2 rounded border flex items-center justify-between transition ${
                                          !isPartUnlocked
                                            ? 'opacity-50 bg-slate-50/70 border-slate-200 cursor-not-allowed'
                                            : isPartCurrent
                                            ? 'border-[#c62828] bg-white shadow-xs cursor-pointer'
                                            : 'border-slate-200 bg-slate-50/80 hover:bg-white cursor-pointer'
                                        }`}
                                      >
                                        <div className="flex items-center space-x-2 min-w-0">
                                          {!isPartUnlocked ? (
                                            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[9px] font-mono flex-shrink-0">
                                              <Lock className="w-2.5 h-2.5" />
                                            </span>
                                          ) : isPartDone ? (
                                            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-mono flex-shrink-0">
                                              <Check className="w-2.5 h-2.5" />
                                            </span>
                                          ) : isPartCurrent ? (
                                            <span className="w-4 h-4 rounded-full bg-[#c62828] text-white flex items-center justify-center text-[9px] font-mono flex-shrink-0">
                                              ▶
                                            </span>
                                          ) : (
                                            <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-mono flex-shrink-0">
                                              {pIdx + 1}
                                            </span>
                                          )}

                                          <div className="min-w-0">
                                            <p className={`text-xs font-semibold truncate ${
                                              !isPartUnlocked ? 'text-slate-400' : isPartCurrent ? 'text-slate-900 font-bold' : 'text-slate-700'
                                            }`}>
                                              {part.title}
                                            </p>
                                            <p className="text-[10px] text-slate-500 font-mono">
                                              {!isPartUnlocked ? `Locked • Finish Part ${pIdx}` : `Part ${pIdx + 1}`}
                                            </p>
                                          </div>
                                        </div>

                                        <span className="flex-shrink-0 ml-2">
                                          {!isPartUnlocked ? (
                                            <span className="text-[10px] font-mono text-slate-400 font-semibold flex items-center gap-0.5">
                                              <Lock className="w-2.5 h-2.5" /> Locked
                                            </span>
                                          ) : isPartDone ? (
                                            <span className="text-[10px] font-mono text-emerald-700 font-semibold flex items-center gap-0.5">
                                              <Check className="w-3 h-3" /> Done
                                            </span>
                                          ) : isPartCurrent ? (
                                            <span className="text-[10px] font-mono text-[#c62828] font-bold">
                                              Playing
                                            </span>
                                          ) : (
                                            <span className="text-[10px] font-mono text-slate-400">
                                              Ready
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>

          {/* ── RIGHT COLUMN: Dominant 16:9 Video Player & Panel (8 Cols) ─ */}
          <section className="lg:col-span-8 flex flex-col space-y-5">
            {/* Breadcrumb Navigation */}
            <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs text-slate-500 font-mono flex-wrap">
              <span className="hover:text-[#c62828] cursor-pointer" onClick={() => router.push('/dashboard')}>
                {course.title}
              </span>
              <span>/</span>
              <span className="text-slate-700">
                {course.modules.find((m) => m.lessons.some((l) => l.id === activeLessonId))?.title || 'Module'}
              </span>
              <span>/</span>
              {activeLesson?.type === 'playlist' && activeLesson.playlist_urls ? (
                <span className="text-[#c62828] font-bold">
                  Part {playlistIndex + 1}: {activeLesson.playlist_urls[playlistIndex]?.title}
                </span>
              ) : (
                <span className="text-slate-900 font-semibold truncate">
                  {activeLesson?.title || 'Lesson'}
                </span>
              )}
            </nav>

            {/* ── Dominant 16:9 Industrial Video Player Frame ────────── */}
            <div
              ref={playerContainerRef}
              className="relative w-full aspect-video bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-md group select-none"
            >
              {/* Top Video Overlay Bar */}
              <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-transparent flex items-center justify-between z-30 pointer-events-none">
                <div className="flex items-center space-x-2 pointer-events-auto">
                  {activeLesson?.type === 'playlist' && activeLesson.playlist_urls ? (
                    <span className="bg-[#c62828] text-white text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded shadow-sm">
                      Part {playlistIndex + 1} of {activeLesson.playlist_urls.length}
                    </span>
                  ) : (
                    <span className="bg-slate-800 text-slate-300 text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded">
                      Standard Module
                    </span>
                  )}
                  <span className="text-xs text-white/90 font-medium truncate max-w-sm hidden sm:inline">
                    {activeLesson?.type === 'playlist' && activeLesson.playlist_urls
                      ? activeLesson.playlist_urls[playlistIndex]?.title
                      : activeLesson?.title}
                  </span>
                </div>

                {/* Fullscreen Trigger */}
                <button
                  onClick={toggleFullscreen}
                  className="pointer-events-auto text-white/80 hover:text-white p-1 rounded bg-black/40 hover:bg-black/60 transition-colors cursor-pointer"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>

              {/* ── Enforcement Notification Overlays ────────────────── */}

              {/* 1. Tab Minimized / Switched Warning Overlay */}
              {tabInactiveWarning && (
                <div className="absolute inset-0 bg-slate-950/90 z-50 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3 ring-8 ring-amber-500/10">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    Training Video Paused
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-5 leading-relaxed">
                    Technical compliance requires training videos to be watched actively on this tab. Minimizing or switching windows pauses video playback.
                  </p>
                  <button
                    onClick={() => {
                      setTabInactiveWarning(false);
                      if (activeLesson?.type === 'playlist' && playlistVideoRef.current) {
                        playlistVideoRef.current.play().catch(() => {});
                      } else if (videoRef.current) {
                        videoRef.current.play().catch(() => {});
                      }
                      setIsPlaying(true);
                    }}
                    className="px-5 py-2.5 rounded-lg bg-[#c62828] hover:bg-[#b71c1c] text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-colors cursor-pointer"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>Resume Video</span>
                  </button>
                </div>
              )}

              {/* 2. Playback Speed Attempt Warning Toast */}
              {speedWarning && (
                <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>Playback speed is locked at 1.0x standard speed for training compliance.</span>
                </div>
              )}

              {/* 3. Anti-Skipping Enforcement Warning Toast */}
              {antiSkipNotice && (
                <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Fast-forwarding disabled: Please watch the lesson in full to progress.</span>
                </div>
              )}

              {/* ── Active Video Elements ────────────────────────────── */}
              {activeLesson?.type === 'playlist' && activeLesson.playlist_urls ? (
                /* Playlist Video Player */
                isPlaying ? (
                  <video
                    ref={playlistVideoRef}
                    key={activeLesson.playlist_urls[playlistIndex]?.url}
                    autoPlay
                    controls
                    controlsList="nodownload noplaybackrate nofullscreen"
                    disablePictureInPicture
                    poster={posterImage}
                    className="w-full h-full object-contain"
                    src={activeLesson.playlist_urls[playlistIndex]?.url}
                    onRateChange={() => enforceStandardPlaybackRate(playlistVideoRef.current)}
                    onTimeUpdate={handlePlaylistTimeUpdate}
                    onSeeking={handlePlaylistSeeking}
                    onPause={() => {
                      if (activeLesson) {
                        const totalWatched = Object.values(maxPlaylistWatchedRef.current).reduce((a, b) => a + b, 0);
                        syncWatchtime(activeLesson.id, totalWatched, activeLesson.duration_seconds || 300);
                      }
                    }}
                    onEnded={() => {
                      setCompletedPlaylistParts((prev) => ({ ...prev, [playlistIndex]: true }));
                      if (playlistIndex < activeLesson.playlist_urls!.length - 1) {
                        setPlaylistIndex((prev) => prev + 1);
                      } else {
                        handleMarkComplete();
                      }
                    }}
                  />
                ) : (
                  /* Poster Play Screen */
                  <div className="w-full h-full flex flex-col items-center justify-center relative">
                    <img
                      src={posterImage}
                      alt={activeLesson.playlist_urls[playlistIndex]?.title}
                      className="w-full h-full object-cover filter brightness-75"
                    />
                    <button
                      type="button"
                      onClick={() => setIsPlaying(true)}
                      className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#c62828]/90 text-white flex items-center justify-center hover:bg-[#c62828] transition-transform transform hover:scale-105 shadow-xl backdrop-blur-sm z-20 border-2 border-white/20 cursor-pointer"
                    >
                      <PlayCircle className="w-10 h-10 translate-x-0.5" />
                    </button>
                    <div className="absolute bottom-4 left-4 right-4 z-20 text-white">
                      <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-red-300">
                        Part {playlistIndex + 1} of {activeLesson.playlist_urls.length}
                      </span>
                      <h4 className="text-sm sm:text-base font-bold truncate">
                        {activeLesson.playlist_urls[playlistIndex]?.title}
                      </h4>
                    </div>
                  </div>
                )
              ) : (
                /* Single Lesson Video Player */
                isPlaying && activeLesson?.video_url ? (
                  <>
                    <video
                      ref={videoRef}
                      key={activeLessonId}
                      autoPlay
                      controls={!activeQuiz}
                      controlsList="nodownload noplaybackrate nofullscreen"
                      disablePictureInPicture
                      poster={posterImage}
                      className="w-full h-full object-contain"
                      src={activeLesson.video_url}
                      onRateChange={() => enforceStandardPlaybackRate(videoRef.current)}
                      onEnded={handleMarkComplete}
                      onTimeUpdate={handleTimeUpdate}
                      onSeeking={handleSeeking}
                      onPause={() => {
                        if (activeLessonId && maxWatchedRef.current > 0) {
                          const total = videoRef.current?.duration || activeLesson?.duration_seconds || 0;
                          syncWatchtime(activeLessonId, maxWatchedRef.current, total);
                        }
                      }}
                    >
                      Your browser does not support HTML5 video.
                    </video>

                    {/* Quiz Overlay Modal */}
                    {activeQuiz && (
                      <div className="absolute inset-0 bg-slate-950/85 z-50 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
                        {quizFeedback && (
                          <div
                            className={`absolute inset-0 z-60 flex flex-col items-center justify-center gap-3 animate-in fade-in duration-200 ${
                              quizFeedback === 'correct' ? 'bg-emerald-600/95' : 'bg-[#c62828]/95'
                            }`}
                          >
                            <div className="text-6xl">{quizFeedback === 'correct' ? '✅' : '❌'}</div>
                            <p className="text-white text-xl font-bold">
                              {quizFeedback === 'correct'
                                ? 'Correct Answer!'
                                : (quizAttemptsRef.current[activeQuiz.id] || 0) >= 2
                                ? 'Two incorrect attempts: Rewinding section…'
                                : 'Incorrect — Try once more!'}
                            </p>
                          </div>
                        )}

                        <div className="bg-white rounded-xl shadow-2xl p-5 max-w-md w-full border border-slate-200 flex flex-col">
                          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2 text-[#c62828]">
                              <BookOpen className="w-5 h-5" />
                              <h3 className="font-bold text-sm sm:text-base text-slate-900">
                                Checkpoint Knowledge Check
                              </h3>
                            </div>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              {(quizAttemptsRef.current[activeQuiz.id] || 0) === 0 ? 'Attempt 1 of 2' : 'Final Attempt'}
                            </span>
                          </div>

                          <p className="text-sm font-semibold text-slate-800 mb-4">
                            {activeQuiz.question}
                          </p>

                          <div className="space-y-2">
                            {activeQuiz.options.map((opt, oIdx) => (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => handleQuizAnswer(activeQuiz.id, oIdx)}
                                disabled={!!quizFeedback}
                                className={`w-full text-left p-3 rounded-lg border text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                                  selectedOption === oIdx
                                    ? 'border-[#c62828] bg-red-50 text-slate-900'
                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <span className="font-mono font-bold text-[#c62828] mr-2">
                                  {String.fromCharCode(65 + oIdx)}.
                                </span>
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Single Lesson Play Button Poster */
                  <div className="w-full h-full flex flex-col items-center justify-center relative">
                    <img
                      src={posterImage}
                      alt={activeLesson?.title}
                      className="w-full h-full object-cover filter brightness-75"
                    />
                    {activeLesson?.video_url ? (
                      <button
                        type="button"
                        onClick={() => setIsPlaying(true)}
                        className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#c62828]/90 text-white flex items-center justify-center hover:bg-[#c62828] transition-transform transform hover:scale-105 shadow-xl backdrop-blur-sm z-20 border-2 border-white/20 cursor-pointer"
                      >
                        <PlayCircle className="w-10 h-10 translate-x-0.5" />
                      </button>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
                        <PlayCircle className="w-12 h-12 opacity-30" />
                        <span className="text-xs font-mono">No video uploaded for this lesson</span>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>

            {/* ── Video Metadata & Interactive Action Bar ─────────────── */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {activeLesson?.type === 'playlist' && activeLesson.playlist_urls
                      ? `Part ${playlistIndex + 1}: ${activeLesson.playlist_urls[playlistIndex]?.title}`
                      : activeLesson?.title ?? 'Technical Lesson'}
                  </h2>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {fmtSeconds(activeLesson?.duration_seconds ?? 0)}
                    </span>
                    <span>•</span>
                    <span className="text-[#c62828] font-bold">Standard 1.0x Playback</span>
                    <span>•</span>
                    <span>Anti-Skip Guard Active</span>
                  </div>
                </div>

                {/* Mark as Complete button */}
                <div className="flex items-center gap-2">
                  {activeLesson && completedLessons[activeLesson.id] ? (
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs">
                      <Check className="w-4 h-4 text-emerald-600" />
                      Completed
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleMarkComplete}
                      className="px-4 py-2 rounded-lg bg-[#c62828] hover:bg-[#b71c1c] text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Mark Complete &amp; Next</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Course & Lesson Description */}
              <div className="pt-4 text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2">
                <p>
                  {course.description ||
                    'Comprehensive shop-floor video program covering preventative maintenance routines, hydraulic hose clamping pressure checks, daily spindle alignment verification, and mechanical hazard controls.'}
                </p>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
                  <ShieldAlert className="w-4 h-4 text-[#c62828] flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>Operator Compliance Notice:</strong> All technical modules must be completed sequentially without skipping. Video playback requires an active foreground window.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* ── Certificate Celebration Modal ───────────────────────────── */}
      {showCertCelebration && earnedCertId && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-inner">
              <Award className="w-8 h-8" />
            </div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-3 py-1 rounded-full inline-block mb-2">
              Jolly Clamps Verified Certification
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
              Congratulations! 🎉
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
              You have successfully completed <strong>{course.title}</strong> and earned your official Certificate of Technical Training!
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
              <Link
                href={`/certificate/${earnedCertId}`}
                className="bg-[#c62828] hover:bg-[#b71c1c] text-white font-bold px-5 py-2.5 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 text-xs sm:text-sm"
              >
                <Award className="w-4 h-4" />
                <span>View &amp; Download Certificate</span>
              </Link>
              <button
                type="button"
                onClick={() => setShowCertCelebration(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-lg transition-colors text-xs sm:text-sm cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Industrial Footer ───────────────────────────────────────── */}
      <footer className="w-full bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-2 text-center md:text-left text-slate-500">
          <p className="font-mono text-xs tracking-wider uppercase font-bold text-slate-700">
            JOLLY CLAMPS PVT. LTD. • TECHNICAL TRAINING LMS
          </p>
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Jolly Clamps Pvt. Ltd. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
