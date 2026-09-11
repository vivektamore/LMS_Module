import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import UsersPageClient from './UsersPageClient';

export const revalidate = 0;

export default async function UsersPage() {
  const currentUser = await getCurrentUser();

  const users = await query<any[]>(`
    SELECT u.id, u.email, u.role, u.department, u.created_at,
           GROUP_CONCAT(c.title SEPARATOR '|||') AS course_titles
    FROM users u
    LEFT JOIN enrollments e ON e.user_id = u.id
    LEFT JOIN courses c ON e.course_id = c.id
    WHERE u.created_by = ?
    GROUP BY u.id, u.email, u.role, u.department, u.created_at
    ORDER BY u.created_at DESC
  `, [currentUser?.id ?? '']);

  const initialUsers = (users || []).map((u) => ({
    id: u.id,
    email: u.email || 'No email',
    role: u.role || 'employee',
    department: u.department || null,
    created_at: u.created_at,
    enrolledCourses: u.course_titles ? u.course_titles.split('|||') : [],
  }));

  return <UsersPageClient initialUsers={initialUsers} currentUserId={currentUser?.id ?? ''} />;
}
