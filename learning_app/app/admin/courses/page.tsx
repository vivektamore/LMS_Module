import CourseManager from '@/components/admin/CourseManager';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const revalidate = 0;

export default async function CoursesPage() {
  const currentUser = await getCurrentUser();

  // Only show courses this admin created
  const rows = await query<any[]>(`
    SELECT 
      c.id, c.title, c.created_at,
      cat.name AS category_name,
      (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id) AS moduleCount,
      (SELECT COUNT(*) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = c.id) AS lessonCount,
      (SELECT COALESCE(SUM(l.duration_seconds), 0) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = c.id) AS totalDurationSeconds
    FROM courses c
    LEFT JOIN categories cat ON c.category_id = cat.id
    WHERE c.created_by = ?
    ORDER BY c.created_at DESC
  `, [currentUser?.id ?? '']);

  const liveCourses = (rows || []).map((c) => ({
    id: c.id,
    title: c.title,
    category: c.category_name || 'Uncategorized',
    modules: Number(c.moduleCount || 0),
    lessons: Number(c.lessonCount || 0),
    totalDurationSeconds: Number(c.totalDurationSeconds || 0),
    status: 'Published',
  }));

  return (
    <div className="p-8">
      <CourseManager initialCourses={liveCourses} />
    </div>
  );
}
