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

    const watchRecords = await query<any[]>(`
      SELECT 
        DATE_FORMAT(last_watched_at, '%Y-%m-%d') AS watch_date,
        SUM(watched_seconds) AS day_seconds
      FROM video_watch_time
      WHERE user_id = ? AND last_watched_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE_FORMAT(last_watched_at, '%Y-%m-%d')
    `, [user.id]);

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
      formatted: `${Math.floor(item.seconds / 60)}m ${item.seconds % 60}s`,
    }));

    const weeklyMinutes = Math.round(trend.reduce((acc, curr) => acc + curr.minutes, 0));

    return NextResponse.json({ progress, watchTimes, trend, weeklyMinutes });
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
