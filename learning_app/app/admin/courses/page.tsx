import CourseManager from '@/components/admin/CourseManager';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const revalidate = 0;

export default async function CoursesPage() {
  const currentUser = await getCurrentUser();

  // Show courses created by this admin, or all courses for admin role
  const isAdmin = currentUser?.role === 'admin';
  const rows = await query<any[]>(`
    SELECT 
      c.id, c.title, c.description, c.thumbnail_url, c.created_at, c.updated_at,
      c.visibility, c.has_certificate,
      cat.id AS category_id,
      cat.name AS category_name,
      (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id) AS moduleCount,
      (SELECT COUNT(*) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = c.id) AS lessonCount,
      (SELECT COALESCE(SUM(l.duration_seconds), 0) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = c.id) AS totalDurationSeconds,
      (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrollmentCount
    FROM courses c
    LEFT JOIN categories cat ON c.category_id = cat.id
    ${isAdmin ? '' : 'WHERE c.created_by = ?'}
    ORDER BY c.created_at DESC
  `, isAdmin ? [] : [currentUser?.id ?? '']);

  const categories = await query<any[]>(`
    SELECT id, name, slug FROM categories ORDER BY name ASC
  `);

  const liveCourses = (rows || []).map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description || '',
    thumbnail_url: c.thumbnail_url || null,
    category: c.category_name || 'Uncategorized',
    categoryId: c.category_id || '',
    modules: Number(c.moduleCount || 0),
    lessons: Number(c.lessonCount || 0),
    totalDurationSeconds: Number(c.totalDurationSeconds || 0),
    enrollments: Number(c.enrollmentCount || 0),
    createdAt: c.created_at ? new Date(c.created_at).toISOString() : new Date().toISOString(),
    status: 'Published' as const,
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      <CourseManager initialCourses={liveCourses} initialCategories={categories || []} />
    </div>
  );
}
