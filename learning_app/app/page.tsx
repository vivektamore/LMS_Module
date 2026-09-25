"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PlayCircle,
  Clock,
  BookOpen,
  Loader2,
  LogOut,
  Shield,
  Search,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Wrench,
  Award,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { signout } from './login/actions';
import { useAppStore } from '@/store/useAppStore';

// ── Types ─────────────────────────────────────────────────────────────
interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Course {
  id: string;
  title: string;
  course_code?: string;
  description: string | null;
  thumbnail_url: string | null;
  categories: Category | null;
  module_count: number;
  total_duration_seconds: number;
  has_certificate?: boolean;
  visibility?: 'all' | 'specific';
  departments?: string[];
}

// Fallback industrial imagery from Stitch design for authentic engineering look
const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  maintenance: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBDseQD_nFajAkQlyn2dz8Cc3vptceHyo_vENBDA6V2LS1DBoXcI4xQ8XbjkEqybxpYE27IkXWyGSazf3M-JtL8nN1iz9bb9ThUZLvYI51AgAGaNo_zFxjoZqQ8OXJpaHYNeNpx5c8A5d2WFaj8FQFgDt3z2-GQrEYCMI11ROGUkX81c3lsrhS4UvG89KMDkyboQdrmEWYyyZk6c8dG3j9mSRjYN9bCTIp6RvNj7QdGbsInfpZ8-pwE',
  quality: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDS_UaU9mRDR9UKyAYt20UOuIZv15pbWLlo5c4eDLK5pX4GSUwpdJIsu2E9apIelIy757cGEl3Anze-pnk2DSRlH800TJIkgkytF1azIUuYjLAYnZtjCJ0IC6Zuad-bOeaiUIMt8GgNjMUMdjsXmhXX7jjvuDTArNQuQG0HERpUousBZhWvyAyoPIOcofDJ5J8HKLQhQfRGxJppZ5Yzze3RK1JiA_RvJNZSy83nzap8ZqeGYbWQPAWs',
  safety: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDnjXqzDNQrkGeI5Daw6u-56r0wR_DWIu9sNmExX1Xy5eN9B277Va1U8azyhtuwmFinQXLWlmRCuqXU2alvK6X2Y3scjdP9epBRiVNC2LmTEt9UVOD3lETVDNCrpvcUZhM1wLRqHpSIyLn3usWITTmcfM0GbUlqzuS1SgyOSPy0ZxoHnCaKhNb6jnWvnl2EtJurov2JxX34aMbNeKQ1uARpFdsgQ60dIyXo-3V3Mk0rrrcfSJW6CZbL',
  production: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCiH9LHtURVZx2isHpGpg2n4EBO7U_Pp6SB_g_HsfhxaCjvomz7DYS5Sl9eF6lHmturD4l_8EVzp-iO5palsKE9cgFkX3EPDIB4qxbnKDkv2ft-Qg8arWfDSZzEJMcJBms4nqdw_eVKYfm6gWOcnA2puj5IXfiosGqT1q-Km3dcRvet3POrd_PboowU360wGYKSTgo9anOBdM9PrLkzSUUZBbDDwaqVUgNFL1PIh6G47LaSNUYbRXWK',
  mechanical: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDsCTkhoA3PzQvZVyLsSM1jgxKhU3HecYS5UBvBDqSOnufAqJzc7JomxFnVNBkQiSuQzom1k4v-pkRZ94Cq4hjDQoM-RgJsuMPpfvZ4doAqbOtydsdtOBMeuBBlvcQ0M4BV0JYusSs_bPlL75ZU2K21MZ_IkPhhsoTYcDYtE3p-8YvECB2Td9WQe0G_UxLVc1ty9o0DdmtRXhaQzVHLk_FBXWUOZs7xAewM86zRjlyvHVk9FMdPBGcM',
  engineering: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDU8He34NGL4cveMvTzlBF6koVgkxxaaa-XXqWtG-6IY6Oe7Czu1H7iHGj7tZEpP9tVZhuppV1fYmyf9DgUJ7qNFcH3stsszNR79dl9Y5_YbD3V6w-dbfI4vLfB-LPPLpAdO8bsIgY14olV-50BMVT0iXJHca7lAqtVxVJ8KpJ0A1S0u7IMURFYnCMNq-F9rHp6OLIZlGlBd4feGf5uGhZqfiEITOKYNmRMfdkQDSCaiIrpk62siQ3s',
  electrical: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBDseQD_nFajAkQlyn2dz8Cc3vptceHyo_vENBDA6V2LS1DBoXcI4xQ8XbjkEqybxpYE27IkXWyGSazf3M-JtL8nN1iz9bb9ThUZLvYI51AgAGaNo_zFxjoZqQ8OXJpaHYNeNpx5c8A5d2WFaj8FQFgDt3z2-GQrEYCMI11ROGUkX81c3lsrhS4UvG89KMDkyboQdrmEWYyyZk6c8dG3j9mSRjYN9bCTIp6RvNj7QdGbsInfpZ8-pwE',
  sop: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDU8He34NGL4cveMvTzlBF6koVgkxxaaa-XXqWtG-6IY6Oe7Czu1H7iHGj7tZEpP9tVZhuppV1fYmyf9DgUJ7qNFcH3stsszNR79dl9Y5_YbD3V6w-dbfI4vLfB-LPPLpAdO8bsIgY14olV-50BMVT0iXJHca7lAqtVxVJ8KpJ0A1S0u7IMURFYnCMNq-F9rHp6OLIZlGlBd4feGf5uGhZqfiEITOKYNmRMfdkQDSCaiIrpk62siQ3s',
  plc: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBDseQD_nFajAkQlyn2dz8Cc3vptceHyo_vENBDA6V2LS1DBoXcI4xQ8XbjkEqybxpYE27IkXWyGSazf3M-JtL8nN1iz9bb9ThUZLvYI51AgAGaNo_zFxjoZqQ8OXJpaHYNeNpx5c8A5d2WFaj8FQFgDt3z2-GQrEYCMI11ROGUkX81c3lsrhS4UvG89KMDkyboQdrmEWYyyZk6c8dG3j9mSRjYN9bCTIp6RvNj7QdGbsInfpZ8-pwE',
  hydraulics: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDsCTkhoA3PzQvZVyLsSM1jgxKhU3HecYS5UBvBDqSOnufAqJzc7JomxFnVNBkQiSuQzom1k4v-pkRZ94Cq4hjDQoM-RgJsuMPpfvZ4doAqbOtydsdtOBMeuBBlvcQ0M4BV0JYusSs_bPlL75ZU2K21MZ_IkPhhsoTYcDYtE3p-8YvECB2Td9WQe0G_UxLVc1ty9o0DdmtRXhaQzVHLk_FBXWUOZs7xAewM86zRjlyvHVk9FMdPBGcM',
  pneumatics: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCiH9LHtURVZx2isHpGpg2n4EBO7U_Pp6SB_g_HsfhxaCjvomz7DYS5Sl9eF6lHmturD4l_8EVzp-iO5palsKE9cgFkX3EPDIB4qxbnKDkv2ft-Qg8arWfDSZzEJMcJBms4nqdw_eVKYfm6gWOcnA2puj5IXfiosGqT1q-Km3dcRvet3POrd_PboowU360wGYKSTgo9anOBdM9PrLkzSUUZBbDDwaqVUgNFL1PIh6G47LaSNUYbRXWK',
};

function getCourseImage(course: Course): string {
  if (course.thumbnail_url) return course.thumbnail_url;
  const slug = (course.categories?.slug || '').toLowerCase();
  for (const [key, url] of Object.entries(DEFAULT_CATEGORY_IMAGES)) {
    if (slug.includes(key)) return url;
  }
  return DEFAULT_CATEGORY_IMAGES.maintenance;
}

function getCourseCode(course: Course): string {
  if (course.course_code && course.course_code.trim()) {
    return course.course_code.trim();
  }
  const cat = (course.categories?.slug || 'JC').toUpperCase();
  const shortId = course.id.replace(/-/g, '').slice(0, 4).toUpperCase();
  if (cat.includes('SOP')) return `SOP-JC-${shortId}`;
  if (cat.includes('QUAL')) return `ISO-9001-${shortId}`;
  if (cat.includes('SAFE')) return `HSE-SAFE-${shortId}`;
  if (cat.includes('PROD')) return `MFG-STAMP-${shortId}`;
  if (cat.includes('MECH')) return `MEC-TORQ-${shortId}`;
  if (cat.includes('ENG')) return `DIN-3017-${shortId}`;
  return `JC-MOD-${shortId}`;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return 'Self-paced';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userDept, setUserDept] = useState<string | null>(null);

  // Zustand app store
  const enrolledCourseIds = useAppStore((s) => s.enrolledCourseIds);
  const courseCertificates = useAppStore((s) => s.courseCertificates);
  const fetchUserData = useAppStore((s) => s.fetchUserData);

  async function handleSignout() {
    await signout();
  }

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch current user
        const meRes = await fetch('/api/auth/me');
        const meData = meRes.ok ? await meRes.json() : { user: null };
        const dept = meData.user?.department;
        setUserEmail(meData.user?.email ?? null);
        setUserName(meData.user?.name ?? null);
        setUserRole(meData.user?.role ?? null);
        setUserDept(dept ?? null);

        // Fetch user progress / enrollments if logged in
        if (meData.user) {
          fetchUserData();
        }

        // Build courses URL
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

        setCourses(rawCourses ?? []);
        setCategories(rawCats ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [fetchUserData]);

  // Compute category counts based on currently available courses
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: courses.length };
    courses.forEach((c) => {
      const slug = c.categories?.slug;
      if (slug) {
        counts[slug] = (counts[slug] || 0) + 1;
      }
    });
    return counts;
  }, [courses]);

  // Filter courses by category and live search query
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesCategory =
        activeCategory === 'all' || course.categories?.slug === activeCategory;

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const titleMatch = course.title.toLowerCase().includes(q);
      const descMatch = (course.description || '').toLowerCase().includes(q);
      const catMatch = (course.categories?.name || '').toLowerCase().includes(q);
      const codeMatch = getCourseCode(course).toLowerCase().includes(q);

      return titleMatch || descMatch || catMatch || codeMatch;
    });
  }, [courses, activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col font-sans text-[#191c1e] antialiased">
      {/* ── Top Header Navigation Bar ──────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#E2E8F0] shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-[68px] max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between">
          {/* Logo & Brand Identity */}
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src="/jolly-clamps-logo.png"
              alt="Jolly Clamps"
              className="h-9 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col border-l border-[#E2E8F0] pl-3">
              <span className="font-semibold text-[11px] tracking-wider uppercase text-[#64748B]">
                Technical Training LMS
              </span>
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                PRECISION ENGINEERING
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-2">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-semibold text-[#565e74] hover:text-[#191c1e] hover:bg-[#eceef0] rounded-lg transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/"
              aria-current="page"
              className="px-4 py-2 bg-[#f2f4f6] text-[#a20513] font-bold text-sm rounded-lg border-b-2 border-[#a20513] transition-colors"
            >
              All Courses
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-semibold text-[#565e74] hover:text-[#191c1e] hover:bg-[#eceef0] rounded-lg transition-colors"
            >
              My Learning
            </Link>
          </nav>

          {/* Right Action Controls: Admin, User Profile, Sign Out */}
          <div className="flex items-center gap-3">
            {userRole === 'admin' && (
              <Link
                href="/admin"
                className="px-3 py-1.5 text-xs font-semibold text-[#191c1e] hover:bg-[#eceef0] transition-colors flex items-center gap-1.5 border border-[#E2E8F0] rounded-lg shadow-sm bg-white"
              >
                <Shield className="w-3.5 h-3.5 text-[#a20513]" />
                <span>Admin Panel</span>
              </Link>
            )}

            {userEmail ? (
              <div className="flex items-center gap-2.5 pl-1 sm:pl-2">
                <div className="relative flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-[#a20513] text-white flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-sm">
                    {(userName || userEmail)[0].toUpperCase()}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#16A34A] ring-2 ring-white" />
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-bold text-[#0F172A] truncate max-w-[140px]">
                    {userName || userEmail.split('@')[0]}
                  </span>
                  <span className="text-[10px] text-[#64748B] capitalize">
                    {userDept || userRole || 'Operator'}
                  </span>
                </div>
                <button
                  onClick={handleSignout}
                  title="Sign Out"
                  className="p-1.5 text-[#64748B] hover:text-[#a20513] hover:bg-red-50 rounded-lg transition-colors border-0 bg-transparent cursor-pointer ml-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#a20513] hover:bg-[#85040f] rounded-lg shadow-sm transition-all"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────────────── */}
      <main className="w-full pt-[88px] pb-16 flex-1 bg-[#f7f9fb]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex flex-col gap-6">

          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-1.5 text-[#64748B] text-xs font-semibold uppercase tracking-wider">
            <Link href="/dashboard" className="hover:text-[#a20513] transition-colors">
              Learning
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-[#a20513] font-bold">All Courses</span>
          </div>

          {/* Page Hero & Live Search Toolbar */}
          <div className="bg-white shadow-sm border border-[#E2E8F0] rounded-xl p-6 sm:p-8 flex flex-col gap-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#eceef0] text-[11px] font-mono font-bold text-[#565e74] uppercase tracking-wider">
                  <Wrench className="w-3 h-3 text-[#a20513]" />
                  JC-LMS-CATALOGUE
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
                  All Courses
                </h1>
                <p className="text-sm sm:text-base text-[#64748B]">
                  Explore technical training modules and build your engineering skills.
                </p>
              </div>

              {/* Live Search Input */}
              <div className="relative w-full lg:w-96">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] w-4 h-4 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search courses by keyword, topic, or code..."
                  className="w-full h-11 pl-10 pr-9 bg-white text-[#0F172A] text-sm border border-[#E2E8F0] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#a20513]/20 focus:border-[#a20513] transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Department / Category Filter Navigation Strip */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
              <button
                onClick={() => setActiveCategory('all')}
                className={`group inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shadow-sm cursor-pointer ${
                  activeCategory === 'all'
                    ? 'bg-[#a20513] text-white shadow-md'
                    : 'bg-white text-[#565e74] border border-[#E2E8F0] hover:bg-[#eceef0]'
                }`}
              >
                <span>All Courses</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                    activeCategory === 'all'
                      ? 'bg-white text-[#a20513]'
                      : 'bg-[#eceef0] text-[#64748B]'
                  }`}
                >
                  {categoryCounts['all'] || 0}
                </span>
              </button>

              {categories.map((cat) => {
                const count = categoryCounts[cat.slug] || 0;
                const isActive = activeCategory === cat.slug;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.slug)}
                    className={`group inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shadow-sm cursor-pointer ${
                      isActive
                        ? 'bg-[#a20513] text-white shadow-md'
                        : 'bg-white text-[#565e74] border border-[#E2E8F0] hover:bg-[#eceef0]'
                    } ${count === 0 ? 'opacity-60' : ''}`}
                  >
                    <span>{cat.name}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        isActive
                          ? 'bg-white text-[#a20513]'
                          : 'bg-[#eceef0] text-[#64748B]'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => window.location.reload()}
                className="text-xs font-bold underline hover:text-red-900 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* ── Courses Bento Grid ─────────────────────────────────── */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm animate-pulse flex flex-col"
                >
                  <div className="h-44 bg-slate-200" />
                  <div className="p-5 space-y-3 flex-1">
                    <div className="h-3 w-24 bg-slate-200 rounded" />
                    <div className="h-5 w-full bg-slate-200 rounded" />
                    <div className="h-4 w-3/4 bg-slate-100 rounded" />
                    <div className="h-9 w-full bg-slate-100 rounded mt-6" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCourses.length === 0 ? (
            /* Empty State */
            <div className="bg-white p-12 rounded-xl border border-[#E2E8F0] shadow-sm text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#eceef0] flex items-center justify-center text-[#64748B]">
                <Search className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-[#0F172A]">
                No technical courses found
              </h3>
              <p className="text-sm text-[#64748B] max-w-md mx-auto">
                {searchQuery
                  ? `No modules matched "${searchQuery}". Check your spelling or reset the filter.`
                  : 'No courses are currently available in this category.'}
              </p>
              {(searchQuery || activeCategory !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('all');
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#eceef0] hover:bg-slate-200 font-bold text-xs text-[#0F172A] rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => {
                const imageUrl = getCourseImage(course);
                const code = getCourseCode(course);
                const durationText = formatDuration(course.total_duration_seconds);
                const isEnrolled = enrolledCourseIds.includes(course.id);
                const hasCert = !!courseCertificates[course.id];

                return (
                  <article
                    key={course.id}
                    className="course-card flex flex-col bg-white rounded-xl border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all overflow-hidden relative group"
                  >
                    {/* Thumbnail Container */}
                    <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                      <img
                        src={imageUrl}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/95 text-[#0F172A] shadow-sm backdrop-blur-sm">
                          {course.categories?.name || 'Technical'}
                        </span>
                        {course.has_certificate && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#a20513] text-white shadow-sm flex items-center gap-1">
                            <Award className="w-2.5 h-2.5" />
                            Certified
                          </span>
                        )}
                        {course.visibility === 'specific' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-600 text-white shadow-sm">
                            Mandatory
                          </span>
                        )}
                      </div>

                      {/* Bottom-right SOP Code Badge */}
                      <div className="absolute bottom-2.5 right-3 font-mono text-[11px] font-bold text-white/90 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded">
                        {code}
                      </div>
                    </div>

                    {/* Card Body Info */}
                    <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                      <div className="space-y-2">
                        {/* Meta Tags */}
                        <div className="flex items-center gap-2 text-[#64748B] text-xs font-medium">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                            {course.module_count} Module{course.module_count !== 1 ? 's' : ''}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {durationText}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-lg font-bold text-[#0F172A] leading-snug group-hover:text-[#a20513] transition-colors line-clamp-2">
                          {course.title}
                        </h3>

                        {/* Description */}
                        {course.description && (
                          <p className="text-xs sm:text-sm text-[#64748B] line-clamp-2 leading-relaxed">
                            {course.description}
                          </p>
                        )}
                      </div>

                      {/* Progress & Action Strip */}
                      <div className="space-y-2.5 pt-3 border-t border-[#E2E8F0]">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          {hasCert ? (
                            <span className="font-bold text-[#16A34A] flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Completed
                            </span>
                          ) : isEnrolled ? (
                            <span className="font-bold text-[#a20513]">In Progress</span>
                          ) : (
                            <span className="text-[#64748B] bg-[#eceef0] px-2 py-0.5 rounded font-medium">
                              Not Started
                            </span>
                          )}
                          <span className="text-[#64748B]">
                            {course.module_count} Modules
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-[#eceef0] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              hasCert
                                ? 'bg-[#16A34A] w-full'
                                : isEnrolled
                                ? 'bg-[#a20513] w-1/2'
                                : 'bg-transparent w-0'
                            }`}
                          />
                        </div>

                        {/* Action Link Button */}
                        <Link
                          href={`/course/${course.id}`}
                          className={`w-full h-10 mt-1 px-4 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
                            hasCert
                              ? 'bg-white border border-[#E2E8F0] hover:bg-[#eceef0] text-[#0F172A]'
                              : 'bg-[#a20513] hover:bg-[#85040f] text-white'
                          }`}
                        >
                          {hasCert ? (
                            <>
                              <span>Review Course</span>
                              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                            </>
                          ) : isEnrolled ? (
                            <>
                              <span>Continue Learning</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          ) : (
                            <>
                              <span>Start Course</span>
                              <PlayCircle className="w-4 h-4" />
                            </>
                          )}
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── Industrial Footer ───────────────────────────────────────── */}
      <footer className="w-full bg-white border-t border-[#E2E8F0] py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-4 text-[#64748B]">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-[#0F172A]">
              Jolly Clamps Pvt. Ltd.
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-mono text-[11px] text-[#64748B]">
              PRECISION ENGINEERING DIVISION
            </span>
          </div>
          <div className="text-xs text-[#64748B]">
            © {new Date().getFullYear()} Jolly Clamps Pvt. Ltd. Mechanical Compliance & Quality Technical Training.
          </div>
        </div>
      </footer>
    </div>
  );
}
