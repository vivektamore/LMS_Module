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

    const adminId = user?.id;

    // 1. Fetch live metrics from MySQL for this admin's created courses & users
    const [coursesCount] = adminId
      ? await query<any[]>('SELECT COUNT(*) AS total FROM courses WHERE created_by = ?', [adminId])
      : await query<any[]>('SELECT COUNT(*) AS total FROM courses');

    const [enrollsCount] = adminId
      ? await query<any[]>(
          `SELECT COUNT(*) AS total FROM enrollments e 
           JOIN users u ON e.user_id = u.id 
           WHERE u.created_by = ?`,
          [adminId]
        )
      : await query<any[]>('SELECT COUNT(*) AS total FROM enrollments');

    // Use video_watch_time for accurate total watched seconds across employees created by this admin
    const [watchSum] = adminId
      ? await query<any[]>(
          `SELECT COALESCE(SUM(vwt.watched_seconds), 0) AS total_sec 
           FROM video_watch_time vwt 
           JOIN users u ON vwt.user_id = u.id 
           WHERE u.created_by = ?`,
          [adminId]
        )
      : await query<any[]>('SELECT COALESCE(SUM(watched_seconds), 0) AS total_sec FROM video_watch_time');

    const [activeUsersCount] = adminId
      ? await query<any[]>(
          'SELECT COUNT(*) AS total FROM users WHERE created_by = ? AND last_sign_in_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
          [adminId]
        )
      : await query<any[]>(
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
    const watchRecords = adminId
      ? await query<any[]>(`
          SELECT 
            DATE_FORMAT(vwt.last_watched_at, '%Y-%m-%d') AS watch_date,
            SUM(vwt.watched_seconds) AS day_seconds
          FROM video_watch_time vwt
          JOIN users u ON vwt.user_id = u.id
          WHERE u.created_by = ? AND vwt.last_watched_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          GROUP BY DATE_FORMAT(vwt.last_watched_at, '%Y-%m-%d')
        `, [adminId])
      : await query<any[]>(`
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
    const usersList = adminId
      ? await query<any[]>(`
          SELECT 
            u.id, u.email, u.role, u.department, u.created_at, u.last_sign_in_at,
            (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id) AS enrolledCoursesCount,
            (SELECT COUNT(*) FROM lesson_progress lp WHERE lp.user_id = u.id AND lp.is_completed = 1) AS completedLessonsCount,
            (SELECT COUNT(*) FROM certificates c WHERE c.user_id = u.id) AS certificatesCount,
            (SELECT COALESCE(SUM(vwt.watched_seconds), 0) FROM video_watch_time vwt WHERE vwt.user_id = u.id) AS watchedSeconds
          FROM users u
          WHERE u.created_by = ?
          ORDER BY u.created_at DESC
        `, [adminId])
      : await query<any[]>(`
          SELECT 
            u.id, u.email, u.role, u.department, u.created_at, u.last_sign_in_at,
            (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id) AS enrolledCoursesCount,
            (SELECT COUNT(*) FROM lesson_progress lp WHERE lp.user_id = u.id AND lp.is_completed = 1) AS completedLessonsCount,
            (SELECT COUNT(*) FROM certificates c WHERE c.user_id = u.id) AS certificatesCount,
            (SELECT COALESCE(SUM(vwt.watched_seconds), 0) FROM video_watch_time vwt WHERE vwt.user_id = u.id) AS watchedSeconds
          FROM users u
          ORDER BY u.created_at DESC
        `);

    // 4. Fetch courses overview for admin dashboard
    const coursesList = adminId
      ? await query<any[]>(`
          SELECT 
            c.id, c.title, c.course_code, c.created_at,
            cat.name AS category_name, cat.slug AS category_slug,
            (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id) AS module_count,
            (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrolled_count
          FROM courses c
          LEFT JOIN categories cat ON c.category_id = cat.id
          WHERE c.created_by = ?
          ORDER BY c.created_at DESC
        `, [adminId])
      : await query<any[]>(`
          SELECT 
            c.id, c.title, c.course_code, c.created_at,
            cat.name AS category_name, cat.slug AS category_slug,
            (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id) AS module_count,
            (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrolled_count
          FROM courses c
          LEFT JOIN categories cat ON c.category_id = cat.id
          ORDER BY c.created_at DESC
        `);

    // 5. Fetch recent enrollments with user details & progress
    const recentEnrollmentRows = adminId
      ? await query<any[]>(`
          SELECT 
            e.id AS enrollment_id, e.user_id, e.course_id, e.enrolled_at, e.completed_at,
            u.email, u.department,
            c.title AS course_title,
            (SELECT COUNT(*) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = c.id) AS total_lessons,
            (SELECT COUNT(*) FROM lesson_progress lp JOIN lessons l2 ON lp.lesson_id = l2.id JOIN modules m2 ON l2.module_id = m2.id WHERE m2.course_id = c.id AND lp.user_id = u.id AND lp.is_completed = 1) AS completed_lessons,
            (SELECT COALESCE(SUM(vwt.watched_seconds), 0) FROM video_watch_time vwt WHERE vwt.user_id = u.id AND vwt.lesson_id IN (SELECT l3.id FROM lessons l3 JOIN modules m3 ON l3.module_id = m3.id WHERE m3.course_id = c.id)) AS course_watched_seconds
          FROM enrollments e
          JOIN users u ON e.user_id = u.id
          JOIN courses c ON e.course_id = c.id
          WHERE u.created_by = ?
          ORDER BY e.enrolled_at DESC
          LIMIT 50
        `, [adminId])
      : await query<any[]>(`
          SELECT 
            e.id AS enrollment_id, e.user_id, e.course_id, e.enrolled_at, e.completed_at,
            u.email, u.department,
            c.title AS course_title,
            (SELECT COUNT(*) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = c.id) AS total_lessons,
            (SELECT COUNT(*) FROM lesson_progress lp JOIN lessons l2 ON lp.lesson_id = l2.id JOIN modules m2 ON l2.module_id = m2.id WHERE m2.course_id = c.id AND lp.user_id = u.id AND lp.is_completed = 1) AS completed_lessons,
            (SELECT COALESCE(SUM(vwt.watched_seconds), 0) FROM video_watch_time vwt WHERE vwt.user_id = u.id AND vwt.lesson_id IN (SELECT l3.id FROM lessons l3 JOIN modules m3 ON l3.module_id = m3.id WHERE m3.course_id = c.id)) AS course_watched_seconds
          FROM enrollments e
          JOIN users u ON e.user_id = u.id
          JOIN courses c ON e.course_id = c.id
          ORDER BY e.enrolled_at DESC
          LIMIT 50
        `);

    let completedCount = 0;
    let inProgressCount = 0;
    let notStartedCount = 0;

    const recentEnrollments = recentEnrollmentRows.map((r) => {
      const totalLessons = Number(r.total_lessons || 0);
      const completedLessons = Number(r.completed_lessons || 0);
      const watchedSec = Number(r.course_watched_seconds || 0);
      const isCompleted = !!r.completed_at || (totalLessons > 0 && completedLessons >= totalLessons);

      let progressPct = 0;
      if (isCompleted) {
        progressPct = 100;
        completedCount++;
      } else if (totalLessons > 0 && completedLessons > 0) {
        progressPct = Math.min(Math.round((completedLessons / totalLessons) * 100), 99);
        inProgressCount++;
      } else if (watchedSec > 0) {
        progressPct = 10;
        inProgressCount++;
      } else {
        notStartedCount++;
      }

      const status = isCompleted ? 'Completed' : progressPct > 0 ? 'In Progress' : 'Not Started';

      return {
        id: r.enrollment_id,
        userId: r.user_id,
        courseId: r.course_id,
        email: r.email,
        department: r.department,
        courseTitle: r.course_title,
        enrolledAt: r.enrolled_at,
        progressPct,
        status,
        watchedSeconds: watchedSec,
      };
    });

    const totalEnrollmentRecords = recentEnrollments.length;
    const overallCompletionRate = totalEnrollmentRecords > 0 
      ? Math.round((completedCount / totalEnrollmentRecords) * 100) 
      : 0;

    return NextResponse.json({
      stats: {
        totalCourses,
        activeSignIns: activeSignInsCount,
        videoHours: totalHoursWatched,
        totalSeconds,
        formattedWatchTime: formatDuration(totalSeconds),
        totalEnrollments,
        completedCount,
        inProgressCount,
        notStartedCount,
        completionRate: overallCompletionRate,
      },
      trend,
      users: usersList,
      courses: coursesList,
      recentEnrollments,
    });
  } catch (err: any) {
    console.error('[API Admin Analytics Error]:', err.message);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
