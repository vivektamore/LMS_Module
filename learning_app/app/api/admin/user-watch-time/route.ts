import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Verify ownership: Admin can inspect employees they created, legacy users, or self
    const targetUser = await query<any[]>(
      'SELECT id, email, department, created_at, last_sign_in_at FROM users WHERE id = ? AND (created_by = ? OR created_by IS NULL OR id = ?)',
      [userId, currentUser.id, currentUser.id]
    );

    if (!targetUser.length) {
      return NextResponse.json({ error: 'User not found or not created by you' }, { status: 404 });
    }

    // Fetch individual lesson watch time records
    const watchRecords = await query<any[]>(
      `SELECT 
        c.id AS course_id,
        c.title AS course_title,
        m.title AS module_title,
        l.id AS lesson_id,
        l.title AS lesson_title,
        l.duration_seconds,
        COALESCE(vwt.watched_seconds, 0) AS watched_seconds,
        COALESCE(lp.is_completed, 0) AS is_completed,
        lp.completed_at,
        vwt.last_watched_at
      FROM video_watch_time vwt
      JOIN lessons l ON vwt.lesson_id = l.id
      JOIN modules m ON l.module_id = m.id
      JOIN courses c ON m.course_id = c.id
      LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = vwt.user_id
      WHERE vwt.user_id = ?
      ORDER BY vwt.last_watched_at DESC`,
      [userId]
    );

    // Also fetch courses user is enrolled in
    const enrolledCourses = await query<any[]>(
      `SELECT 
        c.id, c.title, e.enrolled_at, e.completed_at,
        (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id) AS module_count,
        (SELECT COUNT(*) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = c.id) AS lesson_count,
        (SELECT COUNT(*) FROM lesson_progress lp JOIN lessons l ON lp.lesson_id = l.id JOIN modules m ON l.module_id = m.id WHERE m.course_id = c.id AND lp.user_id = ? AND lp.is_completed = 1) AS completed_lessons,
        (SELECT COALESCE(SUM(vwt.watched_seconds), 0) FROM video_watch_time vwt JOIN lessons l ON vwt.lesson_id = l.id JOIN modules m ON l.module_id = m.id WHERE m.course_id = c.id AND vwt.user_id = ?) AS course_watched_seconds
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = ?
      ORDER BY e.enrolled_at DESC`,
      [userId, userId, userId]
    );

    const totalWatchedSeconds = watchRecords.reduce((acc, r) => acc + (Number(r.watched_seconds) || 0), 0);

    return NextResponse.json({
      user: targetUser[0],
      totalWatchedSeconds,
      watchRecords,
      enrolledCourses,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API user-watch-time error]:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
