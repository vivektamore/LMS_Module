'use client';

import { useState, useEffect } from 'react';
import { Trophy, Award, Clock, BookOpen, Sparkles, ChevronRight, Loader2, Star, RefreshCw } from 'lucide-react';

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

function formatWatchTime(sec: number): string {
  if (!sec || sec <= 0) return '0m';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface LeaderboardCardProps {
  compact?: boolean;
  title?: string;
  className?: string;
}

export default function LeaderboardCard({
  compact = false,
  title = "Leadership Achievement Board",
  className = "",
}: LeaderboardCardProps) {
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAll, setShowAll] = useState(false);

  async function loadLeaderboard(silent = false) {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      if (data.leaderboard) {
        setLeaders(data.leaderboard);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadLeaderboard();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadLeaderboard(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl border border-gray-200 p-6 shadow-sm ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
              <p className="text-[11px] text-gray-400">Loading top achievers...</p>
            </div>
          </div>
          <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
        </div>
        <div className="space-y-2">
          <div className="h-12 bg-gray-50 rounded-xl animate-pulse" />
          <div className="h-12 bg-gray-50 rounded-xl animate-pulse" />
          <div className="h-12 bg-gray-50 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (leaders.length === 0) {
    return (
      <div className={`bg-white rounded-2xl border border-gray-200 p-6 shadow-sm text-center ${className}`}>
        <Trophy className="w-10 h-10 text-amber-400 mx-auto mb-2 opacity-80" />
        <h3 className="font-bold text-gray-900 text-sm mb-1">{title}</h3>
        <p className="text-xs text-gray-500 max-w-xs mx-auto">
          Start completing course tutorials and earning certificates to top the factory leadership board!
        </p>
      </div>
    );
  }

  const topThree = leaders.slice(0, 3);
  const remaining = showAll ? leaders.slice(3) : leaders.slice(3, 5);

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      {/* Header Banner */}
      <div className="p-5 bg-gradient-to-r from-amber-500/10 via-indigo-500/5 to-purple-500/10 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                {title}
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </h3>
              <p className="text-[11px] text-gray-500">Recognizing our top tutorial learners & certificate achievers</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadLeaderboard(true)}
              disabled={refreshing}
              title="Refresh Leaderboard"
              className="p-1.5 rounded-lg border border-gray-200 bg-white/80 hover:bg-white text-gray-500 hover:text-indigo-600 transition shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
            {leaders.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAll((p) => !p)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition px-2 py-1 rounded-lg hover:bg-indigo-50"
              >
                {showAll ? 'Show Top 5' : 'View All'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50/50 border-b border-gray-100">
        {topThree.map((user) => {
          const isFirst = user.rank === 1;
          const isSecond = user.rank === 2;
          const isThird = user.rank === 3;

          const rankBadge = isFirst
            ? 'bg-amber-100 text-amber-800 border-amber-300 ring-2 ring-amber-400/40'
            : isSecond
            ? 'bg-slate-200 text-slate-700 border-slate-300'
            : 'bg-amber-50 text-amber-900 border-amber-200';

          const crownColor = isFirst
            ? 'text-amber-500'
            : isSecond
            ? 'text-slate-400'
            : 'text-amber-700';

          return (
            <div
              key={user.id}
              className={`relative rounded-xl p-3.5 border transition-all ${
                isFirst
                  ? 'bg-gradient-to-b from-amber-50/80 to-white border-amber-300 shadow-sm'
                  : 'bg-white border-gray-200'
              } ${user.isCurrentUser ? 'ring-2 ring-indigo-500' : ''}`}
            >
              {/* Rank Badge */}
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center border shadow-xs ${rankBadge}`}
                >
                  {user.rank}
                </span>
                <span className={`text-sm ${crownColor}`}>
                  {isFirst ? '👑' : isSecond ? '🥈' : '🥉'}
                </span>
              </div>

              {/* User Info */}
              <div className="mb-2.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-bold text-gray-900 truncate max-w-[130px]">{user.name}</p>
                  {user.isCurrentUser && (
                    <span className="px-1.5 py-0.2 text-[9px] font-bold bg-indigo-100 text-indigo-700 rounded-full">
                      You
                    </span>
                  )}
                </div>
                {user.department && (
                  <span className="inline-block mt-0.5 text-[9px] font-semibold text-gray-500 uppercase tracking-wider">
                    {user.department.replace(/_/g, ' ')}
                  </span>
                )}
              </div>

              {/* Achievement Stats */}
              <div className="space-y-1 text-[11px] pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between text-gray-600">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-indigo-500" /> Tutorials
                  </span>
                  <span className="font-bold text-indigo-700">{user.completedLessons}</span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span className="flex items-center gap-1">
                    <Award className="w-3 h-3 text-amber-500" /> Certs
                  </span>
                  <span className="font-bold text-amber-700">{user.certificatesCount}</span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" /> Watched
                  </span>
                  <span className="font-semibold text-gray-700">{formatWatchTime(user.watchedSeconds)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ranks 4+ List */}
      {remaining.length > 0 && (
        <div className="divide-y divide-gray-100">
          {remaining.map((user) => (
            <div
              key={user.id}
              className={`p-3.5 px-5 flex items-center justify-between transition hover:bg-gray-50/70 ${
                user.isCurrentUser ? 'bg-indigo-50/40' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center shrink-0">
                  #{user.rank}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-gray-800 truncate">{user.name}</p>
                    {user.isCurrentUser && (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold bg-indigo-100 text-indigo-700 rounded-full">
                        You
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    {user.department && <span>{user.department.replace(/_/g, ' ')}</span>}
                    <span>•</span>
                    <span>{formatWatchTime(user.watchedSeconds)} watched</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-xs font-bold text-indigo-600">{user.completedLessons}</span>
                  <span className="text-[10px] text-gray-400 ml-1">tutorials</span>
                </div>
                {user.certificatesCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    {user.certificatesCount} 🏆
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
