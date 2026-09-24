import { NextRequest, NextResponse } from 'next/server';
import { query, pool } from '@/lib/db';
import { randomUUID } from 'crypto';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET /api/courses/[id]
 * Returns a single course with its full modules -> lessons -> quizzes tree from MySQL.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    const courseRows = await query<any[]>(`
      SELECT 
        c.id, c.title, c.course_code, c.description, c.thumbnail_url, c.created_at,
        c.visibility, c.has_certificate,
        cat.id AS category_id, cat.name AS category_name, cat.slug AS category_slug
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.id = ?
    `, [id]);

    if (courseRows.length === 0) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const course = courseRows[0];

    // Department authorization check for specific visibility
    if (course.visibility === 'specific') {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      if (currentUser.role !== 'admin') {
        const deptRows = await query<any[]>(
          'SELECT 1 FROM course_departments WHERE course_id = ? AND department = ?',
          [id, currentUser.department]
        );
        if (deptRows.length === 0) {
          return NextResponse.json(
            { error: 'This course is restricted to specific departments and is not accessible to your department.' },
            { status: 403 }
          );
        }
      }
    }

    const modules = await query<any[]>(`
      SELECT id, title, order_index
      FROM modules
      WHERE course_id = ?
      ORDER BY order_index ASC
    `, [id]);

    for (const mod of modules) {
      const lessons = await query<any[]>(`
        SELECT id, title, type, video_url, playlist_urls, order_index, duration_seconds
        FROM lessons
        WHERE module_id = ?
        ORDER BY order_index ASC
      `, [mod.id]);

      for (const lesson of lessons) {
        const quizzes = await query<any[]>(`
          SELECT id, timestamp_sec, question, options, correct_index
          FROM lesson_quizzes
          WHERE lesson_id = ?
          ORDER BY timestamp_sec ASC
        `, [lesson.id]);

        lesson.lesson_quizzes = quizzes.map((q) => ({
          ...q,
          options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        }));

        if (typeof lesson.playlist_urls === 'string') {
          try {
            lesson.playlist_urls = JSON.parse(lesson.playlist_urls);
          } catch {
            lesson.playlist_urls = null;
          }
        }
      }

      mod.lessons = lessons;
    }

    return NextResponse.json({
      course: {
        id: course.id,
        title: course.title,
        course_code: course.course_code || '',
        description: course.description,
        thumbnail_url: course.thumbnail_url || null,
        created_at: course.created_at,
        visibility: course.visibility || 'all',
        has_certificate: !!course.has_certificate,
        categories: course.category_id ? { id: course.category_id, name: course.category_name, slug: course.category_slug } : null,
        modules,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[courses/[id] GET] Unexpected error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/courses/[id]
 * Deletes a course and all associated modules/lessons/quizzes from MySQL (via CASCADE).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Admin only
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can delete courses' }, { status: 403 });
  }

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    // Verify ownership — admin can only delete their own courses
    const ownership = await query<any[]>(
      'SELECT id FROM courses WHERE id = ? AND created_by = ?',
      [id, user.id]
    );
    if (!ownership.length) {
      return NextResponse.json({ error: 'You can only delete courses you created' }, { status: 403 });
    }

    await query('DELETE FROM courses WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[courses/[id] DELETE] Unexpected error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/courses/[id]
 * Updates an existing course structure in MySQL.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Admin only
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can edit courses' }, { status: 403 });
  }

  const connection = await pool.getConnection();
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    // Verify ownership — admin can only edit their own courses
    const ownership = await query<any[]>(
      'SELECT id FROM courses WHERE id = ? AND created_by = ?',
      [id, user.id]
    );
    if (!ownership.length) {
      return NextResponse.json({ error: 'You can only edit courses you created' }, { status: 403 });
    }

    const body = await req.json();
    const { title, course_code, courseCode, description, thumbnail_url, category_id, modules, visibility, departments, has_certificate } = body;
    const finalCourseCode = (course_code || courseCode || '').trim();

    if (!title || !category_id) {
      return NextResponse.json({ error: 'Title and category are required' }, { status: 400 });
    }

    await connection.beginTransaction();

    // 1. Update main course
    await connection.execute(
      `UPDATE courses 
       SET title = ?, course_code = COALESCE(?, course_code), description = ?, thumbnail_url = ?, category_id = ?,
           visibility = ?, has_certificate = ?, updated_at = NOW() 
       WHERE id = ?`,
      [title, finalCourseCode || null, description || null, thumbnail_url || null, category_id,
       visibility || 'all', has_certificate ? 1 : 0, id]
    );

    // 2. Update department access
    await connection.execute('DELETE FROM course_departments WHERE course_id = ?', [id]);
    if (visibility === 'specific' && Array.isArray(departments) && departments.length > 0) {
      for (const dept of departments) {
        await connection.execute(
          'INSERT INTO course_departments (course_id, department) VALUES (?, ?)',
          [id, dept]
        );
      }
    }

    // 3. Differential module & lesson updates (preserves user_progress & video_watch_time)
    // Fetch existing module IDs for this course
    const [existingModuleRows] = await connection.execute<any[]>(
      'SELECT id FROM modules WHERE course_id = ?',
      [id]
    );
    const existingModuleIds = new Set(existingModuleRows.map((r: any) => r.id));
    const keptModuleIds: string[] = [];

    if (modules?.length) {
      for (let mi = 0; mi < modules.length; mi++) {
        const mod = modules[mi];
        const modOrder = mod.order_index ?? mi;
        let moduleId = mod.id;

        if (moduleId && existingModuleIds.has(moduleId)) {
          // Update existing module in-place
          await connection.execute(
            'UPDATE modules SET title = ?, order_index = ? WHERE id = ?',
            [mod.title, modOrder, moduleId]
          );
        } else {
          // Insert new module
          moduleId = (moduleId && !moduleId.startsWith('temp-') && !moduleId.startsWith('mod-')) ? moduleId : randomUUID();
          await connection.execute(
            'INSERT INTO modules (id, course_id, title, order_index) VALUES (?, ?, ?, ?)',
            [moduleId, id, mod.title, modOrder]
          );
        }
        keptModuleIds.push(moduleId);

        // Fetch existing lesson IDs for this module
        const [existingLessonRows] = await connection.execute<any[]>(
          'SELECT id FROM lessons WHERE module_id = ?',
          [moduleId]
        );
        const existingLessonIds = new Set(existingLessonRows.map((r: any) => r.id));
        const keptLessonIds: string[] = [];

        if (mod.lessons?.length) {
          for (let li = 0; li < mod.lessons.length; li++) {
            const lesson = mod.lessons[li];
            const lessonOrder = lesson.order_index ?? li;
            let lessonId = lesson.id;
            const lessonType = lesson.type || 'single';
            const videoUrl = lessonType === 'single' ? (lesson.video_url || null) : null;
            const playlistUrlsJson = lessonType === 'playlist' && lesson.playlist_urls ? JSON.stringify(lesson.playlist_urls) : null;
            const durationSec = Number(lesson.duration_seconds) || 0;

            if (lessonId && existingLessonIds.has(lessonId)) {
              // In-place update preserving user progress and watch time
              await connection.execute(
                `UPDATE lessons 
                 SET title = ?, type = ?, video_url = ?, playlist_urls = ?, order_index = ?, duration_seconds = ?
                 WHERE id = ?`,
                [lesson.title, lessonType, videoUrl, playlistUrlsJson, lessonOrder, durationSec, lessonId]
              );
            } else {
              // Insert new lesson
              lessonId = (lessonId && !lessonId.startsWith('temp-') && !lessonId.startsWith('les-')) ? lessonId : randomUUID();
              await connection.execute(
                `INSERT INTO lessons (id, module_id, title, type, video_url, playlist_urls, order_index, duration_seconds)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [lessonId, moduleId, lesson.title, lessonType, videoUrl, playlistUrlsJson, lessonOrder, durationSec]
              );
            }
            keptLessonIds.push(lessonId);

            // Re-sync quizzes for this lesson
            await connection.execute('DELETE FROM lesson_quizzes WHERE lesson_id = ?', [lessonId]);
            if (lesson.quizzes?.length) {
              for (const q of lesson.quizzes) {
                const quizId = randomUUID();
                await connection.execute(
                  `INSERT INTO lesson_quizzes (id, lesson_id, timestamp_sec, question, options, correct_index)
                   VALUES (?, ?, ?, ?, ?, ?)`,
                  [
                    quizId,
                    lessonId,
                    q.timestamp_sec,
                    q.question,
                    JSON.stringify(q.options),
                    q.correct_index,
                  ]
                );
              }
            }
          }
        }

        // Delete only removed lessons for this module
        if (keptLessonIds.length > 0) {
          const placeholders = keptLessonIds.map(() => '?').join(',');
          await connection.execute(
            `DELETE FROM lessons WHERE module_id = ? AND id NOT IN (${placeholders})`,
            [moduleId, ...keptLessonIds]
          );
        } else {
          await connection.execute('DELETE FROM lessons WHERE module_id = ?', [moduleId]);
        }
      }
    }

    // Delete only removed modules for this course
    if (keptModuleIds.length > 0) {
      const placeholders = keptModuleIds.map(() => '?').join(',');
      await connection.execute(
        `DELETE FROM modules WHERE course_id = ? AND id NOT IN (${placeholders})`,
        [id, ...keptModuleIds]
      );
    } else {
      await connection.execute('DELETE FROM modules WHERE course_id = ?', [id]);
    }

    await connection.commit();
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    await connection.rollback();
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[courses/[id] PUT] Unexpected error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    connection.release();
  }
}
