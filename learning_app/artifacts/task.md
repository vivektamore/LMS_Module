# Tasks: Authentication & Backend Progress Tracking

- [x] **Database & Schema Updates**
  - [x] Update `db/schema.sql` with `lesson_progress` table and RLS policies.
  - [x] Add `auth.users` trigger to `db/schema.sql` to auto-insert into `public.users`.
  - [x] *Action Required:* Instruct user to run the new SQL commands in their Supabase Dashboard.

- [ ] **Authentication Flow**
  - [ ] Verify/Install `@supabase/ssr` if not present.
  - [ ] Create `app/auth/callback/route.ts` for exchanging code for session.
  - [ ] Create `app/login/page.tsx` and `app/login/actions.ts` (or similar) for Email/Password Signup & Login.
  - [ ] Create `app/auth/signout/route.ts` for signing out.

- [x] **API & Backend State Integration**
  - [x] Update `/api/enroll` to use `createClient()` (JWT) to get the user ID, instead of bypassing auth.
  - [x] Create `/api/progress` GET/POST route to fetch and update `lesson_progress`.

- [x] **Frontend State Synchronization**
  - [x] Update `useAppStore.ts` to fetch session on load and clear local state on logout.
  - [x] Update `useAppStore.ts` to sync `maxWatchedTime` and `completedLessons` via `/api/progress`.
  - [x] Update `app/course/[id]/page.tsx` to handle authenticated fetching and ensure Zustand is hydrated with backend data.
  - [x] Update `app/dashboard/page.tsx` to enforce login and display user-specific data.
