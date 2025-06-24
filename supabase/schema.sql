-- Migration: Implements LLM request limits, adds admin bypass, and refines RLS policies.
-- This script is transactional and idempotent, safe to run on an existing database.

BEGIN;

-- =================================================================
-- Step 1: Base Table Definitions
-- =================================================================

-- public.profiles definition
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    role public.user_role NOT NULL DEFAULT 'user'::public.user_role,
    llm_requests_count integer DEFAULT 0 NOT NULL,
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- public.workspaces definition
CREATE TABLE IF NOT EXISTS public.workspaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT workspaces_pkey PRIMARY KEY (id),
    CONSTRAINT workspaces_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- public.knowledge_base_documents definition
CREATE TABLE IF NOT EXISTS public.knowledge_base_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    file_name text NOT NULL,
    description text,
    storage_path text NOT NULL,
    CONSTRAINT knowledge_base_documents_pkey PRIMARY KEY (id),
    CONSTRAINT knowledge_base_documents_storage_path_key UNIQUE (storage_path)
);
ALTER TABLE public.knowledge_base_documents ENABLE ROW LEVEL SECURITY;

-- public.quizzes definition
CREATE TABLE IF NOT EXISTS public.quizzes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    user_id uuid NOT NULL,
    pdf_name text,
    num_questions integer NOT NULL,
    generated_quiz_data jsonb,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    passing_score_percentage integer,
    last_attempt_score_percentage integer,
    last_attempt_passed boolean,
    duration_minutes integer,
    CONSTRAINT quizzes_pkey PRIMARY KEY (id),
    CONSTRAINT quizzes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT quizzes_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;


-- =================================================================
-- Step 2: Functions
-- =================================================================

-- Function to handle new user setup (create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

-- Function to check for @gmail.com email addresses
CREATE OR REPLACE FUNCTION public.check_gmail_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NEW.email NOT LIKE '%@gmail.com' THEN
        RAISE EXCEPTION 'use valid email address e.g. @gmail.com';
    END IF;
    RETURN NEW;
END;
$$;

-- Function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  is_admin_user BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) INTO is_admin_user;
  
  RETURN is_admin_user;
END;
$$;

-- Function to CHECK the user's request limit (with admin bypass)
CREATE OR REPLACE FUNCTION public.check_llm_request_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  current_count INTEGER;
  is_admin_user BOOLEAN;
BEGIN
  -- Check if the user is an admin by querying the profiles table
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = NEW.user_id AND role = 'admin'
  ) INTO is_admin_user;

  -- If user is admin, bypass the limit check and allow the insert
  IF is_admin_user THEN
    RETURN NEW;
  END IF;

  -- For non-admin users, get their current request count
  SELECT llm_requests_count INTO current_count
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Check if the user has reached or exceeded their limit
  IF current_count >= 10 THEN
    RAISE EXCEPTION 'You have reached your maximum of 10 requests.';
  END IF;

  RETURN NEW;
END;
$$;

-- Function to INCREMENT the user's request count
CREATE OR REPLACE FUNCTION public.increment_llm_request_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles
  SET llm_requests_count = llm_requests_count + 1
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;


-- =================================================================
-- Step 3: Triggers
-- =================================================================

-- Trigger to create a profile for a new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to enforce @gmail.com emails
DROP TRIGGER IF EXISTS before_user_insert_check_gmail ON auth.users;
CREATE TRIGGER before_user_insert_check_gmail
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.check_gmail_email();
  
-- Triggers for LLM request limits
DROP TRIGGER IF EXISTS before_quiz_insert_check_limit ON public.quizzes;
CREATE TRIGGER before_quiz_insert_check_limit
  BEFORE INSERT ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.check_llm_request_limit();

DROP TRIGGER IF EXISTS after_quiz_insert_increment_count ON public.quizzes;
CREATE TRIGGER after_quiz_insert_increment_count
  AFTER INSERT ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.increment_llm_request_count();


-- =================================================================
-- Step 4: Row-Level Security (RLS) Policies
-- =================================================================

-- For workspaces
DROP POLICY IF EXISTS "Users can see their own workspaces." ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces." ON public.workspaces;
DROP POLICY IF EXISTS "Users can update their own workspaces." ON public.workspaces;
DROP POLICY IF EXISTS "Users can delete their own workspaces." ON public.workspaces;

CREATE POLICY "Users can see their own workspaces." ON public.workspaces FOR SELECT USING ((auth.uid() = user_id));
CREATE POLICY "Users can create workspaces." ON public.workspaces FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own workspaces." ON public.workspaces FOR UPDATE USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own workspaces." ON public.workspaces FOR DELETE USING ((auth.uid() = user_id));

-- For profiles
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;

CREATE POLICY "Users can view their own profile." ON public.profiles FOR SELECT USING ((auth.uid() = id));
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- For quizzes
DROP POLICY IF EXISTS "Users can CRUD their own quizzes" ON public.quizzes;
CREATE POLICY "Users can CRUD their own quizzes" ON public.quizzes FOR ALL USING (auth.uid() = user_id);

-- For knowledge_base_documents
DROP POLICY IF EXISTS "Allow authenticated users to view all documents" ON public.knowledge_base_documents;
DROP POLICY IF EXISTS "Allow admin users to insert documents" ON public.knowledge_base_documents;
DROP POLICY IF EXISTS "Allow admin users to update documents" ON public.knowledge_base_documents;
DROP POLICY IF EXISTS "Allow admin users to delete documents" ON public.knowledge_base_documents;

CREATE POLICY "Allow authenticated users to view all documents" ON public.knowledge_base_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin users to insert documents" ON public.knowledge_base_documents FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin users to update documents" ON public.knowledge_base_documents FOR UPDATE USING (public.is_admin());
CREATE POLICY "Allow admin users to delete documents" ON public.knowledge_base_documents FOR DELETE USING (public.is_admin());


-- =================================================================
-- Step 5: Finalize Transaction
-- =================================================================
COMMIT;
