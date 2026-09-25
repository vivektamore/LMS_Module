import { NextRequest, NextResponse } from 'next/server';
import { query, pool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { randomUUID } from 'crypto';

const DEPT_CODE_MAP: Record<string, string> = {
  MAINTENANCE: 'MNT',
  PRODUCTION: 'PRD',
  QUALITY: 'QLT',
  SAFETY: 'SAF',
  HR: 'HR',
  DESIGN: 'DSG',
  DEVELOPMENT: 'DEV',
  IT: 'IT',
  AI: 'AI',
  CENTRAL_PROCESSING_ENGINEERING: 'CPE',
  STORE: 'STR',
  DISPATCH: 'DSP',
};

function formatName(email: string): string {
  const local = email.split('@')[0] || 'Employee';
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(' ');
}

function getBadgeId(user: { id: string; department: string | null }): string {
  const deptCode = user.department ? (DEPT_CODE_MAP[user.department] || user.department.slice(0, 3).toUpperCase()) : 'EMP';
  let numStr = '001';
  if (user.id) {
    const sum = user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const num = (sum % 900) + 100; // 3 digits
    numStr = String(num);
  }
  return `JC-${deptCode}-${numStr}`;
}

export async function GET(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    // 1. Fetch all enrollments with user and course data
    const rows = await query<any[]>(`
      SELECT 
        e.id AS enrollment_id,
        e.user_id,
        e.course_id,
        e.enrolled_at,
        e.completed_at,
        u.email,
        u.name,
        u.employee_id,
        u.department,
        c.title AS course_title,
        c.course_code,
        (
          SELECT COUNT(*) 
          FROM lessons l 
          JOIN modules m ON l.module_id = m.id 
          WHERE m.course_id = c.id
        ) AS total_lessons,
        (
          SELECT COUNT(*) 
          FROM lesson_progress lp 
          JOIN lessons l2 ON lp.lesson_id = l2.id 
          JOIN modules m2 ON l2.module_id = m2.id 
          WHERE m2.course_id = c.id 
            AND lp.user_id = u.id 
            AND lp.is_completed = 1
        ) AS completed_lessons,
        (
          SELECT COALESCE(SUM(vwt.watched_seconds), 0) 
          FROM video_watch_time vwt 
          WHERE vwt.user_id = u.id 
            AND vwt.lesson_id IN (
              SELECT l3.id 
              FROM lessons l3 
              JOIN modules m3 ON l3.module_id = m3.id 
              WHERE m3.course_id = c.id
            )
        ) AS watched_seconds
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      JOIN courses c ON e.course_id = c.id
      ORDER BY e.enrolled_at DESC
    `);

    const now = new Date().getTime();

    const enrollments = rows.map((r) => {
      const totalLessons = Number(r.total_lessons || 0);
      const completedLessons = Number(r.completed_lessons || 0);
      let progressPct = 0;
      if (totalLessons > 0) {
        progressPct = Math.min(100, Math.round((completedLessons / totalLessons) * 100));
      }

      const enrolledTime = new Date(r.enrolled_at).getTime();
      const daysSinceEnrolled = (now - enrolledTime) / (1000 * 60 * 60 * 24);

      let status: 'Completed' | 'In Progress' | 'Not Started' | 'Overdue' = 'Not Started';
      if (r.completed_at || progressPct === 100) {
        status = 'Completed';
        progressPct = 100;
      } else if (daysSinceEnrolled > 21 && progressPct < 100) {
        status = 'Overdue';
      } else if (progressPct > 0 || Number(r.watched_seconds) > 0) {
        status = 'In Progress';
      } else {
        status = 'Not Started';
      }

      return {
        id: r.enrollment_id,
        userId: r.user_id,
        courseId: r.course_id,
        email: r.email,
        name: r.name || formatName(r.email),
        badgeId: r.employee_id || getBadgeId({ id: r.user_id, department: r.department }),
        department: r.department || 'GENERAL',
        courseTitle: r.course_title,
        courseCode: r.course_code || 'JC-GEN-001',
        totalLessons,
        completedLessons,
        progressPct,
        status,
        enrolledAt: r.enrolled_at,
        completedAt: r.completed_at,
      };
    });

    // 2. Compute Summary Metrics
    const uniqueUserIds = new Set(enrollments.map((e) => e.userId));
    const totalEmployees = uniqueUserIds.size;
    const totalEnrollments = enrollments.length;
    const completedCount = enrollments.filter((e) => e.status === 'Completed').length;
    const overdueCount = enrollments.filter((e) => e.status === 'Overdue').length;

    // 3. Fetch courses and employees list for the Enroll modal
    const availableCourses = await query<any[]>(
      'SELECT id, title, course_code FROM courses ORDER BY title ASC'
    );
    const availableEmployees = await query<any[]>(
      'SELECT id, email, name, employee_id, department FROM users WHERE role != "admin" ORDER BY email ASC'
    );

    return NextResponse.json({
      enrollments,
      summary: {
        totalEmployees,
        totalEnrollments,
        completedCount,
        overdueCount,
      },
      availableCourses: (availableCourses || []).map((c) => ({
        id: c.id,
        title: c.title,
        code: c.course_code || 'JC-GEN-001',
      })),
      availableEmployees: (availableEmployees || []).map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name || formatName(u.email),
        department: u.department || 'GENERAL',
        badgeId: u.employee_id || getBadgeId(u),
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error fetching admin enrollments:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { user_ids, course_ids } = body;

    if (!Array.isArray(user_ids) || !Array.isArray(course_ids) || user_ids.length === 0 || course_ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one employee and one course must be selected' },
        { status: 400 }
      );
    }

    let addedCount = 0;
    for (const userId of user_ids) {
      for (const courseId of course_ids) {
        // Check if already enrolled
        const existing = await query<any[]>(
          'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?',
          [userId, courseId]
        );
        if (existing.length === 0) {
          const id = randomUUID();
          await query(
            'INSERT INTO enrollments (id, user_id, course_id, enrolled_at) VALUES (?, ?, ?, NOW())',
            [id, userId, courseId]
          );
          addedCount++;
        }
      }
    }

    return NextResponse.json({ success: true, addedCount });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      await query('DELETE FROM enrollments WHERE id = ?', [id]);
      return NextResponse.json({ success: true });
    }

    const body = await req.json().catch(() => ({}));
    const ids = body.ids;
    if (Array.isArray(ids) && ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      await query(`DELETE FROM enrollments WHERE id IN (${placeholders})`, ids);
      return NextResponse.json({ success: true, count: ids.length });
    }

    return NextResponse.json({ error: 'id or ids are required' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
