import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const revalidate = 0;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Certificate ID required' }, { status: 400 });
    }

    const body = await req.json();
    const { recipient_name } = body;

    if (!recipient_name || typeof recipient_name !== 'string' || !recipient_name.trim()) {
      return NextResponse.json({ error: 'Recipient name cannot be empty' }, { status: 400 });
    }

    const trimmedName = recipient_name.trim();

    // Verify certificate exists and user has permission (owner or admin)
    const certRows = await query<any[]>(
      'SELECT id, user_id FROM certificates WHERE id = ?',
      [id]
    );

    if (!certRows.length) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    const cert = certRows[0];
    if (user.role !== 'admin' && cert.user_id !== user.id) {
      return NextResponse.json({ error: 'You do not have permission to edit this certificate' }, { status: 403 });
    }

    await query(
      'UPDATE certificates SET recipient_name = ? WHERE id = ?',
      [trimmedName, id]
    );

    return NextResponse.json({ success: true, recipient_name: trimmedName });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API certificates PATCH error]:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
