-- ============================================================================
-- ENUMS
-- ============================================================================
CREATE TYPE public.user_role AS ENUM ('admin', 'student');
CREATE TYPE public.lesson_type AS ENUM ('single', 'playlist');

-- ============================================================================
-- TABLE CREATION & RELATIONSHIPS
-- ============================================================================

-- 1. Users Table (Extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role DEFAULT 'student'::user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Categories Table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Courses Table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Modules Table (Courses -> Modules)
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Lessons Table (Modules -> Lessons)
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type public.lesson_type DEFAULT 'single'::public.lesson_type NOT NULL,
  video_url TEXT,
  playlist_urls JSONB,
  order_index INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT check_lesson_type_exclusivity CHECK (
    (type = 'single' AND playlist_urls IS NULL) OR 
    (type = 'playlist' AND video_url IS NULL)
  )
);

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

-- 5. Enrollments Table (Many-to-Many Users <-> Courses)
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, course_id)
);

-- 6. Lesson Progress Table (tracks per-user per-lesson completion)
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT false NOT NULL,
  max_watched_time_sec INTEGER DEFAULT 0 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, lesson_id)
);

-- Index for fast per-user progress lookups
CREATE INDEX idx_lesson_progress_user_id ON public.lesson_progress(user_id);


-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS everywhere
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- Helper function to check if the user is an admin without recursion (using SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- users POLICIES
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles and manage them" ON public.users
  FOR ALL USING (
    public.is_admin()
  );


-- categories POLICIES
CREATE POLICY "Authenticated users can view categories" ON public.categories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (
    public.is_admin()
  );


-- courses POLICIES
CREATE POLICY "Authenticated users can view courses" ON public.courses
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage courses" ON public.courses
  FOR ALL USING (
    public.is_admin()
  );


-- modules POLICIES
CREATE POLICY "Authenticated users can view modules" ON public.modules
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage modules" ON public.modules
  FOR ALL USING (
    public.is_admin()
  );


-- lessons POLICIES
-- Only allow students to view lessons if they are enrolled in the parent course.
CREATE POLICY "Enrolled students can view lessons" ON public.lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.modules m ON e.course_id = m.course_id
      WHERE m.id = public.lessons.module_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage lessons" ON public.lessons
  FOR ALL USING (
    public.is_admin()
  );

-- lesson_quizzes POLICIES
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
    public.is_admin()
  );

-- enrollments POLICIES
CREATE POLICY "Users can view their own enrollments" ON public.enrollments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage enrollments" ON public.enrollments
  FOR ALL USING (
    public.is_admin()
  );

-- lesson_progress POLICIES
CREATE POLICY "Users can view their own progress" ON public.lesson_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" ON public.lesson_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON public.lesson_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Utility Function to automatically create user profile on Supabase Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (new.id, new.email, 'student');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the utility function after auth.users insertion
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
