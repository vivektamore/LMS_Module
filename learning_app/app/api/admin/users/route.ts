import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { getCurrentUser } from '@/lib/auth';
import { getNextEmployeeId } from './next-id/route';

const DEPARTMENTS = [
  'HR', 'SAFETY', 'MAINTENANCE', 'PRODUCTION', 'QUALITY',
  'DESIGN', 'DEVELOPMENT', 'IT', 'AI',
  'CENTRAL_PROCESSING_ENGINEERING', 'STORE', 'DISPATCH'
];

function formatNameFromEmail(email: string): string {
  const local = email.split('@')[0] || 'Employee';
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(' ');
}

// GET /api/admin/users — list users with employee_id, name, and enrollment progress
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const users = await query<any[]>(`
      SELECT 
        u.id, u.email, u.name, u.employee_id, u.role, u.department, u.created_at, u.last_sign_in_at
      FROM users u
      ORDER BY u.created_at DESC
    `);

    // Fetch user course enrollments & progress for each user
    const userIds = (users || []).map((u) => u.id);
    const enrollmentsMap: Record<string, any[]> = {};

    if (userIds.length > 0) {
      const placeholders = userIds.map(() => '?').join(',');
      const enrollRows = await query<any[]>(`
        SELECT 
          e.user_id,
          e.course_id,
          e.enrolled_at,
          e.completed_at,
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
              AND lp.user_id = e.user_id 
              AND lp.is_completed = 1
          ) AS completed_lessons
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.user_id IN (${placeholders})
        ORDER BY e.enrolled_at DESC
      `, userIds);

      for (const row of enrollRows) {
        if (!enrollmentsMap[row.user_id]) enrollmentsMap[row.user_id] = [];
        const total = Number(row.total_lessons || 0);
        const done = Number(row.completed_lessons || 0);
        const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
        const isDone = !!row.completed_at || pct === 100;

        enrollmentsMap[row.user_id].push({
          courseId: row.course_id,
          courseTitle: row.course_title,
          courseCode: row.course_code || 'JC-GEN-001',
          totalLessons: total,
          completedLessons: done,
          progressPct: pct,
          status: isDone ? 'Completed' : pct > 0 ? 'In Progress' : 'Not Started',
          enrolledAt: row.enrolled_at,
          completedAt: row.completed_at,
        });
      }
    }

    const userList = (users || []).map((u) => {
      const userEnrolls = enrollmentsMap[u.id] || [];
      const completedCount = userEnrolls.filter((e) => e.status === 'Completed').length;
      const inProgressCount = userEnrolls.filter((e) => e.status === 'In Progress').length;
      const notStartedCount = userEnrolls.filter((e) => e.status === 'Not Started').length;

      return {
        id: u.id,
        email: u.email,
        name: u.name || formatNameFromEmail(u.email),
        employeeId: u.employee_id || 'JC-EMP-001',
        role: u.role || 'employee',
        department: u.department || 'GENERAL',
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at,
        enrolledCount: userEnrolls.length,
        completedCount,
        inProgressCount,
        notStartedCount,
        enrollments: userEnrolls,
        isCurrentUser: u.id === currentUser.id,
      };
    });

    return NextResponse.json({ users: userList });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/admin/users — create user with auto-generated or custom employee_id
export async function POST(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { email, password, name, department, role = 'employee', employee_id } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (department && !DEPARTMENTS.includes(department)) {
      return NextResponse.json({ error: 'Invalid department' }, { status: 400 });
    }

    const existing = await query<any[]>('SELECT id FROM users WHERE email = ?', [email.trim()]);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    // Auto-generate employee_id if not provided
    let finalEmpId = (employee_id || '').trim();
    if (!finalEmpId) {
      finalEmpId = await getNextEmployeeId(department);
    }

    const finalName = (name || '').trim() || formatNameFromEmail(email);
    const rawPassword = password || '12345';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const userId = randomUUID();

    await query(
      'INSERT INTO users (id, email, name, employee_id, password_hash, role, department, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, email.trim(), finalName, finalEmpId, hashedPassword, role, department || null, currentUser.id]
    );

    return NextResponse.json({ success: true, userId, employee_id: finalEmpId }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/admin/users — update user info
export async function PUT(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, email, name, employee_id, role, department, password } = body;

    if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    if (department && !DEPARTMENTS.includes(department)) {
      return NextResponse.json({ error: 'Invalid department' }, { status: 400 });
    }

    // Check if email is taken by another user
    const emailConflict = await query<any[]>(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email.trim(), id]
    );
    if (emailConflict.length > 0) {
      return NextResponse.json({ error: 'This email is already used by another account' }, { status: 409 });
    }

    const finalName = name ? name.trim() : null;
    const finalEmpId = employee_id ? employee_id.trim() : null;

    if (password && password.length >= 4) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await query(
        `UPDATE users 
         SET email = ?, name = COALESCE(?, name), employee_id = COALESCE(?, employee_id), role = ?, department = ?, password_hash = ? 
         WHERE id = ?`,
        [email.trim(), finalName, finalEmpId, role || 'employee', department || null, hashedPassword, id]
      );
    } else {
      await query(
        `UPDATE users 
         SET email = ?, name = COALESCE(?, name), employee_id = COALESCE(?, employee_id), role = ?, department = ? 
         WHERE id = ?`,
        [email.trim(), finalName, finalEmpId, role || 'employee', department || null, id]
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/admin/users — delete user
export async function DELETE(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    if (id === currentUser.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    await query('DELETE FROM users WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
