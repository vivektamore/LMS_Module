import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const progress = await query<any[]>(
      'SELECT lesson_id, completed_at, is_completed, max_watched_time_sec FROM lesson_progress WHERE user_id = ?',
      [user.id]
    );
    const watchTimes = await query<any[]>(
      'SELECT lesson_id, watched_seconds, total_seconds FROM video_watch_time WHERE user_id = ?',
      [user.id]
    );
    return NextResponse.json({ progress, watchTimes });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { lesson_id, is_completed } = await request.json();
    if (!lesson_id) {
      return NextResponse.json({ error: 'lesson_id is required' }, { status: 400 });
    }

    const id = uuidv4();
    const completedAt = is_completed ? new Date() : null;

    await query(
      `INSERT INTO lesson_progress (id, user_id, lesson_id, is_completed, completed_at)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE is_completed = VALUES(is_completed), completed_at = VALUES(completed_at)`,
      [id, user.id, lesson_id, is_completed ? 1 : 0, completedAt]
    );

    return NextResponse.json({ progress: { lesson_id, completed_at: completedAt } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
