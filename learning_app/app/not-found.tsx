import Link from 'next/link';
import Image from 'next/image';
import { Home, Compass, ArrowLeft, LogIn } from 'lucide-react';

export const metadata = {
  title: '404 - Page Not Found | Jolly Technical Training',
  description: "Whoops! That page doesn't exist.",
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#0b0f19] text-white flex flex-col items-center justify-center px-4 py-6 sm:py-8 relative overflow-hidden select-none">
      {/* Ambient background glow effects */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-xl w-full flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500">
        {/* 3D Character Illustration */}
        <div className="relative w-52 h-52 sm:w-64 sm:h-64 mb-4 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform hover:scale-105 duration-300">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-blue-500/10 to-transparent blur-xl -z-10" />
          <Image
            src="/404-illustration.jpg"
            alt="404 Page Not Found Illustration"
            width={320}
            height={320}
            priority
            className="w-full h-full object-contain rounded-2xl shadow-2xl border border-white/5"
          />
        </div>

        {/* 404 Status Subtitle */}
        <p className="text-blue-500 font-bold text-xs sm:text-sm tracking-wider uppercase mb-1.5">
          404 Not Found
        </p>

        {/* Main Headline */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3 leading-tight">
          Whoops! That page doesn’t exist.
        </h1>

        {/* Subtext */}
        <p className="text-slate-400 text-xs sm:text-sm mb-6 max-w-md">
          The page you’re looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>

        {/* Primary Call to Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6 w-full">
          <Link
            id="not-found-home-btn"
            href="/dashboard"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-blue-600/25 hover:shadow-blue-500/40 hover:-translate-y-0.5"
          >
            <Home className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </Link>

          <Link
            id="not-found-courses-btn"
            href="/dashboard"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 hover:text-white font-medium text-sm transition-all duration-200 hover:-translate-y-0.5"
          >
            <Compass className="w-4 h-4" />
            <span>Browse Courses</span>
          </Link>
        </div>

        {/* Helpful Links Footer Section (Matches Reference) */}
        <div className="pt-6 border-t border-slate-800/80 w-full max-w-sm">
          <p className="text-xs text-slate-500 mb-3">Here are some helpful links instead:</p>
          <nav className="flex items-center justify-center gap-4 text-xs font-medium text-slate-400">
            <Link
              href="/"
              className="hover:text-blue-400 transition-colors underline-offset-4 hover:underline"
            >
              Home
            </Link>
            <span className="text-slate-700">•</span>
            <Link
              href="/dashboard"
              className="hover:text-blue-400 transition-colors underline-offset-4 hover:underline"
            >
              Dashboard
            </Link>
            <span className="text-slate-700">•</span>
            <Link
              href="/login"
              className="hover:text-blue-400 transition-colors underline-offset-4 hover:underline"
            >
              Login
            </Link>
            <span className="text-slate-700">•</span>
            <Link
              href="/admin"
              className="hover:text-blue-400 transition-colors underline-offset-4 hover:underline"
            >
              Admin Portal
            </Link>
          </nav>
        </div>
      </div>
    </main>
  );
}
