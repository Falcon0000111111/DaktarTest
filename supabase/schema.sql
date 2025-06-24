-- This script is idempotent and can be run multiple times safely.

-- Clean up in the correct order to avoid dependency issues.
-- Triggers on auth.users must be dropped as we don't own the table.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS before_user_insert_check_gmail ON auth.users;

-- Drop all public tables. CASCADE handles their triggers, policies, and other dependencies.
DROP TABLE IF EXISTS public.knowledge_base_documents CASCADE;
DROP TABLE IF EXISTS public.quizzes CASCADE;
DROP TABLE IF EXISTS public.workspaces CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop public functions and types last, as tables/triggers might depend on them.
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_updated_at();
DROP FUNCTION IF EXISTS public.check_gmail_email();
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.check_llm_request_limit();
DROP FUNCTION IF EXISTS public.increment_llm_request_count();
DROP TYPE IF EXISTS public.user_role;


-- =================================================================
-- Section 1: ROLES, PROFILES, and AUTH TRIGGERS
-- =================================================================

-- Define user roles for the application
CREATE TYPE public.user_role AS ENUM ('user', 'admin');

-- Create the profiles table to store public user data
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    role public.user_role NOT NULL DEFAULT 'user',
    llm_requests_count integer NOT NULL DEFAULT 0
);

-- Enable Row-Level Security for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Function to populate the public.profiles table when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, role, llm_requests_count)
  VALUES (NEW.id, 'user', 0);
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to enforce sign-ups from a specific email provider
CREATE OR REPLACE FUNCTION public.check_gmail_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NEW.email NOT LIKE '%@gmail.com' THEN
        RAISE EXCEPTION 'use valid email address e.g. @gmail.com';
    END IF;
    RETURN NEW;
END;
$$;

-- Trigger to check email domain before user insertion
CREATE TRIGGER before_user_insert_check_gmail
  BEFORE INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.check_gmail_email();


-- =================================================================
-- Section 2: CORE APPLICATION TABLES (Workspaces, Quizzes)
-- =================================================================

-- Function to automatically update the `updated_at` timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create the workspaces table
CREATE TABLE public.workspaces (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS policies for workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their own workspaces." ON public.workspaces FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create workspaces." ON public.workspaces FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own workspaces." ON public.workspaces FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own workspaces." ON public.workspaces FOR DELETE USING (auth.uid() = user_id);

-- Trigger to handle updated_at for workspaces
CREATE TRIGGER on_workspaces_update
  BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create the quizzes table
CREATE TABLE public.quizzes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pdf_name text,
    num_questions integer NOT NULL,
    generated_quiz_data jsonb,
    status text NOT NULL DEFAULT 'pending',
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    passing_score_percentage integer,
    last_attempt_score_percentage integer,
    last_attempt_passed boolean,
    duration_minutes integer
);

-- RLS policies for quizzes
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD their own quizzes" ON public.quizzes FOR ALL USING (auth.uid() = user_id);

-- Trigger to handle updated_at for quizzes
CREATE TRIGGER on_quizzes_update
  BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- =================================================================
-- Section 3: KNOWLEDGE BASE & ADMIN LOGIC
-- =================================================================

-- Create the knowledge_base_documents table
CREATE TABLE public.knowledge_base_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name text NOT NULL,
    description text,
    storage_path text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Robust function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
  is_admin_user boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) INTO is_admin_user;
  RETURN is_admin_user;
END;
$$;

-- RLS policies for knowledge_base_documents
ALTER TABLE public.knowledge_base_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to view all documents" ON public.knowledge_base_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin users to insert documents" ON public.knowledge_base_documents FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin users to update documents" ON public.knowledge_base_documents FOR UPDATE USING (public.is_admin());
CREATE POLICY "Allow admin users to delete documents" ON public.knowledge_base_documents FOR DELETE USING (public.is_admin());

-- Trigger to handle updated_at for knowledge_base_documents
CREATE TRIGGER on_kb_documents_update
  BEFORE UPDATE ON public.knowledge_base_documents FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- =================================================================
-- Section 4: LLM REQUEST LIMITS (TRIGGERS)
-- =================================================================

-- Function to check the user's request limit, with an admin bypass
CREATE OR REPLACE FUNCTION public.check_llm_request_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  current_count INTEGER;
  is_admin_user BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = NEW.user_id AND role = 'admin'
  ) INTO is_admin_user;

  IF is_admin_user THEN
    RETURN NEW; -- Admins bypass the limit
  END IF;

  SELECT llm_requests_count INTO current_count FROM public.profiles WHERE id = NEW.user_id;

  IF current_count >= 10 THEN
    RAISE EXCEPTION 'You have reached your maximum of 10 requests.';
  END IF;

  RETURN NEW;
END;
$$;

-- Function to increment the user's request count after successful quiz insertion
CREATE OR REPLACE FUNCTION public.increment_llm_request_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles
  SET llm_requests_count = llm_requests_count + 1
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Trigger to check the limit BEFORE a new quiz is inserted
CREATE TRIGGER before_quiz_insert_check_limit
  BEFORE INSERT ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.check_llm_request_limit();

-- Trigger to increment the count AFTER a new quiz is inserted
CREATE TRIGGER after_quiz_insert_increment_count
  AFTER INSERT ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.increment_llm_request_count();


-- =================================================================
-- Section 5: STORAGE RLS POLICIES
-- =================================================================

-- Drop policies before creating to ensure idempotency
DROP POLICY IF EXISTS "Admins can manage knowledge base files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read knowledge base files" ON storage.objects;

-- Policy for admins to have full control over the 'knowledge-base-files' bucket
CREATE POLICY "Admins can manage knowledge base files"
ON storage.objects FOR ALL
USING (bucket_id = 'knowledge-base-files' AND public.is_admin())
WITH CHECK (bucket_id = 'knowledge-base-files' AND public.is_admin());

-- Policy for any authenticated user to read from the 'knowledge-base-files' bucket
CREATE POLICY "Authenticated users can read knowledge base files"
ON storage.objects FOR SELECT
USING (bucket_id = 'knowledge-base-files' AND auth.role() = 'authenticated');
