'use client';

import { Plus } from 'lucide-react';

export default function CoursePageHeader() {
  function handleCreateCourseClick() {
    const builderEl = document.getElementById('course-builder');
    if (builderEl) {
      builderEl.scrollIntoView({ behavior: 'smooth' });
      // Find the first input in the course builder and focus it
      setTimeout(() => {
        const titleInput = builderEl.querySelector('input') as HTMLInputElement | null;
        if (titleInput) {
          titleInput.focus();
        }
      }, 400);
    }
  }

  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Manage Courses</h1>
        <p className="text-gray-500 mt-1">Create, update, and manage your learning material.</p>
      </div>
      <button
        onClick={handleCreateCourseClick}
        className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md font-medium cursor-pointer"
      >
        <Plus className="w-5 h-5 mr-2" />
        Create Course
      </button>
    </div>
  );
}
