import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getCurrentUser } from '@/lib/auth';
import { ensureStorageDir, generateStorageFilename } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'];
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * POST /api/upload-document
 * Admin only. Body: FormData with field "file" (PDF, DOCX, XLSX, max 50 MB)
 * Saves documents directly to Server PC storage (uploads/pdfs or uploads/documents).
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const allowBypass = process.env.ALLOW_ADMIN_BYPASS === 'true';

  if (!user && !allowBypass) {
    return NextResponse.json({ error: 'Session expired. Please sign in as admin.' }, { status: 401 });
  }

  if (user && user.role !== 'admin' && !allowBypass) {
    return NextResponse.json({ error: 'Only admins can upload course documents.' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No document file provided in field "file"' }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `File type "${ext}" is not permitted. Allowed: PDF, Word (DOCX), Excel (XLSX), TXT.` },
        { status: 415 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Document size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds 50MB limit.` },
        { status: 413 }
      );
    }

    const category = ext === '.pdf' ? 'pdfs' : 'documents';
    const filename = generateStorageFilename(file.name);
    const uploadDir = await ensureStorageDir(category);
    const filePath = path.join(uploadDir, filename);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/${category}/${filename}`;
    return NextResponse.json({
      publicUrl,
      filename,
      category,
      size: file.size,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[upload-document] Unexpected error on Server PC:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
