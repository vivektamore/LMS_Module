import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// POST /api/quiz-attempts — records each quiz attempt from learner player
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      course_id,
      lesson_id,
      quiz_id,
      attempt_number = 1,
      selected_index,
      is_correct = false,
      resets_triggered = 0,
    } = body;

    if (!course_id || !lesson_id || !quiz_id || selected_index === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields (course_id, lesson_id, quiz_id, selected_index)' },
        { status: 400 }
      );
    }

    const id = uuidv4();
    await query(
      `INSERT INTO user_quiz_attempts 
       (id, user_id, course_id, lesson_id, quiz_id, attempt_number, selected_index, is_correct, resets_triggered, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        user.id,
        course_id,
        lesson_id,
        quiz_id,
        Number(attempt_number) || 1,
        Number(selected_index),
        is_correct ? 1 : 0,
        Number(resets_triggered) || 0,
      ]
    );

    return NextResponse.json({
      success: true,
      attempt_id: id,
      recorded: {
        quiz_id,
        attempt_number,
        is_correct: !!is_correct,
        resets_triggered: Number(resets_triggered) || 0,
      },
    });
  } catch (err: any) {
    console.error('[API quiz-attempts POST error]:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

// GET /api/quiz-attempts?course_id=... — fetch user's attempts & score for a course
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('course_id');

  try {
    if (!courseId) {
      const allAttempts = await query<any[]>(
        `SELECT uqa.*, lq.question, lq.options, lq.correct_index, l.title AS lesson_title
         FROM user_quiz_attempts uqa
         JOIN lesson_quizzes lq ON lq.id = uqa.quiz_id
         JOIN lessons l ON l.id = uqa.lesson_id
         WHERE uqa.user_id = ?
         ORDER BY uqa.created_at DESC`,
        [user.id]
      );
      return NextResponse.json({ attempts: allAttempts });
    }

    // Get all quizzes in the course
    const allQuizzes = await query<any[]>(
      `SELECT lq.id AS quiz_id, lq.question, lq.options, lq.correct_index, lq.timestamp_sec,
              l.id AS lesson_id, l.title AS lesson_title
       FROM lesson_quizzes lq
       JOIN lessons l ON l.id = lq.lesson_id
       JOIN modules m ON m.id = l.module_id
       WHERE m.course_id = ?
       ORDER BY l.order_index ASC, lq.timestamp_sec ASC`,
      [courseId]
    );

    // Get user attempts in this course
    const attempts = await query<any[]>(
      `SELECT * FROM user_quiz_attempts 
       WHERE user_id = ? AND course_id = ?
       ORDER BY created_at ASC`,
      [user.id, courseId]
    );

    const totalQuizzes = allQuizzes.length;
    // Distinct quizzes passed
    const passedQuizIds = new Set(
      attempts.filter((a) => a.is_correct === 1).map((a) => a.quiz_id)
    );
    const passedCount = passedQuizIds.size;
    const scorePct = totalQuizzes > 0 ? Math.round((passedCount / totalQuizzes) * 100) : 100;
    const totalResets = attempts.reduce((acc, curr) => acc + (Number(curr.resets_triggered) || 0), 0);

    return NextResponse.json({
      course_id: courseId,
      total_quizzes: totalQuizzes,
      passed_quizzes: passedCount,
      score_pct: scorePct,
      is_qualified: scorePct >= 75,
      total_resets: totalResets,
      attempts,
    });
  } catch (err: any) {
    console.error('[API quiz-attempts GET error]:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

