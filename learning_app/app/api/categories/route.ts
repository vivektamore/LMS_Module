import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/categories — Returns all categories from MySQL
 */
export async function GET() {
  try {
    const categories = await query<any[]>(
      'SELECT id, name, slug FROM categories ORDER BY name ASC'
    );
    return NextResponse.json({ categories });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/categories — Creates a new category in MySQL
 * Body: { name: string, slug: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { name, slug } = await req.json();
    if (!name || !slug) {
      return NextResponse.json({ error: 'name and slug are required' }, { status: 400 });
    }

    const id = uuidv4();
    await query(
      'INSERT INTO categories (id, name, slug) VALUES (?, ?, ?)',
      [id, name, slug]
    );

    const category = { id, name, slug };
    return NextResponse.json({ category }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/categories?id=<uuid>
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    await query('DELETE FROM categories WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
