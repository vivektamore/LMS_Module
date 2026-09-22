import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const revalidate = 0; // Fresh live metrics

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    // Query top learners by tutorials (lessons) completed, certificates, and watch time
    const learners = await query<any[]>(`
      SELECT 
        u.id,
        u.email,
        u.department,
        u.role,
        COALESCE((SELECT COUNT(*) FROM lesson_progress lp WHERE lp.user_id = u.id AND (lp.is_completed = 1 OR lp.completed_at IS NOT NULL)), 0) AS completed_lessons,
        COALESCE((SELECT COUNT(*) FROM certificates cert WHERE cert.user_id = u.id), 0) AS certificates_count,
        COALESCE((SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id AND e.completed_at IS NOT NULL), 0) AS completed_courses,
        COALESCE(
          (SELECT SUM(vwt.watched_seconds) FROM video_watch_time vwt WHERE vwt.user_id = u.id),
          (SELECT SUM(lp2.max_watched_time_sec) FROM lesson_progress lp2 WHERE lp2.user_id = u.id),
          0
        ) AS watched_seconds
      FROM users u
      GROUP BY u.id, u.email, u.department, u.role
      ORDER BY completed_lessons DESC, certificates_count DESC, watched_seconds DESC, u.created_at ASC
      LIMIT 20;
    `);

    const leaderboard = learners.map((user, idx) => {
      const rank = idx + 1;
      let badge = '';
      if (rank === 1) badge = 'Top Achiever 👑';
      else if (rank === 2) badge = 'Master Learner 🥈';
      else if (rank === 3) badge = 'High Performer 🥉';
      else if (Number(user.completed_lessons) >= 5) badge = 'Dedicated ⭐';
      else badge = 'Active Learner 🚀';

      return {
        rank,
        id: user.id,
        email: user.email,
        name: user.email.split('@')[0],
        department: user.department,
        completedLessons: Number(user.completed_lessons) || 0,
        certificatesCount: Number(user.certificates_count) || 0,
        completedCourses: Number(user.completed_courses) || 0,
        watchedSeconds: Number(user.watched_seconds) || 0,
        badge,
        isCurrentUser: currentUser ? currentUser.id === user.id : false,
      };
    });

    return NextResponse.json({ leaderboard });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API Leaderboard Error]:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
