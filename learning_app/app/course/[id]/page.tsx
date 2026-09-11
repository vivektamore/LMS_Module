"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { use } from 'react';
import {
  PlayCircle, CheckCircle, ChevronDown, ChevronRight,
  ArrowLeft, Loader2, Clock, BookOpen, Maximize, Minimize, Award
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
  has_certificate?: boolean;
  visibility?: 'all' | 'specific';
  categories: { id: string; name: string; slug: string } | null;
  modules: Module[];
}

function fmtSeconds(sec: number): string {
  if (!sec) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Component ─────────────────────────────────────────────────────────
export default function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [course, setCourse]           = useState<Course | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [isPlaying, setIsPlaying]     = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Playlist
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const playlistVideoRef = useRef<HTMLVideoElement>(null);
  const maxPlaylistWatchedRef = useRef<Record<number, number>>({});

  // Certificate state & modal
  const [earnedCertId, setEarnedCertId] = useState<string | null>(null);
  const [showCertCelebration, setShowCertCelebration] = useState(false);

  // Anti-skip & Quizzes
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const activeQuizRef = useRef<Quiz | null>(null);
  const [answeredQuizzes, setAnsweredQuizzes] = useState<Record<string, boolean>>({});
  const maxWatchedRef = useRef(0);
  // Flag: true while we're doing a programmatic rewind so handleSeeking doesn't fight it
  const rewindingRef = useRef(false);

  // Quiz feedback animation
  const [quizFeedback, setQuizFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  // Track wrong attempts per quiz — 2 strikes then rewind
  const quizAttemptsRef = useRef<Record<string, number>>({});

  // Zustand
  const completedLessons          = useAppStore((s) => s.completedLessons);
  const markLessonComplete        = useAppStore((s) => s.markLessonComplete);
  const getCourseProgress         = useAppStore((s) => s.getCourseProgressPercentage);
  const maxWatchedTime            = useAppStore((s) => s.maxWatchedTime);
  const updateMaxWatchedTime       = useAppStore((s) => s.updateMaxWatchedTime);
  const syncWatchtime             = useAppStore((s) => s.syncWatchtime);
  const fetchUserData             = useAppStore((s) => s.fetchUserData);
  const enrollInCourse            = useAppStore((s) => s.enrollInCourse);
  const courseCertificates        = useAppStore((s) => s.courseCertificates);
  const checkAndIssueCertificate  = useAppStore((s) => s.checkAndIssueCertificate);

  // Hydrate backend state & enforce authentication
  useEffect(() => {
    const checkAuth = async () => {
      const res = await fetch('/api/auth/me');
      const { user } = res.ok ? await res.json() : { user: null };
      if (!user) {
        router.push('/login');
      } else {
        await fetchUserData();
        setAuthChecked(true);
      }
    };
    checkAuth();
  }, [fetchUserData, router]);

  // Reset lesson state when lesson changes
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
      setIsPlaying(false);
    }
  }, [activeLessonId]);

  // ── Fetch course & auto-enroll ────────────────────────────────────────
  useEffect(() => {
    if (!id || !authChecked) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/courses/${id}`);
        if (!res.ok) throw new Error('Course not found.');
        const { course: data }: { course: Course } = await res.json();

        setCourse(data);

        // Auto-enroll the user when they visit a course page
        enrollInCourse(id);

        // Open first module, select first lesson
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

  // ── Helpers ─────────────────────────────────────────────────────────
  const allLessons: Lesson[] = course?.modules.flatMap((m) => m.lessons) ?? [];
  const activeLesson          = allLessons.find((l) => l.id === activeLessonId) ?? null;
  const allLessonIds          = allLessons.map((l) => l.id);
  const progressPct           = getCourseProgress(allLessonIds);

  const toggleModule = (modId: string) =>
    setExpandedModules((prev) =>
      prev.includes(modId) ? prev.filter((id) => id !== modId) : [...prev, modId]
    );

  function handleLessonClick(lesson: Lesson) {
    if (activeLessonId !== lesson.id) {
      setActiveLessonId(lesson.id);
      setIsPlaying(false);
    }
  }

  async function handleMarkComplete() {
    if (!activeLessonId || !activeLesson) return;

    // Flush final watch position to DB before marking complete
    const finalWatched = maxWatchedRef.current;
    const totalSec = videoRef.current?.duration || activeLesson.duration_seconds || 0;
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
      // Expand the module that owns the next lesson
      const ownerModule = course?.modules.find((m) =>
        m.lessons.some((l) => l.id === next.id)
      );
      if (ownerModule && !expandedModules.includes(ownerModule.id)) {
        setExpandedModules((prev) => [...prev, ownerModule.id]);
      }
    }

    // Check if course is now fully completed and auto-issue certificate
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
      }, 500);
    }
  }

  function handlePlaylistTimeUpdate() {
    if (!playlistVideoRef.current || !activeLesson) return;
    const t = playlistVideoRef.current.currentTime;
    const currentMax = maxPlaylistWatchedRef.current[playlistIndex] || 0;

    if (t > currentMax) {
      if (t - currentMax > 1.5) {
        playlistVideoRef.current.currentTime = currentMax;
        return;
      }
      maxPlaylistWatchedRef.current[playlistIndex] = t;
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
    }
  }

  function handleTimeUpdate() {
    if (!videoRef.current || !activeLesson) return;
    const t = videoRef.current.currentTime;

    // Anti-skip logic
    if (t > maxWatchedRef.current) {
      if (t - maxWatchedRef.current > 1.0) { // Seeking ahead detected
        videoRef.current.currentTime = maxWatchedRef.current;
        return;
      }
      maxWatchedRef.current = t; // Normal playback
    }

    // Persist to DB periodically (every 5s of playback time), passing total duration
    if (Math.floor(t) % 5 === 0 && t > 0) {
      const total = videoRef.current?.duration || activeLesson.duration_seconds || 0;
      updateMaxWatchedTime(activeLesson.id, maxWatchedRef.current, total);
    }

    // Quiz logic
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

    // Always allow programmatic rewinds (e.g. after 2 wrong quiz answers)
    if (rewindingRef.current) return;

    // Lock playhead if a quiz is currently active
    if (activeQuizRef.current) {
      videoRef.current.currentTime = activeQuizRef.current.timestamp_sec;
      return;
    }

    if (videoRef.current.currentTime > maxWatchedRef.current + 1.0) {
      videoRef.current.currentTime = maxWatchedRef.current;
    }
  }

  function handlePlay() {
    // Prevent unpausing if a quiz is active
    if (activeQuizRef.current && videoRef.current) {
      videoRef.current.pause();
    }
  }

  function handleQuizAnswer(quizId: string, optionIndex: number) {
    if (!activeQuiz || activeQuiz.id !== quizId || quizFeedback) return;

    setSelectedOption(optionIndex);

    if (activeQuiz.correct_index === optionIndex) {
      // ✅ Correct — show green banner briefly, then resume
      setQuizFeedback('correct');
      setTimeout(() => {
        setAnsweredQuizzes((prev) => ({ ...prev, [quizId]: true }));
        activeQuizRef.current = null;
        setActiveQuiz(null);
        setQuizFeedback(null);
        setSelectedOption(null);
        quizAttemptsRef.current[quizId] = 0; // reset attempts
        if (videoRef.current) {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              if (err.name !== 'AbortError') {
                console.warn('Video play interrupted:', err);
              }
            });
          }
        }
      }, 1200);
    } else {
      // ❌ Wrong — increment attempts
      const prevAttempts = quizAttemptsRef.current[quizId] || 0;
      const newAttempts = prevAttempts + 1;
      quizAttemptsRef.current[quizId] = newAttempts;

      setQuizFeedback('wrong');

      if (newAttempts >= 2) {
        // 2 strikes — rewind to the very beginning so they must re-watch fully
        const rewindTo = 0;

        setTimeout(() => {
          // 1. Reset anti-skip anchor FIRST (before any seek event fires)
          rewindingRef.current = true;
          maxWatchedRef.current = rewindTo;

          // 2. Clear quiz state
          activeQuizRef.current = null;
          setActiveQuiz(null);
          setQuizFeedback(null);
          setSelectedOption(null);
          quizAttemptsRef.current[quizId] = 0;
          // Remove from answeredQuizzes so the quiz fires again at the timestamp
          setAnsweredQuizzes((prev) => {
            const next = { ...prev };
            delete next[quizId];
            return next;
          });

          // 3. Seek and play — safely catch any AbortError and release rewind flag
          if (videoRef.current) {
            videoRef.current.currentTime = rewindTo;
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
              playPromise
                .catch((err) => {
                  if (err.name !== 'AbortError') {
                    console.warn('Video play interrupted:', err);
                  }
                })
                .finally(() => {
                  rewindingRef.current = false;
                });
            } else {
              rewindingRef.current = false;
            }
          } else {
            rewindingRef.current = false;
          }
        }, 1800);
      } else {
        // 1st wrong attempt — just clear the banner after 1.5s so they can try again
        setTimeout(() => {
          setQuizFeedback(null);
          setSelectedOption(null);
        }, 1500);
      }
    }
  }

  // ── Loading / Error ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <p className="text-sm font-medium">Loading course…</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg font-semibold mb-2">{error ?? 'Course not found.'}</p>
          <Link href="/dashboard" className="text-indigo-600 underline text-sm">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 mb-2 transition"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
            </Link>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
              {course.categories && (
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full uppercase tracking-wider">
                  {course.categories.name}
                </span>
              )}
            </div>
          </div>

          {/* Progress & Certificate */}
          <div className="flex items-center gap-3 flex-wrap">
            {(earnedCertId || courseCertificates[id]) && (
              <Link
                href={`/certificate/${earnedCertId || courseCertificates[id]}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold shadow-md hover:from-amber-600 hover:to-amber-700 transition"
              >
                <Award className="w-4 h-4" /> View Certificate
              </Link>
            )}
            <div className="w-full sm:w-64 bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex justify-between text-sm font-medium mb-1.5">
                <span className="text-gray-600">Your Progress</span>
                <span className="text-indigo-600 font-bold">{progressPct}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {allLessonIds.filter((lid) => completedLessons[lid]).length} / {allLessonIds.length} lessons complete
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ── BODY ────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8 items-start">

        {/* ── LEFT: Syllabus Accordion ─────────────────────────────── */}
        <div className="flex-1 w-full space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-800">Course Curriculum</h2>
          </div>

          {course.modules.map((module) => {
            const isExpanded = expandedModules.includes(module.id);
            const modDone    = module.lessons.filter((l) => completedLessons[l.id]).length;

            return (
              <div key={module.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {/* Module Header */}
                <button
                  onClick={() => toggleModule(module.id)}
                  className="w-full flex items-center justify-between p-5 bg-gray-50 hover:bg-gray-100 transition focus:outline-none"
                >
                  <div className="flex items-center text-left gap-2">
                    <span className="text-gray-400">
                      {isExpanded
                        ? <ChevronDown className="w-5 h-5" />
                        : <ChevronRight className="w-5 h-5" />}
                    </span>
                    <h3 className="font-semibold text-gray-800">{module.title}</h3>
                  </div>
                  <span className="text-xs font-medium text-gray-500 shrink-0">
                    {modDone}/{module.lessons.length} lessons
                  </span>
                </button>

                {/* Lessons */}
                {isExpanded && (
                  <div className="border-t border-gray-200 divide-y divide-gray-100">
                    {module.lessons.map((lesson) => {
                      const isActive    = activeLessonId === lesson.id;
                      const isDone      = !!completedLessons[lesson.id];
                      const isInProgress = !isDone && (maxWatchedTime[lesson.id] || 0) > 0;

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => handleLessonClick(lesson)}
                          className={`w-full flex items-center justify-between p-4 pl-12 transition-colors text-left ${
                            isActive
                              ? 'bg-indigo-50/80 border-l-4 border-indigo-600 pl-11'
                              : 'hover:bg-gray-50 border-l-4 border-transparent'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {isDone ? (
                              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                            ) : isInProgress ? (
                              /* Amber pulsing ring for in-progress */
                              <span className="relative mt-0.5 shrink-0">
                                <span className="absolute inset-0 rounded-full bg-amber-400/30 animate-ping" />
                                <PlayCircle className={`w-5 h-5 relative z-10 ${
                                  isActive ? 'text-indigo-600' : 'text-amber-500'
                                }`} />
                              </span>
                            ) : (
                              <PlayCircle
                                className={`w-5 h-5 mt-0.5 shrink-0 ${
                                  isActive ? 'text-indigo-600' : 'text-gray-300'
                                }`}
                              />
                            )}
                            <div>
                              <p className={`text-sm font-medium ${isActive ? 'text-indigo-900' : 'text-gray-700'}`}>
                                {lesson.title}
                              </p>
                              <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                {fmtSeconds(lesson.duration_seconds)}
                              </span>
                            </div>
                          </div>

                          {/* Status badges */}
                          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                            {isActive && (
                              <div className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                                Now Playing
                              </div>
                            )}
                            {!isActive && isDone && (
                              <div className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                                Done
                              </div>
                            )}
                            {!isActive && isInProgress && (
                              <div className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded">
                                In Progress
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── RIGHT: Video Player ──────────────────────────────────── */}
        <div className="w-full lg:w-[500px] shrink-0 sticky top-28">
          <div className="bg-white border border-gray-200 shadow-xl rounded-2xl overflow-hidden p-1">

            {/* ── PLAYLIST LESSON: Sidebar + Video layout ──────────── */}
            {activeLesson?.type === 'playlist' && activeLesson.playlist_urls ? (
              <div className="flex flex-col">
                {/* Playlist sidebar */}
                <div className="border-b border-gray-200 bg-gray-50 rounded-t-xl px-4 py-3">
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Playlist Series</p>
                  <p className="text-sm font-semibold text-gray-700 line-clamp-1">{activeLesson.title}</p>
                </div>
                <div className="divide-y divide-gray-100 max-h-[180px] overflow-y-auto">
                  {activeLesson.playlist_urls.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setPlaylistIndex(idx); setIsPlaying(true); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-l-4 ${
                        idx === playlistIndex
                          ? 'bg-indigo-50 border-l-indigo-600'
                          : 'hover:bg-gray-50 border-l-transparent'
                      }`}
                    >
                      <PlayCircle className={`w-4 h-4 shrink-0 ${idx === playlistIndex ? 'text-indigo-600' : 'text-gray-300'}`} />
                      <div className="flex flex-col min-w-0">
                        <span className={`text-sm font-medium truncate ${idx === playlistIndex ? 'text-indigo-900' : 'text-gray-700'}`}>
                          {idx + 1}. {item.title}
                        </span>
                        {idx === playlistIndex && isPlaying && (
                          <span className="text-[10px] uppercase font-bold text-indigo-500 mt-0.5">▶ Playing</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                {/* Playlist video */}
                <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                  {isPlaying ? (
                    <video
                      ref={playlistVideoRef}
                      key={activeLesson.playlist_urls[playlistIndex]?.url}
                      autoPlay
                      controls
                      controlsList="nodownload"
                      className="w-full h-full object-contain"
                      src={activeLesson.playlist_urls[playlistIndex]?.url}
                      onTimeUpdate={handlePlaylistTimeUpdate}
                      onSeeking={handlePlaylistSeeking}
                      onEnded={() => {
                        if (playlistIndex < activeLesson.playlist_urls!.length - 1) {
                          setPlaylistIndex(prev => prev + 1);
                        } else {
                          handleMarkComplete();
                        }
                      }}
                    />
                  ) : (
                    <>
                      <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black/90 to-transparent flex flex-col justify-end p-4 text-white z-10">
                        <span className="text-[10px] uppercase tracking-wider text-indigo-300 font-bold mb-1">
                          Part {playlistIndex + 1} of {activeLesson.playlist_urls.length}
                        </span>
                        <p className="text-sm font-semibold leading-tight line-clamp-1">
                          {activeLesson.playlist_urls[playlistIndex]?.title}
                        </p>
                      </div>
                      <button
                        onClick={() => setIsPlaying(true)}
                        className="relative z-20 outline-none flex items-center justify-center"
                      >
                        <div className="absolute bg-indigo-600/30 rounded-full w-16 h-16 animate-ping" />
                        <PlayCircle className="w-14 h-14 text-white hover:text-indigo-400 hover:scale-110 transition-all cursor-pointer shadow-2xl relative z-30 bg-black/20 rounded-full" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* ── SINGLE LESSON: Standard player ────────────────────── */
              <div
                ref={playerContainerRef}
                onDoubleClick={toggleFullscreen}
                className="aspect-video bg-black rounded-xl relative flex items-center justify-center overflow-hidden group shadow-inner"
              >
                {activeLesson?.video_url && isPlaying ? (
                  <>
                    <video
                      ref={videoRef}
                      key={activeLessonId}
                      autoPlay
                      controls={!activeQuiz}
                      controlsList="nodownload nofullscreen"
                      className="w-full h-full object-contain"
                      src={activeLesson.video_url}
                      onEnded={handleMarkComplete}
                      onTimeUpdate={handleTimeUpdate}
                      onSeeking={handleSeeking}
                      onPlay={handlePlay}
                    >
                      Your browser does not support HTML5 video.
                    </video>

                    {/* Custom Fullscreen Button */}
                    {!activeQuiz && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                        className="absolute bottom-4 right-4 z-40 bg-black/50 hover:bg-black/80 text-white p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                      </button>
                    )}

                    {/* Quiz Overlay */}
                    {activeQuiz && (
                      <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-2 sm:p-4 backdrop-blur-sm" onDoubleClick={(e) => e.stopPropagation()}>

                        {/* ── Feedback Banner (correct / wrong) ── */}
                        {quizFeedback && (
                          <div
                            className={`absolute inset-0 z-60 flex flex-col items-center justify-center gap-3 animate-in fade-in zoom-in-95 duration-300 ${
                              quizFeedback === 'correct'
                                ? 'bg-green-600/95'
                                : 'bg-red-600/95'
                            }`}
                          >
                            <div className="text-7xl select-none" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }}>
                              {quizFeedback === 'correct' ? '✅' : '❌'}
                            </div>
                            <p className="text-white text-2xl font-extrabold tracking-tight drop-shadow">
                              {quizFeedback === 'correct' ? 'Correct! Well done!' : (
                                (quizAttemptsRef.current[activeQuiz.id] || 0) >= 2
                                  ? 'Restarting from beginning…'
                                  : 'Incorrect — try once more!'
                              )}
                            </p>
                            {quizFeedback === 'wrong' && (quizAttemptsRef.current[activeQuiz.id] || 0) < 2 && (
                              <p className="text-white/80 text-sm font-medium">You have 1 attempt remaining</p>
                            )}
                            {quizFeedback === 'wrong' && (quizAttemptsRef.current[activeQuiz.id] || 0) >= 2 && (
                              <p className="text-white/80 text-sm font-medium">Re-watch the section and try again</p>
                            )}
                          </div>
                        )}

                        {/* ── Quiz Card ── */}
                        <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-5 max-w-sm w-full border border-gray-100 flex flex-col max-h-full">
                          {/* Header */}
                          <div className="flex items-center justify-between mb-2 sm:mb-3 shrink-0">
                            <div className="flex items-center gap-2 text-indigo-600">
                              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                              <h3 className="font-bold text-base sm:text-lg">Knowledge Check</h3>
                            </div>
                            {/* Attempt indicator */}
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                              {(quizAttemptsRef.current[activeQuiz.id] || 0) === 0
                                ? '2 attempts'
                                : '1 attempt left'}
                            </span>
                          </div>

                          <div className="overflow-y-auto pr-1 flex-1">
                            <p className="text-gray-800 font-medium mb-4 text-sm sm:text-base leading-snug">
                              {activeQuiz.question}
                            </p>
                            <div className="space-y-2">
                              {activeQuiz.options.map((opt, i) => {
                                const isSelected = selectedOption === i;
                                const isCorrect  = i === activeQuiz.correct_index;
                                const showResult = !!quizFeedback && isSelected;

                                return (
                                  <button
                                    key={i}
                                    onClick={() => handleQuizAnswer(activeQuiz.id, i)}
                                    disabled={!!quizFeedback}
                                    className={`w-full text-left p-2 sm:p-3 text-sm rounded-lg border font-medium shadow-sm transition-all duration-200 ${
                                      showResult && quizFeedback === 'correct'
                                        ? 'border-green-400 bg-green-50 text-green-800 ring-2 ring-green-300'
                                        : showResult && quizFeedback === 'wrong'
                                        ? 'border-red-400 bg-red-50 text-red-700 ring-2 ring-red-300'
                                        : !quizFeedback
                                        ? 'border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 cursor-pointer'
                                        : 'border-gray-100 text-gray-400 cursor-not-allowed'
                                    }`}
                                  >
                                    <span className="flex items-center gap-2">
                                      {showResult && quizFeedback === 'correct' && <span>✅</span>}
                                      {showResult && quizFeedback === 'wrong'   && <span>❌</span>}
                                      {opt}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Poster overlay */}
                    <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black/90 to-transparent flex flex-col justify-end p-6 text-white text-left z-10">
                      <span className="text-xs uppercase tracking-wider text-indigo-300 font-semibold mb-1">
                        {activeLesson ? 'Ready to Play' : 'Select a Lesson'}
                      </span>
                      <h3 className="font-bold text-lg leading-tight">
                        {activeLesson?.title ?? '—'}
                      </h3>
                    </div>

                    {/* Play button */}
                    {activeLesson?.video_url ? (
                      <button
                        onClick={() => setIsPlaying(true)}
                        className="relative z-20 outline-none flex items-center justify-center"
                      >
                        <div className="absolute bg-indigo-600/30 rounded-full w-20 h-20 animate-ping" />
                        <PlayCircle className="w-16 h-16 text-white hover:text-indigo-400 hover:scale-110 transition-all cursor-pointer shadow-2xl drop-shadow-2xl relative z-30 bg-black/20 rounded-full" />
                      </button>
                    ) : (
                      <div className="text-gray-400 text-sm z-20 flex flex-col items-center gap-2">
                        <PlayCircle className="w-12 h-12 text-gray-600 opacity-40" />
                        <span>No video available for this lesson</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Controls */}
            <div className="p-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                    {activeLesson?.title ?? 'No lesson selected'}
                  </p>
                  {activeLesson && (
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {fmtSeconds(activeLesson.duration_seconds)}
                    </p>
                  )}
                </div>

                {activeLesson && completedLessons[activeLesson.id] ? (
                  <span className="text-sm font-semibold text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-green-500" /> Completed
                  </span>
                ) : activeLesson ? (
                  <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" /> Watch to complete
                  </span>
                ) : null}
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                {course.description ??
                  'Select a lesson from the curriculum on the left to begin watching.'}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ── Certificate Celebration Modal ── */}
      {showCertCelebration && earnedCertId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center border border-indigo-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Award className="w-10 h-10 text-amber-600" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-3 py-1 rounded-full inline-block mb-3">
              Official Certification
            </span>
            <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Congratulations! 🎉</h3>
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              You have successfully completed <strong>{course.title}</strong> and earned your official Certificate of Completion!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/certificate/${earnedCertId}`}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 text-sm"
              >
                <Award className="w-4 h-4" /> View &amp; Print Certificate
              </Link>
              <button
                type="button"
                onClick={() => setShowCertCelebration(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-5 py-3 rounded-xl transition text-sm cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
