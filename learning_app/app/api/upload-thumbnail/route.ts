import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getCurrentUser } from '@/lib/auth';
import { ensureStorageDir, generateStorageFilename } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.jfif', '.avif', '.bmp', '.pjpeg', '.pjp', '.ico', '.tiff', '.tif'
];
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * POST /api/upload-thumbnail
 * Admin only. Body: FormData with field "file" (Image file, max 50 MB)
 * Saves thumbnail directly to Server PC storage (uploads/thumbnails).
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const allowBypass = process.env.ALLOW_ADMIN_BYPASS === 'true';

  if (!user && !allowBypass) {
    return NextResponse.json(
      { error: 'Your session has expired. Please sign in again to upload thumbnails.' },
      { status: 401 }
    );
  }

  if (user && user.role !== 'admin' && !allowBypass) {
    return NextResponse.json(
      { error: 'Admin role required to upload thumbnails' },
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
      return NextResponse.json({ error: `File size ${(file.size / 1024 / 1024).toFixed(1)} MB exceeds 50 MB limit` }, { status: 413 });
    }

    // 1. Generate unique collision-proof filename
    const filename = generateStorageFilename(file.name);

    // 2. Ensure target storage directory exists on Server PC
    const uploadDir = await ensureStorageDir('thumbnails');
    const filePath = path.join(uploadDir, filename);

    // 3. Write file directly to Server PC disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    // 4. Also duplicate to public/thumbnails/ for dual-route backward compatibility
    try {
      const legacyDir = path.join(process.cwd(), 'public', 'thumbnails');
      await fs.mkdir(legacyDir, { recursive: true });
      await fs.writeFile(path.join(legacyDir, filename), buffer);
    } catch {
      // Non-fatal
    }

    // 5. Return canonical LAN asset URL
    const publicUrl = `/uploads/thumbnails/${filename}`;
    return NextResponse.json({ publicUrl, filename, size: file.size });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[upload-thumbnail] Unexpected error on Server PC:', message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/upload-thumbnail
 * Debug endpoint returning current session user info.
 */
export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({
    authenticated: !!user,
    role: user?.role ?? null,
    email: user?.email ?? null,
  });
}
