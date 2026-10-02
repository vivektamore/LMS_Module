'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, ArrowRight, X, Clock, AlertTriangle } from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  course_id?: string | null;
  course_title?: string | null;
  is_read: boolean | number;
  created_at: string;
}

interface ReminderBannerProps {
  fallbackIncompleteCourse?: {
    id: string;
    title: string;
    progressPct: number;
  } | null;
}

export default function ReminderBanner({ fallbackIncompleteCourse }: ReminderBannerProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
        }
      } catch (err) {
        console.error('Failed to load notifications:', err);
      } finally {
        setLoading(false);
      }
    }
    loadNotifications();
  }, []);

  const activeReminder = notifications.find(
    (n) => (!n.is_read || n.is_read === 0) && !dismissedIds[n.id]
  );

  async function handleDismiss(id: string) {
    setDismissedIds((prev) => ({ ...prev, [id]: true }));
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  }

  // 1. Priority: Explicit admin-dispatched training reminder
  if (activeReminder) {
    const courseUrl = activeReminder.course_id ? `/course/${activeReminder.course_id}` : '/dashboard';

    return (
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 text-white p-4 sm:p-5 rounded-2xl shadow-lg border border-amber-400/30 animate-in fade-in slide-in-from-top-4 duration-300">
        {/* Subtle background glow */}
        <div className="absolute -right-12 -top-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl text-white shadow-inner shrink-0 mt-0.5 sm:mt-0">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider bg-white/25 px-2 py-0.5 rounded-full">
                  Training Action Required
                </span>
                <span className="text-xs text-amber-100 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Assigned Reminder
                </span>
              </div>
              <h3 className="font-bold text-base sm:text-lg mt-1 tracking-tight text-white">
                {activeReminder.title}
              </h3>
              <p className="text-sm text-amber-50/90 mt-0.5 max-w-2xl leading-relaxed">
                {activeReminder.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end pt-2 sm:pt-0">
            <Link
              href={courseUrl}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-amber-900 font-bold text-xs uppercase tracking-wide hover:bg-amber-50 transition-all shadow-md hover:shadow-lg active:scale-95 w-full sm:w-auto"
            >
              <span>Resume Training</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => handleDismiss(activeReminder.id)}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors shrink-0"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Fallback: Gentle auto-reminder if an employee has incomplete enrolled courses
  if (fallbackIncompleteCourse && fallbackIncompleteCourse.progressPct < 100) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-[#1E293B] to-slate-800 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-700/60">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl shrink-0 mt-0.5 sm:mt-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300">
                  Course In Progress
                </span>
                <span className="text-xs text-slate-400">
                  • {fallbackIncompleteCourse.progressPct}% complete
                </span>
              </div>
              <h3 className="font-bold text-base mt-0.5 tracking-tight text-white">
                Continue learning: {fallbackIncompleteCourse.title}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Pick up right where you left off and finish your technical compliance training.
              </p>
            </div>
          </div>

          <Link
            href={`/course/${fallbackIncompleteCourse.id}`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#a20513] hover:bg-[#85040f] text-white font-bold text-xs uppercase tracking-wide transition-all shadow-md shrink-0 w-full sm:w-auto"
          >
            <span>Continue Course</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
