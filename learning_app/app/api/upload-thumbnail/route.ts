import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getCurrentUser } from '@/lib/auth';

// ── App Router route segment config ──────────────────────────────────────────
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.jfif', '.avif', '.bmp', '.pjpeg', '.pjp'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * POST /api/upload-thumbnail
 * Admin only. Body: FormData with field "file" (Image file, max 10 MB)
 * Returns: { publicUrl: string }
 */
export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const user = await getCurrentUser();
  console.log('[upload-thumbnail] Auth user:', user ? `${user.email} (${user.role})` : 'null — NO SESSION COOKIE');

  if (!user || user.role !== 'admin') {
    console.error('[upload-thumbnail] 403 — user not admin:', user);
    return NextResponse.json(
      { error: user ? 'Admin role required to upload thumbnails' : 'Not authenticated — please log in as Admin' },
      { status: 403 }
    );
  }

  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (parseErr) {
      console.error('[upload-thumbnail] formData parse error:', parseErr);
      return NextResponse.json({ error: 'Could not parse form data. Is the file too large?' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    console.log('[upload-thumbnail] file received:', file ? `${file.name} (${file.type}, ${file.size} bytes)` : 'null');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided in form field "file"' }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    const isImageMime = typeof file.type === 'string' && file.type.toLowerCase().startsWith('image/');
    const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext);

    if (!isImageMime && !isAllowedExt) {
      return NextResponse.json(
        { error: `File type "${file.type || ext}" is not an allowed image format. Supported formats: JPEG, PNG, WebP, SVG, GIF, AVIF.` },
        { status: 415 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: `File size ${(file.size / 1024 / 1024).toFixed(1)} MB exceeds 10 MB limit` }, { status: 413 });
    }

    // Write to public/thumbnails/
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${timestamp}_${safeName}`;
    const uploadDir = path.join(process.cwd(), 'public', 'thumbnails');

    console.log('[upload-thumbnail] writing to:', uploadDir, '/', filename);
    await fs.mkdir(uploadDir, { recursive: true });
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(path.join(uploadDir, filename), Buffer.from(arrayBuffer));

    const publicUrl = `/thumbnails/${filename}`;
    console.log('[upload-thumbnail] success:', publicUrl);
    return NextResponse.json({ publicUrl });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[upload-thumbnail] Unexpected error:', message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/upload-thumbnail
 * Debug: returns current session user info so we can verify auth is working.
 */
export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({
    authenticated: !!user,
    role: user?.role ?? null,
    email: user?.email ?? null,
  });
}
