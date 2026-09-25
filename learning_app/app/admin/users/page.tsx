import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import UserManager, { UserItem, UserEnrollmentInfo } from '@/components/admin/UserManager';
import { redirect } from 'next/navigation';

export const revalidate = 0;

function formatNameFromEmail(email: string): string {
  const local = email.split('@')[0] || 'Employee';
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(' ');
}

export default async function UsersPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    redirect('/auth/login');
  }

  // Fetch all users with name and employee_id
  const users = await query<any[]>(`
    SELECT 
      u.id, u.email, u.name, u.employee_id, u.role, u.department, u.created_at, u.last_sign_in_at
    FROM users u
    ORDER BY u.created_at DESC
  `);

  const userIds = (users || []).map((u) => u.id);
  const enrollmentsMap: Record<string, UserEnrollmentInfo[]> = {};

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
        enrolledAt: row.enrolled_at ? new Date(row.enrolled_at).toISOString() : '',
        completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
      });
    }
  }

  const initialUsers: UserItem[] = (users || []).map((u) => {
    const userEnrolls = enrollmentsMap[u.id] || [];
    const completedCount = userEnrolls.filter((e) => e.status === 'Completed').length;
    const inProgressCount = userEnrolls.filter((e) => e.status === 'In Progress').length;
    const notStartedCount = userEnrolls.filter((e) => e.status === 'Not Started').length;

    return {
      id: u.id,
      email: u.email,
      name: u.name || formatNameFromEmail(u.email),
      employeeId: u.employee_id || 'JC-EMP-001',
      role: (u.role as 'admin' | 'employee' | 'student') || 'employee',
      department: u.department || 'GENERAL',
      createdAt: u.created_at ? new Date(u.created_at).toISOString() : new Date().toISOString(),
      lastSignInAt: u.last_sign_in_at ? new Date(u.last_sign_in_at).toISOString() : null,
      enrolledCount: userEnrolls.length,
      completedCount,
      inProgressCount,
      notStartedCount,
      enrollments: userEnrolls,
      isCurrentUser: u.id === currentUser.id,
    };
  });

  return <UserManager initialUsers={initialUsers} currentUserId={currentUser.id} />;
}

