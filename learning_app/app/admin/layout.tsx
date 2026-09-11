import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  // Only allow explicit bypass via env var — never auto-bypass in dev
  const allowBypass = process.env.ALLOW_ADMIN_BYPASS === 'true';

  if (!user && !allowBypass) {
    redirect('/login');
  }

  if (user && user.role !== 'admin' && !allowBypass) {
    redirect('/dashboard');
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
