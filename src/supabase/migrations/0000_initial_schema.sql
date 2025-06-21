
-- Create a table for public user profiles
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'user'
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add policies for profiles
CREATE POLICY "Users can view their own profile."
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Function to create a profile for a new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'user');
  RETURN new;
END;
$$;

-- Trigger to call the function when a new user is created in auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Create workspaces table
CREATE TABLE public.workspaces (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS for workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Add policies for workspaces
CREATE POLICY "Users can manage their own workspaces."
    ON public.workspaces
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create quizzes table
CREATE TABLE public.quizzes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pdf_name text,
    num_questions integer NOT NULL,
    generated_quiz_data jsonb,
    status text NOT NULL DEFAULT 'pending', -- Can be: pending, processing, completed, failed
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    passing_score_percentage integer,
    last_attempt_score_percentage integer,
    last_attempt_passed boolean
);

-- Enable RLS for quizzes
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- Add policies for quizzes
CREATE POLICY "Users can manage their own quizzes."
    ON public.quizzes
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- Create knowledge_base_files table
CREATE TABLE public.knowledge_base_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    file_name text NOT NULL,
    file_path text NOT NULL UNIQUE
);

-- Helper function to check if the current user is an admin
-- Note: You'll need to manually update a user's role to 'admin' in the profiles table.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role = 'admin';
END;
$$;

-- Enable RLS for knowledge_base_files
ALTER TABLE public.knowledge_base_files ENABLE ROW LEVEL SECURITY;

-- Add policies for knowledge_base_files
CREATE POLICY "Authenticated users can read knowledge base files."
    ON public.knowledge_base_files
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage knowledge base files."
    ON public.knowledge_base_files
    FOR ALL -- (INSERT, UPDATE, DELETE)
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
