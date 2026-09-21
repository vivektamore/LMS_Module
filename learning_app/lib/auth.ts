import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'learning_app_jwt_secret_key_change_in_production';

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'employee' | 'student';
  department?: string | null;
}

export function signToken(user: AuthUser, expiresIn: string = '7d'): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, department: user.department ?? null },
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
