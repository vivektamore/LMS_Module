'use server';

import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  const users = await query<any[]>('SELECT * FROM users WHERE email = ?', [email]);
  if (users.length === 0) {
    return { error: 'Invalid email or password' };
  }

  const user = users[0];
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    return { error: 'Invalid email or password' };
  }

  await query('UPDATE users SET last_sign_in_at = NOW() WHERE id = ?', [user.id]);

  const authUser = { id: user.id, email: user.email, role: user.role, department: user.department };
  const token = signToken(authUser as any);

  const cookieStore = await cookies();
  cookieStore.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });

  revalidatePath('/', 'layout');
  return { error: null };
}

export async function signout() {
  const cookieStore = await cookies();
  cookieStore.delete('token');
  revalidatePath('/', 'layout');
  redirect('/login');
}
