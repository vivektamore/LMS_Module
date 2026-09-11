import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { randomUUID } from 'crypto';

// POST /api/progress/watchtime — save video watch progress
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { lesson_id, watched_seconds, total_seconds } = body;

  if (!lesson_id || watched_seconds === undefined) {
    return NextResponse.json({ error: 'lesson_id and watched_seconds required' }, { status: 400 });
  }

  // Upsert watch time record
  await query(`
    INSERT INTO video_watch_time (id, user_id, lesson_id, watched_seconds, total_seconds)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      watched_seconds = GREATEST(watched_seconds, VALUES(watched_seconds)),
      total_seconds   = VALUES(total_seconds),
      last_watched_at = NOW()
  `, [randomUUID(), user.id, lesson_id, watched_seconds, total_seconds || 0]);

  // Auto-mark lesson complete if 80%+ watched, or record in-progress watch time
  const pct = total_seconds > 0 ? (watched_seconds / total_seconds) : 0;
  const isComplete = pct >= 0.8;

  await query(`
    INSERT INTO lesson_progress (id, user_id, lesson_id, is_completed, completed_at, max_watched_time_sec)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      is_completed         = IF(VALUES(is_completed) = 1, 1, is_completed),
      completed_at         = IF(VALUES(is_completed) = 1, IFNULL(completed_at, NOW()), completed_at),
      max_watched_time_sec = GREATEST(max_watched_time_sec, VALUES(max_watched_time_sec))
  `, [
    randomUUID(),
    user.id,
    lesson_id,
    isComplete ? 1 : 0,
    isComplete ? new Date() : null,
    watched_seconds
  ]);

  return NextResponse.json({ success: true, is_completed: isComplete });
}

// GET /api/progress/watchtime?lesson_id=xxx — get watch time for a lesson
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const lesson_id = searchParams.get('lesson_id');
  if (!lesson_id) return NextResponse.json({ error: 'lesson_id required' }, { status: 400 });

  const rows = await query<any[]>(
    'SELECT watched_seconds, total_seconds FROM video_watch_time WHERE user_id = ? AND lesson_id = ?',
    [user.id, lesson_id]
  );

  return NextResponse.json(rows[0] || { watched_seconds: 0, total_seconds: 0 });
}
