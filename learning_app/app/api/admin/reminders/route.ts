import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { enrollment_ids, user_id, course_id, custom_message } = body;

    const targets: { userId: string; courseId: string; courseTitle: string; userName: string; email: string }[] = [];

    // Mode 1: Array of enrollment IDs
    if (Array.isArray(enrollment_ids) && enrollment_ids.length > 0) {
      const placeholders = enrollment_ids.map(() => '?').join(',');
      const rows = await query<any[]>(
        `SELECT e.id, e.user_id, e.course_id, u.name, u.email, c.title AS course_title
         FROM enrollments e
         JOIN users u ON e.user_id = u.id
         JOIN courses c ON e.course_id = c.id
         WHERE e.id IN (${placeholders})`,
        enrollment_ids
      );

      for (const r of rows) {
        targets.push({
          userId: r.user_id,
          courseId: r.course_id,
          courseTitle: r.course_title,
          userName: r.name || r.email,
          email: r.email,
        });
      }
    } else if (user_id && course_id) {
      // Mode 2: Single user_id and course_id
      const rows = await query<any[]>(
        `SELECT u.name, u.email, c.title AS course_title
         FROM users u, courses c
         WHERE u.id = ? AND c.id = ?`,
        [user_id, course_id]
      );
      if (rows.length > 0) {
        targets.push({
          userId: user_id,
          courseId: course_id,
          courseTitle: rows[0].course_title,
          userName: rows[0].name || rows[0].email,
          email: rows[0].email,
        });
      }
    }

    if (targets.length === 0) {
      return NextResponse.json(
        { error: 'No valid enrollment records found to send reminders.' },
        { status: 400 }
      );
    }

    let dispatchedCount = 0;
    for (const t of targets) {
      const notifId = randomUUID();
      const title = `Training Reminder: ${t.courseTitle}`;
      const message =
        custom_message ||
        `Administrator has sent a reminder regarding your enrolled course "${t.courseTitle}". Please complete your pending lessons and compliance training.`;

      await query(
        `INSERT INTO notifications (id, user_id, course_id, title, message, type, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, 'reminder', 0, NOW())`,
        [notifId, t.userId, t.courseId, title, message]
      );
      dispatchedCount++;
    }

    return NextResponse.json({
      success: true,
      dispatchedCount,
      message: `Dispatched ${dispatchedCount} training reminder notice(s).`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error dispatching reminders:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
