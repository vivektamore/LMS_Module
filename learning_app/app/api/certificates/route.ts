import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { randomUUID } from 'crypto';

// GET /api/certificates — get current user's certificates
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const certs = await query<any[]>(`
    SELECT c.id, c.issued_at, cr.title AS course_title, cr.id AS course_id
    FROM certificates c
    JOIN courses cr ON cr.id = c.course_id
    WHERE c.user_id = ?
    ORDER BY c.issued_at DESC
  `, [user.id]);

  return NextResponse.json({ certificates: certs });
}

// POST /api/certificates/check — check & auto-issue certificate on course completion
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { course_id } = await req.json();
  if (!course_id) return NextResponse.json({ error: 'course_id required' }, { status: 400 });

  // Check course has certificate enabled
  const courseRows = await query<any[]>(
    'SELECT id, title, has_certificate FROM courses WHERE id = ?',
    [course_id]
  );
  if (!courseRows.length) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  const course = courseRows[0];
  if (!course.has_certificate) return NextResponse.json({ issued: false, reason: 'No certificate for this course' });

  // Check if already issued
  const existing = await query<any[]>(
    'SELECT id FROM certificates WHERE user_id = ? AND course_id = ?',
    [user.id, course_id]
  );
  if (existing.length > 0) return NextResponse.json({ issued: true, certificate_id: existing[0].id });

  // Check if all lessons are completed
  const totalLessons = await query<any[]>(`
    SELECT COUNT(*) AS total
    FROM lessons l
    JOIN modules m ON m.id = l.module_id
    WHERE m.course_id = ?
  `, [course_id]);

  const completedLessons = await query<any[]>(`
    SELECT COUNT(*) AS completed
    FROM lesson_progress lp
    JOIN lessons l ON l.id = lp.lesson_id
    JOIN modules m ON m.id = l.module_id
    WHERE m.course_id = ? AND lp.user_id = ? AND lp.is_completed = 1
  `, [course_id, user.id]);

  const total = totalLessons[0]?.total || 0;
  const completed = completedLessons[0]?.completed || 0;

  if (total === 0 || completed < total) {
    return NextResponse.json({ issued: false, reason: `${completed}/${total} lessons completed` });
  }

  // Issue certificate
  const certId = randomUUID();
  await query(
    'INSERT INTO certificates (id, user_id, course_id) VALUES (?, ?, ?)',
    [certId, user.id, course_id]
  );

  // Mark enrollment as completed
  await query(
    'UPDATE enrollments SET completed_at = NOW() WHERE user_id = ? AND course_id = ?',
    [user.id, course_id]
  );

  return NextResponse.json({ issued: true, certificate_id: certId, course_title: course.title });
}
