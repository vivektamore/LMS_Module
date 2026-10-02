import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const notifications = await query<any[]>(
      `SELECT n.id, n.title, n.message, n.type, n.course_id, n.is_read, n.created_at,
              c.title AS course_title
       FROM notifications n
       LEFT JOIN courses c ON n.course_id = c.id
       WHERE n.user_id = ?
       ORDER BY n.is_read ASC, n.created_at DESC
       LIMIT 20`,
      [user.id]
    );

    const unreadCount = (notifications || []).filter((n) => !n.is_read).length;

    return NextResponse.json({ notifications: notifications || [], unreadCount });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { id, markAllRead } = body;

    if (markAllRead) {
      await query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [user.id]);
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (id) {
      await query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, user.id]);
      return NextResponse.json({ success: true, message: 'Notification marked as read' });
    }

    return NextResponse.json({ error: 'id or markAllRead is required' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
