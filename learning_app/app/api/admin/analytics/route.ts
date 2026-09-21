import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

export const revalidate = 0; // Don't cache admin analytics

function formatDuration(sec: number): string {
  if (!sec || sec <= 0) return '0s';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s > 0 ? `${s}s` : ''}`.trim();
  return `${s}s`;
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    // Only allow explicit bypass via env var — never auto-bypass in dev
    const allowBypass = process.env.ALLOW_ADMIN_BYPASS === 'true';

    if (!user && !allowBypass) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user && user.role !== 'admin' && !allowBypass) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Fetch live metrics from MySQL
    const [coursesCount] = await query<any[]>('SELECT COUNT(*) AS total FROM courses');
    const [enrollsCount] = await query<any[]>('SELECT COUNT(*) AS total FROM enrollments');
    // Use video_watch_time for accurate total watched seconds across all lessons
    const [watchSum] = await query<any[]>('SELECT COALESCE(SUM(watched_seconds), 0) AS total_sec FROM video_watch_time');
    const [activeUsersCount] = await query<any[]>(
      'SELECT COUNT(*) AS total FROM users WHERE last_sign_in_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );

    const totalCourses = coursesCount?.total || 0;
    const totalEnrollments = enrollsCount?.total || 0;
    const totalSeconds = Number(watchSum?.total_sec || 0);
    const totalHoursWatched = Math.round((totalSeconds / 3600) * 100) / 100;
    const activeSignInsCount = activeUsersCount?.total || 0;

    // 2. Compute 7-day trend data (keyed by YYYY-MM-DD for accurate alignment)
    const trendMap: Record<string, { seconds: number; dateStr: string; weekday: string }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${day}`;
      const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
      trendMap[dateKey] = { seconds: 0, dateStr: dateKey, weekday };
    }

    // Daily watch time from video_watch_time grouped by date
    const watchRecords = await query<any[]>(`
      SELECT 
        DATE_FORMAT(last_watched_at, '%Y-%m-%d') AS watch_date,
        SUM(watched_seconds) AS day_seconds
      FROM video_watch_time
      WHERE last_watched_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE_FORMAT(last_watched_at, '%Y-%m-%d')
    `);

    watchRecords.forEach((rec) => {
      const dateKey = rec.watch_date;
      if (dateKey && dateKey in trendMap) {
        trendMap[dateKey].seconds += Number(rec.day_seconds || 0);
      }
    });

    const trend = Object.values(trendMap).map((item) => ({
      day: item.weekday,
      date: item.dateStr,
      seconds: item.seconds,
      minutes: Math.round((item.seconds / 60) * 10) / 10,
      hours: Math.round((item.seconds / 3600) * 100) / 100,
      formatted: formatDuration(item.seconds),
    }));

    // 3. Fetch users list with department, enrolled & completed metrics, and certificates count
    const usersList = await query<any[]>(`
      SELECT 
        u.id, u.email, u.role, u.department, u.created_at, u.last_sign_in_at,
        (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id) AS enrolledCoursesCount,
        (SELECT COUNT(*) FROM lesson_progress lp WHERE lp.user_id = u.id AND lp.is_completed = 1) AS completedLessonsCount,
        (SELECT COUNT(*) FROM certificates c WHERE c.user_id = u.id) AS certificatesCount,
        (SELECT COALESCE(SUM(vwt.watched_seconds), 0) FROM video_watch_time vwt WHERE vwt.user_id = u.id) AS watchedSeconds
      FROM users u
      ORDER BY u.created_at DESC
    `);

    return NextResponse.json({
      stats: {
        totalCourses,
        activeSignIns: activeSignInsCount,
        videoHours: totalHoursWatched,
        totalSeconds,
        formattedWatchTime: formatDuration(totalSeconds),
        totalEnrollments,
      },
      trend,
      users: usersList,
    });
  } catch (err: any) {
    console.error('[API Admin Analytics Error]:', err.message);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
