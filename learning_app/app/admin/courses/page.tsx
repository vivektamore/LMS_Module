import CourseManager from '@/components/admin/CourseManager';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const revalidate = 0;

export default async function CoursesPage() {
  const currentUser = await getCurrentUser();

  // Query all courses along with creator information
  const isAdmin = currentUser?.role === 'admin';
  const rows = await query<any[]>(`
    SELECT 
      c.id, c.title, c.course_code, c.description, c.thumbnail_url, c.created_at, c.updated_at,
      c.visibility, c.has_certificate, c.created_by,
      u.name AS creator_name, u.department AS creator_department,
      cat.id AS category_id,
      cat.name AS category_name,
      (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id) AS moduleCount,
      (SELECT COUNT(*) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = c.id) AS lessonCount,
      (SELECT COALESCE(SUM(l.duration_seconds), 0) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = c.id) AS totalDurationSeconds,
      (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrollmentCount
    FROM courses c
    LEFT JOIN users u ON c.created_by = u.id
    LEFT JOIN categories cat ON c.category_id = cat.id
    ${isAdmin ? '' : 'WHERE c.created_by = ?'}
    ORDER BY c.created_at DESC
  `, isAdmin ? [] : [currentUser?.id ?? '']);

  const categories = await query<any[]>(`
    SELECT id, name, slug FROM categories ORDER BY name ASC
  `);

  // Fetch assigned departments for each course
  const courseIds = (rows || []).map((r) => r.id);
  const deptMap: Record<string, string[]> = {};
  if (courseIds.length > 0) {
    const deptRows = await query<any[]>(
      `SELECT course_id, department FROM course_departments WHERE course_id IN (${courseIds.map(() => '?').join(',')})`,
      courseIds
    );
    for (const d of deptRows) {
      if (!deptMap[d.course_id]) deptMap[d.course_id] = [];
      deptMap[d.course_id].push(d.department);
    }
  }

  const liveCourses = (rows || []).map((c) => {
    const isOwner = Boolean(c.created_by && c.created_by === currentUser?.id);
    const isSameDept = Boolean(c.creator_department && currentUser?.department && c.creator_department === currentUser?.department);
    const isHRAdmin = currentUser?.department === 'HR';
    const canEdit = isOwner || isSameDept || isHRAdmin;

    return {
      id: c.id,
      title: c.title,
      course_code: c.course_code || '',
      description: c.description || '',
      thumbnail_url: c.thumbnail_url || null,
      category: c.category_name || 'Uncategorized',
      categoryId: c.category_id || '',
      departments: deptMap[c.id] || [],
      modules: Number(c.moduleCount || 0),
      lessons: Number(c.lessonCount || 0),
      totalDurationSeconds: Number(c.totalDurationSeconds || 0),
      enrollments: Number(c.enrollmentCount || 0),
      createdAt: c.created_at ? new Date(c.created_at).toISOString() : new Date().toISOString(),
      status: 'Published' as const,
      created_by: c.created_by || '',
      creator_name: c.creator_name || 'Admin',
      creator_department: c.creator_department || '',
      can_edit: Boolean(canEdit),
    };
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      <CourseManager
        initialCourses={liveCourses}
        initialCategories={categories || []}
        currentUserDept={currentUser?.department || ''}
      />
    </div>
  );
}
