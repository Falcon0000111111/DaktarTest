-- This script is idempotent and can be run multiple times safely.

-- Clean up in the correct order
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users; -- Must be dropped as we don't own the table
DROP TRIGGER IF EXISTS before_user_insert_check_gmail ON auth.users; -- Must be dropped as we don't own the table

-- Drop all tables. CASCADE handles their triggers and dependencies automatically.
DROP TABLE IF EXISTS public.knowledge_base_documents CASCADE;
DROP TABLE IF EXISTS public.quizzes CASCADE;
DROP TABLE IF EXISTS public.workspaces CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop functions and types last
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.check_gmail_email();
DROP FUNCTION IF EXISTS public.handle_updated_at();
DROP TYPE IF EXISTS public.user_role;


-- 1. ROLES & PROFILES SETUP
----------------------------------------------------------------

CREATE TYPE public.user_role AS ENUM ('user', 'admin');

CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    role public.user_role NOT NULL DEFAULT 'user'
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile."
    ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN INSERT INTO public.profiles (id, role) VALUES (new.id, 'user'); RETURN new; END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to enforce @gmail.com email addresses
CREATE OR REPLACE FUNCTION public.check_gmail_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NEW.email NOT LIKE '%@gmail.com' THEN
        RAISE EXCEPTION 'Only @gmail.com email addresses are allowed.';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER before_user_insert_check_gmail
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.check_gmail_email();

----------------------------------------------------------------
-- 2. CORE APPLICATION TABLES
----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.workspaces (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own workspaces."
    ON public.workspaces FOR ALL USING (auth.uid() = user_id);
CREATE TRIGGER on_workspaces_update
  BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

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
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own quizzes."
    ON public.quizzes FOR ALL USING (auth.uid() = user_id);
CREATE TRIGGER on_quizzes_update
  BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

----------------------------------------------------------------
-- 3. KNOWLEDGE BASE SETUP
----------------------------------------------------------------

CREATE TABLE public.knowledge_base_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name text NOT NULL,
    description text,
    storage_path text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_role public.user_role;
BEGIN SELECT COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()),'user') INTO user_role; RETURN user_role = 'admin'; END; $$;

ALTER TABLE public.knowledge_base_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read knowledge base documents."
    ON public.knowledge_base_documents FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage knowledge base documents."
    ON public.knowledge_base_documents FOR ALL USING (public.is_admin());
CREATE TRIGGER on_kb_documents_update
  BEFORE UPDATE ON public.knowledge_base_documents FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

----------------------------------------------------------------
-- 4. STORAGE RLS POLICIES
----------------------------------------------------------------

DROP POLICY IF EXISTS "Admins can manage knowledge base files in Storage" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read knowledge base files from Storage" ON storage.objects;

CREATE POLICY "Admins can manage knowledge base files in Storage"
ON storage.objects FOR ALL
USING (bucket_id = 'knowledge-base-files' AND public.is_admin())
WITH CHECK (bucket_id = 'knowledge-base-files' AND public.is_admin());

CREATE POLICY "Authenticated users can read knowledge base files from Storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'knowledge-base-files' AND auth.role() = 'authenticated');
