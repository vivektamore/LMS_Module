import { NextRequest, NextResponse } from 'next/server';
import { query, pool } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser } from '@/lib/auth';

/**
 * POST /api/courses
 * Saves a full course (course + modules + lessons + quizzes) to MySQL.
 * Supports visibility ('all'|'specific'), department list, and has_certificate flag.
 */
export async function POST(req: NextRequest) {
  // Admin only
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can create courses' }, { status: 403 });
  }

  const connection = await pool.getConnection();
  try {
    const body = await req.json();
    const {
      title, description, thumbnail_url = null, category_id, created_by, modules,
      visibility = 'all',
      departments = [],
      has_certificate = false,
    } = body;

    if (!title || !category_id || !modules?.length) {
      return NextResponse.json(
        { error: 'title, category_id, and at least one module are required' },
        { status: 400 }
      );
    }

    await connection.beginTransaction();

    const courseId = uuidv4();
    await connection.execute(
      'INSERT INTO courses (id, title, description, thumbnail_url, category_id, created_by, visibility, has_certificate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [courseId, title, description || null, thumbnail_url || null, category_id, currentUser.id, visibility, has_certificate ? 1 : 0]
    );

    // Save department access if visibility = 'specific'
    if (visibility === 'specific' && departments.length > 0) {
      for (const dept of departments) {
        await connection.execute(
          'INSERT INTO course_departments (course_id, department) VALUES (?, ?)',
          [courseId, dept]
        );
      }
    }

    for (const mod of modules) {
      const moduleId = uuidv4();
      await connection.execute(
        'INSERT INTO modules (id, course_id, title, order_index) VALUES (?, ?, ?, ?)',
        [moduleId, courseId, mod.title, mod.order_index || 0]
      );

      if (mod.lessons?.length) {
        for (const lesson of mod.lessons) {
          const lessonId = uuidv4();
          const lessonType = lesson.type || 'single';
          const videoUrl = lessonType === 'single' ? (lesson.video_url || null) : null;
          const playlistUrlsJson = lessonType === 'playlist' && lesson.playlist_urls ? JSON.stringify(lesson.playlist_urls) : null;

          await connection.execute(
            `INSERT INTO lessons (id, module_id, title, type, video_url, playlist_urls, order_index, duration_seconds)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              lessonId, moduleId, lesson.title, lessonType,
              videoUrl, playlistUrlsJson,
              lesson.order_index || 0, lesson.duration_seconds || 0
            ]
          );

          if (lesson.quizzes?.length) {
            for (const q of lesson.quizzes) {
              const quizId = uuidv4();
              await connection.execute(
                `INSERT INTO lesson_quizzes (id, lesson_id, timestamp_sec, question, options, correct_index)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [quizId, lessonId, q.timestamp_sec, q.question, JSON.stringify(q.options), q.correct_index]
              );
            }
          }
        }
      }
    }

    await connection.commit();
    return NextResponse.json({ success: true, courseId }, { status: 201 });
  } catch (err: unknown) {
    await connection.rollback();
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[courses POST] MySQL Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    connection.release();
  }
}

/**
 * GET /api/courses
 * Returns all courses with category, visibility, departments info.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const department  = searchParams.get('department');  // employee dept filter
    const adminView   = searchParams.get('admin') === 'true'; // admin panel — own courses only

    // Get current user for admin scoping
    const currentUser = await getCurrentUser();

    let sql = `
      SELECT 
        c.id, c.title, c.description, c.thumbnail_url, c.created_at,
        c.visibility, c.has_certificate,
        cat.id AS category_id, cat.name AS category_name, cat.slug AS category_slug,
        (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id) AS module_count,
        (SELECT COALESCE(SUM(l.duration_seconds), 0)
         FROM lessons l
         JOIN modules m2 ON l.module_id = m2.id
         WHERE m2.course_id = c.id) AS total_duration_seconds
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.id
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    // Admin panel: only show courses this admin created
    if (adminView && currentUser?.role === 'admin') {
      conditions.push('c.created_by = ?');
      params.push(currentUser.id);
    }

    // Employee view: server-side session department enforcement for non-admins
    if (!adminView && currentUser && currentUser.role !== 'admin') {
      const userDept = currentUser.department;
      if (userDept) {
        conditions.push(`(
          c.visibility = 'all'
          OR (c.visibility = 'specific' AND EXISTS (
            SELECT 1 FROM course_departments cd
            WHERE cd.course_id = c.id AND cd.department = ?
          ))
        )`);
        params.push(userDept);
      } else {
        // User has no department assigned — only show courses open to all
        conditions.push("c.visibility = 'all'");
      }
    } else if (department && !adminView) {
      conditions.push(`(
        c.visibility = 'all'
        OR (c.visibility = 'specific' AND EXISTS (
          SELECT 1 FROM course_departments cd
          WHERE cd.course_id = c.id AND cd.department = ?
        ))
      )`);
      params.push(department);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY c.created_at DESC';

    const rows = await query<any[]>(sql, params);

    // Fetch departments for each course
    const courseIds = rows.map(r => r.id);
    let deptMap: Record<string, string[]> = {};
    if (courseIds.length > 0) {
      const deptRows = await query<any[]>(
        `SELECT course_id, department FROM course_departments WHERE course_id IN (${courseIds.map(() => '?').join(',')})`,
        courseIds
      );
      for (const d of deptRows) {
        if (!deptMap[d.course_id]) deptMap[d.course_id] = [];
        deptMap[d.course_id].push(d.department);
      }
    }

    const courses = rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      thumbnail_url: r.thumbnail_url || null,
      created_at: r.created_at,
      visibility: r.visibility,
      has_certificate: !!r.has_certificate,
      departments: deptMap[r.id] || [],
      categories: r.category_id ? { id: r.category_id, name: r.category_name, slug: r.category_slug } : null,
      module_count: r.module_count,
      total_duration_seconds: r.total_duration_seconds || 0,
      modules: Array(r.module_count).fill({})
    }));

    return NextResponse.json({ courses });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
