import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const revalidate = 0; // Fresh live metrics

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    // Query top learners by tutorials (lessons) completed, certificates, and watch time
    // ONLY include employees/learners (exclude administrators)
    const learners = await query<any[]>(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.employee_id,
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
      WHERE u.role != 'admin'
      GROUP BY u.id, u.email, u.name, u.employee_id, u.department, u.role
      ORDER BY completed_lessons DESC, certificates_count DESC, watched_seconds DESC, u.created_at ASC
      LIMIT 20;
    `);

    const leaderboard = learners.map((user, idx) => {
      const rank = idx + 1;
      const completed = Number(user.completed_lessons) || 0;
      const certs = Number(user.certificates_count) || 0;
      const watched = Number(user.watched_seconds) || 0;
      const points = (completed * 10) + (certs * 25) + Math.round(watched / 60);

      let badge = 'Enrolled Learner 📋';
      if (certs > 0 && completed >= 5) badge = 'Master Learner 👑';
      else if (certs > 0) badge = 'Certified Specialist 🎖️';
      else if (completed >= 3) badge = 'High Performer ⭐';
      else if (completed >= 1) badge = 'Rising Tech 🔧';
      else if (watched > 0) badge = 'Active Learner 🚀';

      return {
        rank,
        id: user.id,
        email: user.email,
        name: user.name || user.email.split('@')[0],
        employeeId: user.employee_id,
        department: user.department,
        completedLessons: completed,
        certificatesCount: certs,
        completedCourses: Number(user.completed_courses) || 0,
        watchedSeconds: watched,
        points,
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
