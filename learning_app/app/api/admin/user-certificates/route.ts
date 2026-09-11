import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/admin/user-certificates?user_id=xxx
 * Admin only. Returns all certificates earned by the given user.
 */
export async function GET(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const userId = new URL(req.url).searchParams.get('user_id');
  if (!userId) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  const certs = await query<any[]>(`
    SELECT c.id, c.issued_at,
           u.email,
           cr.title AS course_title
    FROM certificates c
    JOIN users u   ON u.id  = c.user_id
    JOIN courses cr ON cr.id = c.course_id
    WHERE c.user_id = ?
    ORDER BY c.issued_at DESC
  `, [userId]);

  return NextResponse.json({ certificates: certs });
}
