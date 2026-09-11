"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlayCircle, Clock, BookOpen, Loader2, LogOut, Shield } from 'lucide-react';
import { signout } from './login/actions';

// ── Types ─────────────────────────────────────────────────────────────
interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  categories: Category | null;
  module_count: number;
  total_duration_seconds: number;
}

// Colour map for thumbnails — keyed by category slug
const CATEGORY_COLOURS: Record<string, string> = {
  hydraulics: '#0284c7',
  pneumatics: '#0d9488',
  plc: '#4f46e5',
  sop: '#dc2626',
};

const CATEGORY_BG: Record<string, string> = {
  hydraulics: '#e0f2fe',
  pneumatics: '#ccfbf1',
  plc: '#eef2ff',
  sop: '#fee2e2',
};

function getColour(slug?: string) {
  return CATEGORY_COLOURS[slug ?? ''] ?? '#64748b';
}
function getBg(slug?: string) {
  return CATEGORY_BG[slug ?? ''] ?? '#f1f5f9';
}

// ── Category Tabs ─────────────────────────────────────────────────────
function CategoryTabs({
  categories,
  active,
  onSelect,
}: {
  categories: Category[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3 mb-12 justify-center">
      <button
        onClick={() => onSelect('all')}
        className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${active === 'all'
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105'
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-indigo-300'
          }`}
      >
        All Courses
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.slug)}
          className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${active === cat.slug
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-indigo-300'
            }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}

// ── Course Card ───────────────────────────────────────────────────────
function CourseCard({ course }: { course: Course }) {
  const slug = course.categories?.slug;
  const colour = getColour(slug);
  const bg = getBg(slug);

  return (
    <Link
      href={`/course/${course.id}`}
      className="group block bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
    >
      {/* Thumbnail */}
      <div
        className="h-48 flex items-center justify-center relative overflow-hidden"
        style={{ background: course.thumbnail_url ? undefined : bg }}
      >
        {course.thumbnail_url ? (
          /* Real thumbnail image */
          <img
            src={course.thumbnail_url}
            alt={`${course.title} thumbnail`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          /* Fallback: category-coloured play icon */
          <>
            <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
            <PlayCircle
              className="w-14 h-14 opacity-90 group-hover:scale-110 group-hover:opacity-100 transition-all duration-300"
              style={{ color: colour }}
            />
          </>
        )}
        {/* Overlay gradient on real thumbnails for polish */}
        {course.thumbnail_url && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}
      </div>

      {/* Info */}
      <div className="p-6">
        <span
          className="text-xs font-bold uppercase tracking-wider mb-2 block"
          style={{ color: colour }}
        >
          {course.categories?.name ?? 'General'}
        </span>
        <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors line-clamp-2">
          {course.title}
        </h3>
        {course.description && (
          <p className="text-sm text-gray-500 mb-3 line-clamp-2">{course.description}</p>
        )}
        <div className="flex items-center justify-between text-sm text-gray-500 border-t border-gray-100 pt-4 mt-2">
          <span className="flex items-center">
            <BookOpen className="w-4 h-4 mr-1.5 text-gray-400" />
            {course.module_count} Module{course.module_count !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center">
            <Clock className="w-4 h-4 mr-1.5 text-gray-400" />
            {(() => {
              const s = course.total_duration_seconds || 0;
              const h = Math.floor(s / 3600);
              const m = Math.floor((s % 3600) / 60);
              if (h > 0 && m > 0) return `${h} h ${m} m`;
              if (h > 0) return `${h} h`;
              if (m > 0) return `${m} m`;
              return s > 0 ? `${s} s` : '—';
            })()}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm animate-pulse">
      <div className="h-48 bg-gray-100" />
      <div className="p-6 space-y-3">
        <div className="h-3 w-20 bg-gray-100 rounded" />
        <div className="h-5 w-full bg-gray-100 rounded" />
        <div className="h-4 w-2/3 bg-gray-100 rounded" />
        <div className="h-3 w-full bg-gray-100 rounded mt-4" />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('all');
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);




  async function handleSignout() {
    await signout();
  }


  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Get current user (to filter courses by department)
        const meRes = await fetch('/api/auth/me');
        const meData = meRes.ok ? await meRes.json() : { user: null };
        const dept = meData.user?.department;
        setUserEmail(meData.user?.email ?? null);
        setUserRole(meData.user?.role ?? null);

        // Build courses URL — pass department if user has one
        const coursesUrl = dept
          ? `/api/courses?department=${encodeURIComponent(dept)}`
          : '/api/courses';

        const [coursesRes, categoriesRes] = await Promise.all([
          fetch(coursesUrl),
          fetch('/api/categories'),
        ]);

        if (!coursesRes.ok || !categoriesRes.ok) {
          throw new Error('Failed to fetch data from the server.');
        }

        const [{ courses: rawCourses }, { categories: rawCats }] =
          await Promise.all([coursesRes.json(), categoriesRes.json()]);

        // Enrich courses with derived fields
        const enriched: Course[] = (rawCourses ?? []).map((c: Course & { modules?: unknown[] }) => ({
          ...c,
          module_count: Array.isArray(c.modules) ? c.modules.length : 0,
          total_duration: '—',
        }));

        setCourses(enriched);
        setCategories(rawCats ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filtered =
    activeCategory === 'all'
      ? courses
      : courses.filter((c) => c.categories?.slug === activeCategory);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center text-xl font-bold text-gray-900 tracking-tight">
          <img
            src="/jolly-clamps-logo.png"
            alt="JOLLY Logo"
            className="h-[42px] object-contain mr-3"
          />
          <span className="hidden sm:block">Technical Training</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm font-semibold bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-100 transition shadow-sm"
          >
            My Dashboard
          </Link>
          {userRole === 'admin' && (
            <Link
              href="/admin"
              className="text-sm font-semibold bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm flex items-center gap-1.5"
            >
              <Shield size={15} />
              <span>Admin Panel</span>
            </Link>
          )}
          {userEmail && (
            <>
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                {userEmail[0].toUpperCase()}
              </div>
              <button
                onClick={handleSignout}
                className="flex items-center gap-1.5 text-sm font-semibold text-red-500 border border-red-100 bg-red-50 px-3 py-2 rounded-lg hover:bg-red-100 transition"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          )}
          {!userEmail && (
            <Link href="/login" className="text-sm font-semibold text-indigo-600 border border-indigo-200 px-4 py-2 rounded-lg hover:bg-indigo-50 transition">
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-8 py-16">
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            Level Up Your Engineering Skills
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Select a specialized category below to explore internal training modules,
            standard operating procedures.
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className="text-center py-10 bg-red-50 border border-red-200 rounded-2xl mb-10">
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-sm text-red-500 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Category Tabs — only show once categories loaded */}
        {!loading && !error && (
          <CategoryTabs
            categories={categories}
            active={activeCategory}
            onSelect={setActiveCategory}
          />
        )}

        {/* Course Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl border-dashed">
            {courses.length === 0 ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-gray-300" />
                <p className="text-gray-500 text-lg">No courses have been added yet.</p>
                {userRole === 'admin' && (
                  <p className="text-sm text-gray-400">
                    An admin can add courses from the{' '}
                    <Link href="/admin" className="text-indigo-500 underline">
                      admin panel
                    </Link>
                    .
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-lg">
                No courses in this category yet.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
