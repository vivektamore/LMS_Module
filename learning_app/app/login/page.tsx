'use client';

import { useState } from 'react';
import { Eye, EyeOff, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { login } from './actions';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function friendlyError(msg: string): string {
    const lower = msg.toLowerCase();
    if (lower.includes('invalid email or password') || lower.includes('invalid credentials')) {
      return 'Incorrect email or password. Please verify your credentials and try again.';
    }
    return msg;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('email', email.trim());
      formData.append('password', password);
      formData.append('rememberMe', String(rememberMe));

      const res = await login(formData);
      if (res.error) throw new Error(res.error);

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(friendlyError(err.message || 'An error occurred during authentication. Please try again.'));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col justify-between antialiased selection:bg-[#c62828] selection:text-white relative">
      {/* Background Engineering Pattern */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-60 z-0"
        style={{
          backgroundImage: 'radial-gradient(#cbd5e1 0.75px, transparent 0.75px), radial-gradient(#e2e8f0 0.75px, #f8fafc 0.75px)',
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0, 12px 12px'
        }}
      />

      {/* Top Decorative Engineering Status Bar */}
      <div className="w-full bg-[#0f172a] border-b border-slate-800 py-1.5 px-4 z-10 text-center">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-[11px] font-mono tracking-wider text-slate-400 uppercase">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-300 font-medium">System Online</span>
          </div>
          <div className="text-slate-400">
            <span className="text-amber-400 font-semibold">Notice:</span> Jolly EMPLOYEE ONLY
          </div>
        </div>
      </div>

      {/* Main Login Content Section */}
      <main className="flex-grow flex items-center justify-center p-4 sm:p-6 z-10 my-4 sm:my-8">
        <div className="w-full max-w-[440px] flex flex-col items-center">
          
          {/* Brand Header Block */}
          <header className="text-center mb-6 flex flex-col items-center">
            {/* Logo Container */}
            <div className="mb-3 p-2 bg-white rounded-xl shadow-sm border border-slate-200/80 inline-flex items-center justify-center">
              <Image 
                src="/jolly-clamps-logo.png" 
                alt="Jolly Clamps Logo" 
                width={160} 
                height={48} 
                className="h-12 w-auto object-contain block mx-auto"
                priority
              />
            </div>
            
            {/* Wordmark & Portal Sub-badge */}
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5 justify-center">
              JOLLY CLAMPS
            </h1>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#c62828] bg-red-50 border border-red-100 px-2 py-0.5 rounded">
                Technical Training LMS
              </span>
            </div>
          </header>

          {/* Authentication Card Container */}
          <section className="w-full bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Sign in to your account
              </h2>
              <p className="text-sm text-slate-500 mt-1 leading-normal">
                Use your registered employee credentials to access training modules.
              </p>
            </div>

            {/* Error / Feedback Alert Container */}
            {error && (
              <div 
                aria-live="polite" 
                className="mb-5 p-3 rounded-lg text-xs font-medium bg-red-50 text-[#c62828] border border-red-200 flex items-start gap-2 animate-fadeIn" 
                role="alert"
              >
                <AlertCircle className="w-4 h-4 text-[#c62828] shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              {/* Email Address Input Field */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1.5" htmlFor="employeeEmail">
                  Email address <span aria-hidden="true" className="text-[#c62828]">*</span>
                </label>
                <div className="relative">
                  <input
                    id="employeeEmail"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#c62828] focus:ring-2 focus:ring-[#c62828]/20 transition"
                  />
                </div>
              </div>

              {/* Password Input Field with Interactive Show/Hide Toggle */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1.5" htmlFor="employeePassword">
                  Password <span aria-hidden="true" className="text-[#c62828]">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    id="employeePassword"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#c62828] focus:ring-2 focus:ring-[#c62828]/20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-slate-500" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Session Preservation Option */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center select-none cursor-pointer">
                  <input
                    id="staySignedIn"
                    name="stay_signed_in"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#c62828] focus:ring-[#c62828]/25 cursor-pointer accent-[#c62828]"
                  />
                  <span className="ml-2.5 text-sm text-slate-600 font-normal">
                    Stay signed in for 7 days
                  </span>
                </label>
              </div>

              {/* Primary Submit Action Button */}
              <button
                id="signInButton"
                type="submit"
                disabled={loading}
                className="w-full py-3 h-12 rounded-lg bg-[#c62828] hover:bg-[#b71c1c] active:bg-[#9a1414] text-white font-medium text-base shadow-sm flex items-center justify-center gap-2 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c62828] transition-all disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin h-5 w-5 text-white" />
                    Authenticating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign in
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                )}
              </button>
            </form>

            {/* Internal Account Creation Notice & Support */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                Don&apos;t have an account?
              </p>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                Contact your HOD to request access.
              </p>
            </div>
          </section>

          {/* Security Badges & Footer Information */}
          <footer className="mt-6 text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-200/60 border border-slate-300/60 text-slate-600 text-[10px] font-mono tracking-widest uppercase">
              <Lock className="w-3 h-3 text-slate-500" />
              SECURE INDUSTRIAL ACCESS
            </div>
            <p className="text-xs text-slate-400">
              Jolly Clamps Manufacturing Group © 2026 • Internal Operations
            </p>
          </footer>
        </div>
      </main>

      {/* Minimal Decorative Footer Band */}
      <div className="py-2.5 px-4 bg-white border-t border-slate-200 text-center text-[11px] text-slate-500 z-10">
        Technical Support Hotline: Ext. 8856926700 • Plant Operations IT Desk
      </div>
    </div>
  );
}
