import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { getUploadRootDir, getMimeType } from '@/lib/storage';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

/**
 * Resolves a requested file path against the central Server PC storage.
 * Fallbacks to legacy `public/` folder so existing uploads remain 100% accessible.
 */
async function locateFile(segments: string[]): Promise<{ absolutePath: string; stat: fs.Stats } | null> {
  const root = getUploadRootDir();
  const subPath = segments.join('/');

  // Primary: Check central Server PC storage directory (e.g. <project>/uploads/...)
  const primaryPath = path.resolve(root, ...segments);
  if (primaryPath.startsWith(root)) {
    try {
      const stat = await fsp.stat(primaryPath);
      if (stat.isFile()) return { absolutePath: primaryPath, stat };
    } catch {
      // Not in uploads, check fallback
    }
  }

  // Fallback: Check Next.js public directory (e.g. <project>/public/...)
  const publicRoot = path.join(process.cwd(), 'public');
  const fallbackPath = path.resolve(publicRoot, ...segments);
  if (fallbackPath.startsWith(publicRoot)) {
    try {
      const stat = await fsp.stat(fallbackPath);
      if (stat.isFile()) return { absolutePath: fallbackPath, stat };
    } catch {
      // File not found in either location
    }
  }

  return null;
}

/**
 * GET /uploads/[...path]
 * Streams videos, thumbnails, and documents from Server PC storage with HTTP 206 Range support.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { path: segments } = await context.params;

    if (!segments || segments.length === 0) {
      return NextResponse.json({ error: 'File path required' }, { status: 400 });
    }

    // Security check: Reject path traversal
    for (const seg of segments) {
      if (seg === '..' || seg.includes('/') || seg.includes('\\')) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
      }
    }

    const fileResult = await locateFile(segments);
    if (!fileResult) {
      return NextResponse.json(
        {
          error: 'File not found on Server PC storage',
          requestedPath: segments.join('/'),
          storageRoot: getUploadRootDir(),
        },
        { status: 404 }
      );
    }

    const { absolutePath, stat } = fileResult;
    const fileSize = stat.size;
    const mimeType = getMimeType(absolutePath);
    const rangeHeader = req.headers.get('range');

    // ── HTTP 206 Partial Content (Video Seeking & Chunked Streaming) ──────
    if (rangeHeader && rangeHeader.startsWith('bytes=')) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (isNaN(start) || start >= fileSize || end >= fileSize || start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${fileSize}`,
          },
        });
      }

      const chunkSize = end - start + 1;
      const nodeStream = fs.createReadStream(absolutePath, { start, end });
      const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

      return new Response(webStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      });
    }

    // ── Full File Delivery (Images, Thumbnails, Small Documents) ───────────
    const nodeStream = fs.createReadStream(absolutePath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

    return new Response(webStream, {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': String(fileSize),
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown streaming error';
    console.error('[Upload Stream Error]:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * HEAD /uploads/[...path]
 * Allows browsers to probe file size and range capabilities before playback.
 */
export async function HEAD(req: NextRequest, context: RouteContext) {
  try {
    const { path: segments } = await context.params;
    const fileResult = await locateFile(segments);

    if (!fileResult) {
      return new NextResponse(null, { status: 404 });
    }

    const { absolutePath, stat } = fileResult;
    const mimeType = getMimeType(absolutePath);

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': String(stat.size),
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
