import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  // Get local JWT auth token from cookies
  const token = request.cookies.get('token')?.value;
  const user = token ? verifyToken(token) : null;

  const pathname = request.nextUrl.pathname;

  // Protect /dashboard, /admin, and /course — redirect to /login if not authenticated
  if (!user && (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/course')
  )) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If logged in and tries to visit /login, redirect to dashboard
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
