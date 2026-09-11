'use client';

import { useState } from 'react';
import CategoryManager from '@/components/admin/CategoryManager';
import { CourseBuilder } from '@/components/admin/CourseBuilder';
import CoursePageHeader from '@/components/admin/CoursePageHeader';
import { Edit2, Trash2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CourseItem {
  id: string;
  title: string;
  category?: string;
  modules: number;
  lessons: number;
  status: string;
}

interface CourseManagerProps {
  initialCourses: CourseItem[];
}

export default function CourseManager({ initialCourses }: CourseManagerProps) {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseItem[]>(initialCourses);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Handle Edit Course click
  function handleEditCourse(id: string) {
    setEditingCourseId(id);
    const builderEl = document.getElementById('course-builder');
    if (builderEl) {
      builderEl.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // Handle Delete Course click
  async function handleDeleteCourse(course: CourseItem) {
    const confirmed = window.confirm(`Are you sure you want to delete "${course.title}"?\nThis action cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(course.id);
    try {
      const res = await fetch(`/api/courses/${course.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete course');

      // Remove course from state and refresh
      setCourses((prev) => prev.filter((c) => c.id !== course.id));
      if (editingCourseId === course.id) {
        setEditingCourseId(null);
      }
      router.refresh();
    } catch (err: any) {
      alert(`Delete Error: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  }

  function handleCourseSaved() {
    setEditingCourseId(null);
    router.refresh();
  }

  return (
    <div>
      <CoursePageHeader />

      {/* Courses List Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-12">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500 uppercase tracking-wider">
              <th className="p-4 font-medium">Course Title</th>
              <th className="p-4 font-medium">Content</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {courses.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  No courses found. Build one below!
                </td>
              </tr>
            )}
            {courses.map((course) => (
              <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-medium text-gray-900">
                  {course.title}
                  {course.category && (
                    <span className="ml-2 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50 rounded-full">
                      {course.category}
                    </span>
                  )}
                </td>
                <td className="p-4 text-sm text-gray-600">
                  {course.modules} Modules • {course.lessons} Lessons
                </td>
                <td className="p-4">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      course.status === 'Published'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {course.status}
                  </span>
                </td>
                <td className="p-4 flex justify-end space-x-2">
                  <button
                    onClick={() => handleEditCourse(course.id)}
                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                    title="Edit Course"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCourse(course)}
                    disabled={deletingId === course.id}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                    title="Delete Course"
                  >
                    {deletingId === course.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CategoryManager />

      <CourseBuilder
        editingCourseId={editingCourseId}
        onCourseSaved={handleCourseSaved}
        onCancelEdit={() => setEditingCourseId(null)}
      />
    </div>
  );
}
