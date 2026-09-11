# Implementation Plan: Authentication & Backend Progress Tracking

This phase shifts the platform from using local, mocked data to a fully authenticated environment using Supabase Auth (JWTs). This ensures that a user's enrollments, max watched time, and completed lessons are permanently saved to their account.

## Goal Description
1. Implement a Login/Signup flow for users using Supabase Auth.
2. Ensure new users are automatically added to the `public.users` table via a database trigger.
3. Create a `lesson_progress` table to track video playback position (`maxWatchedTime`) and completion status in the backend.
4. Update the Frontend to sync local Zustand progress with the Supabase database.

> [!IMPORTANT]
> User Review Required: This is a significant architectural change. Once this is merged, you will need to actually log in to view the dashboard and save progress. Existing local storage progress will be cleared or ignored in favor of the real database.

## Proposed Changes

### Database Changes
#### [MODIFY] `db/schema.sql`
- Add an `auth.users` trigger to auto-create a profile in `public.users` when someone signs up.
- Create a `lesson_progress` table with `user_id`, `lesson_id`, `is_completed`, and `max_watched_time_sec`.
- Add RLS policies for `lesson_progress` so students can only view/update their own progress.

### Authentication & UI
#### [NEW] `app/login/page.tsx`
- Create a simple Login/Signup UI using email and password.
#### [NEW] `app/auth/callback/route.ts`
- Standard Next.js server route to exchange Supabase Auth tokens and establish the user session cookie.

### API & State Synchronization
#### [NEW] `app/api/progress/route.ts`
- Create endpoints (`GET`, `POST`) to securely fetch and update a user's `lesson_progress` in the database.
#### [MODIFY] `app/api/enroll/route.ts`
- Update to use the authenticated user's JWT (via `createClient`) instead of hardcoding or bypassing auth.
#### [MODIFY] `store/useAppStore.ts`
- Update the store to fetch progress from the DB on load, and trigger API calls to `/api/progress` when `maxWatchedTime` or `completedLessons` are updated.
#### [MODIFY] `app/course/[id]/page.tsx`
- Ensure the video player relies on the authenticated backend state rather than purely local state.

## Verification Plan
### Automated Tests
- Ensure `npm run build` succeeds with the new Supabase Server-Side Rendering (SSR) packages.
### Manual Verification
- Sign up as a new user.
- Enroll in a course (verify it appears in `public.enrollments`).
- Watch a video for 10 seconds. Refresh the page. Ensure the video anti-skip logic still locks you to 10 seconds (verifying backend sync of `maxWatchedTime`).
- Mark a lesson complete. Refresh the page and ensure it stays marked complete.
