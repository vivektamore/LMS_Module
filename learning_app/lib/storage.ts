import path from 'path';
import { promises as fs } from 'fs';

/**
 * Central Storage Configuration for Jolly Clamps LMS (Server PC)
 *
 * Configurable via UPLOAD_DIR environment variable.
 * Defaults to `<project-root>/uploads` on the host Server PC.
 */

export const DEFAULT_UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export function getUploadRootDir(): string {
  const custom = process.env.UPLOAD_DIR;
  if (custom && custom.trim()) {
    return path.resolve(custom.trim());
  }
  return DEFAULT_UPLOAD_DIR;
}

export type StorageCategory = 'videos' | 'thumbnails' | 'pdfs' | 'documents' | 'images';

/**
 * Ensures the target storage subfolder exists on the Server PC disk.
 */
export async function ensureStorageDir(category: StorageCategory): Promise<string> {
  const root = getUploadRootDir();
  const target = path.join(root, category);
  await fs.mkdir(target, { recursive: true });
  return target;
}

/**
 * Validates and sanitizes a filename to prevent directory traversal and illegal characters.
 */
export function sanitizeFilename(originalName: string): string {
  // Strip path traversal indicators and illegal OS filename characters
  const basename = path.basename(originalName);
  const clean = basename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return clean || 'file';
}

/**
 * Generates a unique, collision-proof filename with timestamp on the Server PC.
 */
export function generateStorageFilename(originalName: string): string {
  const timestamp = Date.now();
  const safe = sanitizeFilename(originalName);
  return `${timestamp}_${safe}`;
}

/**
 * Resolves a storage file path safely on the Server PC, preventing path traversal attacks (e.g. `../../`).
 */
export function resolveSafeStoragePath(category: StorageCategory, filename: string): string | null {
  const root = getUploadRootDir();
  const categoryDir = path.join(root, category);
  const safeFilename = path.basename(filename);
  const resolved = path.resolve(categoryDir, safeFilename);

  // Security check: Must reside within the intended category folder
  if (!resolved.startsWith(categoryDir)) {
    return null;
  }
  return resolved;
}

/**
 * Map of supported file extensions to standard MIME types
 */
export const MIME_TYPES: Record<string, string> = {
  // Videos
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',

  // Images
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',

  // Documents
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain; charset=utf-8',
};

export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}
