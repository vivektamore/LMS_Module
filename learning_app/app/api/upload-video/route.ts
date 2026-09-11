import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getCurrentUser } from '@/lib/auth';

/**
 * POST /api/upload-video
 * Admin only. Body: FormData with field "file" (mp4)
 * Returns: { publicUrl: string, storagePath: string }
 */
export async function POST(req: NextRequest) {
  // ── Admin-only guard ──────────────────────────────────────────────────────
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can upload videos' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'video/mp4') {
      return NextResponse.json({ error: 'Only .mp4 files are accepted' }, { status: 415 });
    }

    const MAX_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File exceeds 500 MB limit' }, { status: 413 });
    }

    // Build a unique storage path: public/videos/1714390000000_filename.mp4
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${timestamp}_${safeName}`;

    // Target directory in Next.js public/videos
    const uploadDir = path.join(process.cwd(), 'public', 'videos');
    await fs.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, filename);

    // Write file directly to local server disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    // The public URL path relative to the domain (e.g. /videos/filename.mp4)
    const publicUrl = `/videos/${filename}`;

    return NextResponse.json({ publicUrl, storagePath: publicUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[upload-video] Unexpected local write error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
