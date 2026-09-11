# Walkthrough: Anti-Skip & In-Video Quizzes

The video player has been fully upgraded to enforce linear learning and verify knowledge retention with interactive quizzes!

## What was implemented

### 1. Database & Schema
- Added the `lesson_quizzes` table to store quiz definitions (timestamp, question, options, correct answer).
- Applied Row Level Security (RLS) policies so only enrolled students can fetch the quizzes for their active lessons.

### 2. Admin Course Builder
- **Quiz UI:** Added an "In-Video Quizzes" section to the bottom of each lesson block.
- Admins can add multiple quizzes per lesson, specifying exactly when (MM:SS) the video should pause to ask the question.
- **API Update:** The `/api/courses` POST route was updated to receive and bulk-insert these quizzes seamlessly when publishing a course.

### 3. State Management & Authentication (Cloud Sync)
- The platform has fully transitioned to **Supabase Auth (JWT)**.
- Local storage has been deprecated. The system now automatically synchronizes `maxWatchedTime`, completed lessons, and enrollments with the `lesson_progress` database table via secure backend APIs.
- If a user logs out and logs in on a different device, their exact video progress and unlocked quizzes are instantly restored!

### 4. Course Player (Anti-Skip & Quizzes)
- **Anti-Skip:** If a user clicks ahead on the progress bar past their `maxWatchedTime`, the video instantly snaps them back.
- **Quizzes:** When the video reaches a quiz's designated timestamp, the video pauses and a "Knowledge Check" overlay appears.
- **Pass-to-Continue Edge Cases Fixed:** 
  - **Seamless Fullscreen Quizzes:** Built a custom fullscreen wrapper. Users can now enter fullscreen by clicking the custom `Maximize` icon or double-clicking the video. When a quiz triggers, it will seamlessly pop up *over* the fullscreen video without minimizing or interrupting the viewing experience!
  - **Force Pause:** The native video controls are completely hidden while a quiz is active. Even if the user tries to play the video using keyboard shortcuts (like Spacebar), it instantly forces the video to stay paused until the correct answer is chosen.
  - **Scrubbing Lock:** If the user attempts to scrub past the quiz while it is on-screen, the video playhead is locked to the quiz's exact timestamp.

## How to Verify
Before testing the UI, you **must run the following SQL** in your Supabase Dashboard SQL Editor to create the new table:

```sql
-- 4b. Lesson Quizzes Table (In-Video Quizzes)
CREATE TABLE public.lesson_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  timestamp_sec INTEGER NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.lesson_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled students can view lesson quizzes" ON public.lesson_quizzes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.modules m ON l.module_id = m.id
      JOIN public.enrollments e ON m.course_id = e.course_id
      WHERE l.id = public.lesson_quizzes.lesson_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage lesson quizzes" ON public.lesson_quizzes
  FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );
```

After running the SQL:
1. Go to **Admin -> Manage Courses** and create a new course.
2. In the Lesson section, add a Quiz at `00:05` (5 seconds).
3. Publish the course.
4. Go to **My Dashboard**, open the new course, and watch the video.
5. Try to fast forward to 0:10. It will snap you back to 0:00!
6. Wait for 0:05. The video will pause and the quiz overlay will appear.
7. Click the wrong answer to see it fail, then click the right answer to resume!
