-- 1. ROLES & PROFILES SETUP
----------------------------------------------------------------

-- Create a custom type for user roles for data integrity
CREATE TYPE public.user_role AS ENUM ('user', 'admin');

-- Create a table for public user profiles
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    role public.user_role NOT NULL DEFAULT 'user' -- Use the ENUM type
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add policies for profiles
CREATE POLICY "Users can view their own profile."
    ON public.profiles FOR SELECT USING (auth.uid() = id);

-- Function to create a profile for a new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role) VALUES (new.id, 'user');
  RETURN new;
END;
$$;

-- Trigger to call the function when a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

----------------------------------------------------------------
-- 2. CORE APPLICATION TABLES
----------------------------------------------------------------

-- General function to automatically update 'updated_at' columns
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create workspaces table
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


-- Create quizzes table
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
    last_attempt_passed boolean
);
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own quizzes."
    ON public.quizzes FOR ALL USING (auth.uid() = user_id);
CREATE TRIGGER on_quizzes_update
  BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


----------------------------------------------------------------
-- 3. KNOWLEDGE BASE SETUP
----------------------------------------------------------------

-- Create knowledge_base_documents table
CREATE TABLE public.knowledge_base_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name text NOT NULL,
    description text,
    storage_path text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Helper function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_role public.user_role;
BEGIN
  -- Fallback to 'user' role if the profile doesn't exist for some reason
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'user'
  ) INTO user_role;
  RETURN user_role = 'admin';
END;
$$;

-- RLS and Triggers for knowledge_base_documents table
ALTER TABLE public.knowledge_base_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read knowledge base documents."
    ON public.knowledge_base_documents FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage knowledge base documents."
    ON public.knowledge_base_documents FOR ALL USING (public.is_admin());
CREATE TRIGGER on_kb_documents_update
  BEFORE UPDATE ON public.knowledge_base_documents FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

----------------------------------------------------------------
-- 4. STORAGE RLS POLICIES (CRITICAL)
----------------------------------------------------------------
-- These assume your storage bucket is named 'knowledge_base_files'

-- Drop existing policies if they exist to avoid errors on re-run
DROP POLICY IF EXISTS "Admins can manage knowledge base files in Storage" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read knowledge base files from Storage" ON storage.objects;


CREATE POLICY "Admins can manage knowledge base files in Storage"
ON storage.objects FOR ALL
USING (
    bucket_id = 'knowledge_base-files' AND
    public.is_admin()
) WITH CHECK (
    bucket_id = 'knowledge_base-files' AND
    public.is_admin()
);

CREATE POLICY "Authenticated users can read knowledge base files from Storage"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'knowledge_base-files' AND
    auth.role() = 'authenticated'
);
