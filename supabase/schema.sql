-- Create user_role type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('user', 'admin');
    END IF;
END$$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.user_role NOT NULL DEFAULT 'user'::public.user_role
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow admins to manage profiles" ON public.profiles FOR ALL USING (public.is_admin());


-- Create workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to manage their own workspaces" ON public.workspaces FOR ALL USING (auth.uid() = user_id);

-- Create knowledge_base_documents table
CREATE TABLE IF NOT EXISTS public.knowledge_base_documents (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    file_name text NOT NULL,
    description text,
    storage_path text NOT NULL UNIQUE
);
ALTER TABLE public.knowledge_base_documents ENABLE ROW LEVEL SECURITY;
-- Admin-only policies for modification
CREATE POLICY "Allow admins to manage knowledge base documents" ON public.knowledge_base_documents FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
-- Policy for all authenticated users to read
CREATE POLICY "Allow authenticated users to read knowledge base documents" ON public.knowledge_base_documents FOR SELECT USING (auth.role() = 'authenticated');

-- Create quizzes table
CREATE TABLE IF NOT EXISTS public.quizzes (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pdf_name text,
    num_questions integer NOT NULL,
    generated_quiz_data jsonb,
    status text NOT NULL DEFAULT 'pending'::text,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    passing_score_percentage integer,
    last_attempt_score_percentage integer,
    last_attempt_passed boolean,
    duration_minutes integer
);
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to manage their own quizzes" ON public.quizzes FOR ALL USING (auth.uid() = user_id);

-- Create is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- Enable RLS for Storage buckets
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policies for knowledge-base-files storage
-- Admins can do everything
CREATE POLICY "Allow admins to manage knowledge base files" ON storage.objects FOR ALL
USING (bucket_id = 'knowledge-base-files' AND public.is_admin())
WITH CHECK (bucket_id = 'knowledge-base-files' AND public.is_admin());

-- Any authenticated user can view/download
CREATE POLICY "Allow authenticated users to view knowledge base files" ON storage.objects FOR SELECT
USING (bucket_id = 'knowledge-base-files' AND auth.role() = 'authenticated');


-- Migration: Creates a function and trigger to ensure new users sign up with a @gmail.com address.

-- Create the function that contains the checking logic.
-- Using CREATE OR REPLACE makes this part safe to re-run.
CREATE OR REPLACE FUNCTION public.check_gmail_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NEW.email NOT LIKE '%@gmail.com' THEN
        RAISE EXCEPTION 'Only @gmail.com email addresses are allowed.';
    END IF;
    RETURN NEW;
END;
$$;

-- Drop the trigger IF IT EXISTS to prevent an error on re-run.
DROP TRIGGER IF EXISTS before_user_insert_check_gmail ON auth.users;

-- Create the trigger to attach the function to the auth.users table.
CREATE TRIGGER before_user_insert_check_gmail
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.check_gmail_email();
