'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Video, Users, Settings, LogOut } from 'lucide-react';
import { signout } from '@/app/login/actions';

export default function AdminSidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Courses', href: '/admin/courses', icon: Video },
    { name: 'Enrollments', href: '/admin/users', icon: Users },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
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
        {/* Brand Header */}
        <div className="h-16 flex items-center px-4 gap-3 border-b border-slate-200 bg-white">
          <img
            src="/jolly-clamps-logo.png"
            alt="Jolly Clamps"
            className="h-8 w-auto object-contain"
          />
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-tight text-slate-900 font-bold leading-none font-mono">
              Jolly Clamps
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[#a20513] font-bold mt-1">
              Admin Panel
            </span>
          </div>
        </div>

        {/* Section Heading */}
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

