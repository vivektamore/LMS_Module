import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  // Get user ID from JWT (always valid as long as session exists)
  const tokenUser = await getCurrentUser();
  if (!tokenUser) {
    return NextResponse.json({ user: null });
  }

  // Fetch LIVE data from DB so department/role/name changes take effect immediately
  // without requiring the user to log out and back in
  const rows = await query<any[]>(
    'SELECT id, email, name, employee_id, role, department FROM users WHERE id = ?',
    [tokenUser.id]
  );

  if (!rows.length) {
    return NextResponse.json({ user: null });
  }

  const dbUser = rows[0];

  return NextResponse.json({
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name ?? null,
      employee_id: dbUser.employee_id ?? null,
      role: dbUser.role,
      department: dbUser.department ?? null,
    },
  });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('token');
  return response;
}
