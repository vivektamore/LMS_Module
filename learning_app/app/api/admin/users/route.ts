import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { getCurrentUser } from '@/lib/auth';

const DEPARTMENTS = [
  'HR','SAFETY','MAINTENANCE','PRODUCTION','QUALITY',
  'DESIGN','DEVELOPMENT','IT','AI',
  'CENTRAL_PROCESSING_ENGINEERING','STORE','DISPATCH'
];

// GET /api/admin/users — list users created BY this admin only
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const users = await query<any[]>(`
    SELECT u.id, u.email, u.role, u.department, u.created_at,
           GROUP_CONCAT(c.title SEPARATOR '|||') AS course_titles
    FROM users u
    LEFT JOIN enrollments e ON e.user_id = u.id
    LEFT JOIN courses c ON e.course_id = c.id
    WHERE u.created_by = ?
    GROUP BY u.id, u.email, u.role, u.department, u.created_at
    ORDER BY u.created_at DESC
  `, [currentUser.id]);

  return NextResponse.json({ users });
}

// POST /api/admin/users — create user (admin only), saves created_by
export async function POST(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { email, password, department } = body;
  const role = 'employee'; // Admins can only create employees. Admins are created by developers via scripts/create-admin.js

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  if (department && !DEPARTMENTS.includes(department)) {
    return NextResponse.json({ error: 'Invalid department' }, { status: 400 });
  }

  const existing = await query<any[]>('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) {
    return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = randomUUID();

  await query(
    'INSERT INTO users (id, email, password_hash, role, department, created_by) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, email, hashedPassword, role, department || null, currentUser.id]
  );

  return NextResponse.json({ success: true, userId }, { status: 201 });
}

// PUT /api/admin/users — update user info (only users this admin created)
export async function PUT(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { id, email, role, department, password } = body;

  if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

  if (department && !DEPARTMENTS.includes(department)) {
    return NextResponse.json({ error: 'Invalid department' }, { status: 400 });
  }

  // Ensure the admin can only edit users they created
  const ownership = await query<any[]>(
    'SELECT id FROM users WHERE id = ? AND created_by = ?',
    [id, currentUser.id]
  );
  if (!ownership.length) {
    return NextResponse.json({ error: 'You can only edit users you created' }, { status: 403 });
  }

  // Check if email is taken by another user
  const emailConflict = await query<any[]>(
    'SELECT id FROM users WHERE email = ? AND id != ?',
    [email, id]
  );
  if (emailConflict.length > 0) {
    return NextResponse.json({ error: 'This email is already used by another account' }, { status: 409 });
  }

  if (password && password.length >= 6) {
    const hashedPassword = await bcrypt.hash(password, 10);
    await query(
      'UPDATE users SET email = ?, role = ?, department = ?, password_hash = ? WHERE id = ?',
      [email, role || 'employee', department || null, hashedPassword, id]
    );
  } else {
    await query(
      'UPDATE users SET email = ?, role = ?, department = ? WHERE id = ?',
      [email, role || 'employee', department || null, id]
    );
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/admin/users — delete user (only users this admin created)
export async function DELETE(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

  if (id === currentUser.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  // Ensure the admin can only delete users they created
  const ownership = await query<any[]>(
    'SELECT id FROM users WHERE id = ? AND created_by = ?',
    [id, currentUser.id]
  );
  if (!ownership.length) {
    return NextResponse.json({ error: 'You can only delete users you created' }, { status: 403 });
  }

  await query('DELETE FROM users WHERE id = ?', [id]);
  return NextResponse.json({ success: true });
}
