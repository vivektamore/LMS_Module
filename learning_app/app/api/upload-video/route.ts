import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getCurrentUser } from '@/lib/auth';
import { ensureStorageDir, generateStorageFilename } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes for large videos

/**
 * POST /api/upload-video
 * Admin only. Body: FormData with field "file" (mp4)
 * Saves video directly to Server PC storage (uploads/videos) and returns streaming URL.
 */
export async function POST(req: NextRequest) {
  // ── Admin-only guard ──────────────────────────────────────────────────────
  const user = await getCurrentUser();
  const allowBypass = process.env.ALLOW_ADMIN_BYPASS === 'true';

  if (!user && !allowBypass) {
    return NextResponse.json({ error: 'Session expired. Please sign in as admin.' }, { status: 401 });
  }

  if (user && user.role !== 'admin' && !allowBypass) {
    return NextResponse.json({ error: 'Only administrators can upload training videos.' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    const validExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.mkv'];
    if (!validExtensions.includes(ext) && file.type !== 'video/mp4') {
      return NextResponse.json({ error: 'Only .mp4 video files are accepted for LMS courses' }, { status: 415 });
    }

    const MAX_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: `Video size (${Math.round(file.size / 1024 / 1024)}MB) exceeds 500MB limit.` }, { status: 413 });
    }

    // 1. Generate unique collision-proof filename
    const filename = generateStorageFilename(file.name);

    // 2. Ensure target storage directory exists on Server PC
    const uploadDir = await ensureStorageDir('videos');
    const filePath = path.join(uploadDir, filename);

    // 3. Write file directly to Server PC disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    // 4. Also duplicate to public/videos/ for dual-route backward compatibility
    try {
      const legacyDir = path.join(process.cwd(), 'public', 'videos');
      await fs.mkdir(legacyDir, { recursive: true });
      await fs.writeFile(path.join(legacyDir, filename), buffer);
    } catch {
      // Non-fatal if legacy copy fails
    }

    // 5. Return canonical LAN streaming URL
    const publicUrl = `/uploads/videos/${filename}`;
    return NextResponse.json({ publicUrl, storagePath: publicUrl, filename, size: file.size });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[upload-video] Unexpected write error on Server PC:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
