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
    const enrollments = await query<any[]>(
      'SELECT course_id, enrolled_at, completed_at FROM enrollments WHERE user_id = ?',
      [user.id]
    );
    return NextResponse.json({ enrollments });
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
    const { course_id } = await request.json();
    if (!course_id) {
      return NextResponse.json({ error: 'course_id is required' }, { status: 400 });
    }

    // Verify department authorization for non-admin users
    if (user.role !== 'admin') {
      const courseRows = await query<any[]>(
        'SELECT visibility FROM courses WHERE id = ?',
        [course_id]
      );
      if (!courseRows.length) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }
      if (courseRows[0].visibility === 'specific') {
        const deptRows = await query<any[]>(
          'SELECT 1 FROM course_departments WHERE course_id = ? AND department = ?',
          [course_id, user.department]
        );
        if (deptRows.length === 0) {
          return NextResponse.json(
            { error: 'Cannot enroll: this course is not available for your department.' },
            { status: 403 }
          );
        }
      }
    }

    const id = uuidv4();
    await query(
      `INSERT INTO enrollments (id, user_id, course_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE enrolled_at = enrolled_at`,
      [id, user.id, course_id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
