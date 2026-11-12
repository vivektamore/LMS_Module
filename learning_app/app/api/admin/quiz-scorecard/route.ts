import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isSuperAdmin } from '@/lib/auth';
import { query } from '@/lib/db';

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');
    const courseId = searchParams.get('course_id');

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Fetch target user
    const users = await query<any[]>(
      'SELECT id, name, email, employee_id, department, created_at FROM users WHERE id = ?',
      [userId]
    );
    if (!users.length) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }
    const targetUser = users[0];

    // Find all courses this user is enrolled in or has attempted quizzes in
    const enrolledCourses = await query<any[]>(
      `SELECT DISTINCT c.id, c.title, c.course_code, e.enrolled_at, e.completed_at
       FROM courses c
       LEFT JOIN enrollments e ON e.course_id = c.id AND e.user_id = ?
       LEFT JOIN user_quiz_attempts uqa ON uqa.course_id = c.id AND uqa.user_id = ?
       WHERE e.user_id = ? OR uqa.user_id = ?
       ORDER BY c.title ASC`,
      [userId, userId, userId, userId]
    );

    // If specific course requested or fallback to first enrolled course
    const activeCourseId = courseId && courseId !== 'general' 
      ? courseId 
      : enrolledCourses[0]?.id;

    if (!activeCourseId) {
      return NextResponse.json({
        user: targetUser,
        enrolledCourses: [],
        course: null,
        summary: {
          total_quizzes: 0,
          passed_quizzes: 0,
          score_pct: 0,
          is_qualified: false,
          passing_threshold_pct: 75,
          total_attempts: 0,
          resets_triggered: 0,
          certificate_issued: false,
        },
        quizzes: [],
      });
    }

    // Get current course details
    const courseRows = await query<any[]>(
      'SELECT id, title, course_code, has_certificate FROM courses WHERE id = ?',
      [activeCourseId]
    );
    const currentCourse = courseRows[0] || null;

    // Check certificate issuance
    const certRows = await query<any[]>(
      'SELECT id, issued_at, recipient_name FROM certificates WHERE user_id = ? AND course_id = ?',
      [userId, activeCourseId]
    );
    const certificate = certRows[0] || null;

    // Fetch all quizzes for this course
    const quizzes = await query<any[]>(
      `SELECT 
        lq.id AS quiz_id,
        lq.lesson_id,
        lq.part_index,
        lq.timestamp_sec,
        lq.question,
        lq.options,
        lq.correct_index,
        l.title AS lesson_title,
        l.order_index AS lesson_order,
        m.title AS module_title
       FROM lesson_quizzes lq
       JOIN lessons l ON l.id = lq.lesson_id
       JOIN modules m ON m.id = l.module_id
       WHERE m.course_id = ?
       ORDER BY m.order_index ASC, l.order_index ASC, lq.timestamp_sec ASC`,
      [activeCourseId]
    );

    // Fetch all attempts by this user for this course
    const attempts = await query<any[]>(
      `SELECT id, quiz_id, lesson_id, attempt_number, selected_index, is_correct, resets_triggered, created_at
       FROM user_quiz_attempts
       WHERE user_id = ? AND course_id = ?
       ORDER BY attempt_number ASC, created_at ASC`,
      [userId, activeCourseId]
    );

    // Map attempts per quiz
    const attemptsByQuiz: Record<string, any[]> = {};
    attempts.forEach((a) => {
      if (!attemptsByQuiz[a.quiz_id]) attemptsByQuiz[a.quiz_id] = [];
      attemptsByQuiz[a.quiz_id].push(a);
    });

    let passedQuizzesCount = 0;
    let totalResets = 0;
    let totalAttemptsCount = attempts.length;

    const quizDetails = quizzes.map((q) => {
      let parsedOptions: string[] = [];
      try {
        parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : q.options || [];
      } catch {
        parsedOptions = [];
      }

      const qAttempts = attemptsByQuiz[q.quiz_id] || [];
      const isPassed = qAttempts.some((a) => Number(a.is_correct) === 1);
      if (isPassed) passedQuizzesCount++;

      const resetsForQuiz = qAttempts.reduce(
        (acc, curr) => acc + (Number(curr.resets_triggered) || 0),
        0
      );
      totalResets += resetsForQuiz;

      const passedAttempt = qAttempts.find((a) => Number(a.is_correct) === 1);
      const passedAttemptNumber = passedAttempt ? passedAttempt.attempt_number : null;

      return {
        quiz_id: q.quiz_id,
        lesson_id: q.lesson_id,
        lesson_title: q.lesson_title,
        part_index: q.part_index,
        timestamp_sec: q.timestamp_sec,
        question: q.question,
        options: parsedOptions,
        correct_index: q.correct_index,
        correct_answer_text: parsedOptions[q.correct_index] || '',
        attempts_count: qAttempts.length,
        is_passed: isPassed,
        passed_on_attempt: passedAttemptNumber,
        resets_triggered: resetsForQuiz,
        attempts: qAttempts.map((a) => ({
          id: a.id,
          attempt_number: a.attempt_number,
          selected_index: a.selected_index,
          selected_text: parsedOptions[a.selected_index] || `Option ${a.selected_index}`,
          is_correct: Number(a.is_correct) === 1,
          resets_triggered: Number(a.resets_triggered) || 0,
          created_at: a.created_at,
        })),
      };
    });

    const totalQuizzes = quizzes.length;
    const scorePct = totalQuizzes > 0 ? Math.round((passedQuizzesCount / totalQuizzes) * 100) : 100;
    const isQualified = scorePct >= 75;

    return NextResponse.json({
      user: {
        id: targetUser.id,
        name: targetUser.name || targetUser.email.split('@')[0],
        email: targetUser.email,
        employee_id: targetUser.employee_id,
        department: targetUser.department,
      },
      enrolledCourses,
      course: currentCourse,
      summary: {
        total_quizzes: totalQuizzes,
        passed_quizzes: passedQuizzesCount,
        score_pct: scorePct,
        passing_threshold_pct: 75,
        is_qualified: isQualified,
        total_attempts: totalAttemptsCount,
        resets_triggered: totalResets,
        certificate_issued: !!certificate,
        certificate_id: certificate?.id || null,
        certificate_issued_at: certificate?.issued_at || null,
      },
      quizzes: quizDetails,
    });
  } catch (err: any) {
    console.error('[API admin quiz-scorecard error]:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

