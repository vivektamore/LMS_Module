'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Video, Users, UserCheck, Settings, LogOut, BookOpen, GraduationCap, ArrowUpRight } from 'lucide-react';
import { signout } from '@/app/login/actions';

export default function AdminSidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Courses', href: '/admin/courses', icon: Video },
    { name: 'Enrollments', href: '/admin/enrollments', icon: UserCheck },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  const learnerItems = [
    { name: 'All Courses', href: '/', icon: BookOpen, description: 'Catalog Home' },
    { name: 'My Learning', href: '/dashboard', icon: GraduationCap, description: 'Learner Portal' },
  ];

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-[220px] bg-white border-r border-slate-200 flex flex-col justify-between h-full select-none flex-shrink-0">
      <div className="flex flex-col">
        {/* Brand Header - click to go to All Courses home */}
        <Link
          href="/"
          title="Go to All Courses Home Catalog"
          className="h-16 flex items-center px-4 gap-3 border-b border-slate-200 bg-white hover:bg-slate-50 transition-colors group"
        >
          <img
            src="/jolly-clamps-logo.png"
            alt="Jolly Clamps"
            className="h-8 w-auto object-contain"
          />
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-tight text-slate-900 font-bold leading-none font-mono group-hover:text-[#a20513] transition-colors">
              Jolly Clamps
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[#a20513] font-bold mt-1">
              Admin Panel
            </span>
          </div>
        </Link>

        {/* Section Heading: Administration */}
        <div className="px-4 pt-4 pb-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold">
            Administration
          </span>
        </div>

        {/* Nav Links */}
        <nav className="flex flex-col px-2 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors font-medium ${
                  active
                    ? 'bg-[#c62828] text-white font-semibold shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Divider & Section Heading: Learner Portal */}
        <div className="px-4 pt-5 pb-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold">
            Learner View
          </span>
        </div>

        {/* Learner Links */}
        <div className="flex flex-col px-2 gap-1">
          {learnerItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors font-medium group"
                title={`Switch to ${item.name}`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 flex-shrink-0 text-slate-500 group-hover:text-slate-900 transition-colors" />
                  <span>{item.name}</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Logout Footer */}
      <div className="p-2 border-t border-slate-200 bg-white">
        <form action={signout}>
          <button
            type="submit"
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors font-medium cursor-pointer"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>Logout</span>
          </button>
        </form>
      </div>
    </aside>
  );
}

