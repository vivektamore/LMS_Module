import { create } from 'zustand';

export type User = {
  id: string;
  email: string;
  role: 'admin' | 'student' | 'employee';
} | null;

interface SessionSlice {
  user: User;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  clearSession: () => void;
  fetchUserData: () => Promise<boolean>;
}

interface EnrollmentSlice {
  enrolledCourseIds: string[];
  isLoadingEnrollments: boolean;
  setEnrollments: (courseIds: string[]) => void;
  enrollInCourse: (courseId: string) => Promise<void>;
}

interface ProgressSlice {
  completedLessons: Record<string, boolean>;
  maxWatchedTime: Record<string, number>;
  // Tracks total duration per lesson for % calculation
  lessonTotalSeconds: Record<string, number>;
  // Map of courseId -> certificateId
  courseCertificates: Record<string, string>;
  isLoadingProgress: boolean;
  setProgress: (completedLessonIds: string[]) => void;
  markLessonComplete: (lessonId: string) => Promise<void>;
  updateMaxWatchedTime: (lessonId: string, timeSec: number, totalSec?: number) => void;
  syncWatchtime: (lessonId: string, watchedSec: number, totalSec: number) => Promise<void>;
  checkAndIssueCertificate: (courseId: string) => Promise<{ issued: boolean; certificate_id?: string; course_title?: string; reason?: string } | null>;
  getCourseProgressPercentage: (courseLessonIds: string[]) => number;
}

type AppState = SessionSlice & EnrollmentSlice & ProgressSlice;

export const useAppStore = create<AppState>()((set, get) => ({
  // ── Session ─────────────────────────────────────────────────────
  user: null,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  clearSession: () =>
    set({
      user: null,
      isAuthenticated: false,
      enrolledCourseIds: [],
      completedLessons: {},
      maxWatchedTime: {},
      courseCertificates: {},
    }),

  fetchUserData: async () => {
    try {
      const [enrollRes, progRes, certRes] = await Promise.all([
        fetch('/api/enroll'),
        fetch('/api/progress'),
        fetch('/api/certificates'),
      ]);

      if (enrollRes.status === 401 || progRes.status === 401) {
        return false;
      }

      if (enrollRes.ok) {
        const { enrollments } = await enrollRes.json();
        const courseIds = (enrollments || []).map((e: any) => e.course_id);
        set({ enrolledCourseIds: courseIds });
      }

      if (progRes.ok) {
        const { progress, watchTimes } = await progRes.json();
        const comp: Record<string, boolean> = {};
        const maxWatched: Record<string, number> = {};
        const totals: Record<string, number> = {};

        (progress || []).forEach((p: any) => {
          if (p.is_completed || p.completed_at) comp[p.lesson_id] = true;
          if (p.max_watched_time_sec) {
            maxWatched[p.lesson_id] = Math.max(maxWatched[p.lesson_id] || 0, p.max_watched_time_sec);
          }
        });

        (watchTimes || []).forEach((w: any) => {
          if (w.watched_seconds) {
            maxWatched[w.lesson_id] = Math.max(maxWatched[w.lesson_id] || 0, w.watched_seconds);
          }
          if (w.total_seconds) {
            totals[w.lesson_id] = w.total_seconds;
          }
        });

        set({
          completedLessons: comp,
          maxWatchedTime: maxWatched,
          lessonTotalSeconds: totals,
        });
      }

      if (certRes.ok) {
        const { certificates } = await certRes.json();
        const certMap: Record<string, string> = {};
        (certificates || []).forEach((c: any) => {
          if (c.course_id && c.id) {
            certMap[c.course_id] = c.id;
          }
        });
        set({ courseCertificates: certMap });
      }

      return true;
    } catch (e) {
      console.error('fetchUserData failed', e);
      return false;
    }
  },

  // ── Enrollments ─────────────────────────────────────────────────
  enrolledCourseIds: [],
  isLoadingEnrollments: false,

  setEnrollments: (courseIds) => set({ enrolledCourseIds: courseIds }),

  enrollInCourse: async (courseId) => {
    const state = get();
    if (state.enrolledCourseIds.includes(courseId)) return;

    // Optimistic update
    set({ enrolledCourseIds: [...state.enrolledCourseIds, courseId] });

    try {
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: courseId }),
      });
      if (!res.ok) {
        // Revert on error
        set({
          enrolledCourseIds: state.enrolledCourseIds.filter((id) => id !== courseId),
        });
      }
    } catch (e) {
      console.error('Enroll API failed', e);
      set({
        enrolledCourseIds: state.enrolledCourseIds.filter((id) => id !== courseId),
      });
    }
  },

  // ── Progress & Watch Time ────────────────────────────────────────
  completedLessons: {},
  maxWatchedTime: {},
  lessonTotalSeconds: {},
  courseCertificates: {},
  isLoadingProgress: false,

  setProgress: (completedLessonIds) => {
    const comp: Record<string, boolean> = {};
    completedLessonIds.forEach((id) => {
      comp[id] = true;
    });
    set({ completedLessons: comp });
  },

  // Marks lesson complete via server-side progress endpoint
  markLessonComplete: async (lessonId) => {
    const state = get();
    if (state.completedLessons[lessonId]) return;

    // Optimistic update
    set({
      completedLessons: { ...state.completedLessons, [lessonId]: true },
    });

    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lesson_id: lessonId, is_completed: true }),
      });
      if (!res.ok) {
        const err = await res.json();
        console.error('Mark complete API error:', err);
      }
    } catch (e) {
      console.error('Mark complete failed', e);
    }
  },

  // POST watch progress to DB — called immediately (on video end) or throttled
  syncWatchtime: async (lessonId, watchedSec, totalSec) => {
    if (!lessonId || watchedSec <= 0) return;
    try {
      const res = await fetch('/api/progress/watchtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: lessonId,
          watched_seconds: Math.round(watchedSec),
          total_seconds: Math.round(totalSec),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.is_completed) {
          const state = get();
          set({
            completedLessons: { ...state.completedLessons, [lessonId]: true },
          });
        }
      }
    } catch (e) {
      console.error('syncWatchtime failed', e);
    }
  },

  // Updates in-memory anti-skip tracker and throttle-syncs to DB every 5s
  updateMaxWatchedTime: (lessonId, timeSec, totalSec = 0) => {
    const state = get();
    const currentMax = state.maxWatchedTime[lessonId] || 0;
    if (timeSec <= currentMax) return;

    set({
      maxWatchedTime: { ...state.maxWatchedTime, [lessonId]: timeSec },
      lessonTotalSeconds: totalSec > 0
        ? { ...state.lessonTotalSeconds, [lessonId]: totalSec }
        : state.lessonTotalSeconds,
    });

    // Throttle: sync to DB at most once every 5s
    const key = `_wt_last_sync_${lessonId}`;
    const lastSync = (window as any)[key] || 0;
    const now = Date.now();
    if (now - lastSync >= 5_000) {
      (window as any)[key] = now;
      get().syncWatchtime(lessonId, timeSec, totalSec || state.lessonTotalSeconds[lessonId] || 0);
    }
  },

  // Auto-checks and issues certificate when course is 100% complete
  checkAndIssueCertificate: async (courseId: string) => {
    if (!courseId) return null;
    try {
      const res = await fetch('/api/certificates/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: courseId }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.issued && data.certificate_id) {
        const state = get();
        set({
          courseCertificates: {
            ...state.courseCertificates,
            [courseId]: data.certificate_id,
          },
        });
      }
      return data;
    } catch (e) {
      console.error('checkAndIssueCertificate failed', e);
      return null;
    }
  },

  // Derived / computed
  getCourseProgressPercentage: (courseLessonIds) => {
    const state = get();
    if (!courseLessonIds.length) return 0;

    let totalScore = 0;
    for (const id of courseLessonIds) {
      if (state.completedLessons[id]) {
        totalScore += 1;
      } else {
        const watched = state.maxWatchedTime[id] || 0;
        const total = state.lessonTotalSeconds[id] || 0;
        if (watched > 0 && total > 0) {
          totalScore += Math.min(0.95, watched / total);
        } else if (watched > 0) {
          totalScore += 0.1;
        }
      }
    }

    const pct = Math.round((totalScore / courseLessonIds.length) * 100);
    const allCompleted = courseLessonIds.every((id) => state.completedLessons[id]);
    return allCompleted ? 100 : Math.min(99, pct);
  },
}));
