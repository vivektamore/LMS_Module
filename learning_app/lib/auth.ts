import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'learning_app_jwt_secret_key_change_in_production';

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  employee_id?: string | null;
  role: 'admin' | 'employee' | 'student';
  department?: string | null;
  is_super_admin?: boolean;
}

export const SUPER_ADMIN_DEPARTMENTS = ['HR', 'IT', 'AI', 'DEVELOPMENT', 'GLOBAL'];

export function isSuperAdmin(user: AuthUser | null | undefined): boolean {
  if (!user || user.role !== 'admin') return false;
  const dept = (user.department || '').toUpperCase();
  return SUPER_ADMIN_DEPARTMENTS.includes(dept);
}

export function signToken(user: AuthUser, expiresIn: string = '7d'): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      employee_id: user.employee_id ?? null,
      role: user.role,
      department: user.department ?? null,
      is_super_admin: isSuperAdmin(user),
    },
    JWT_SECRET,
    { expiresIn: expiresIn as any }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function getAuthCookieOptions(maxAgeSeconds?: number) {
  // On local enterprise networks running on HTTP (e.g. http://192.168.8.163:3000),
  // client browsers block/drop cookies if secure: true.
  // Only enable secure if COOKIE_SECURE is explicitly set to 'true' (when behind HTTPS).
  const secure = process.env.COOKIE_SECURE === 'true';

  const options: any = {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
  };

  if (typeof maxAgeSeconds === 'number') {
    options.maxAge = maxAgeSeconds;
  }

  return options;
}
