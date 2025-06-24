
-- Enums
CREATE TYPE public.user_role AS ENUM ('user', 'admin');

-- Tables
CREATE TABLE public.workspaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    role public.user_role DEFAULT 'user'::public.user_role NOT NULL,
    llm_requests_count integer DEFAULT 0 NOT NULL
);

CREATE TABLE public.quizzes (
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
    duration_minutes integer
);

CREATE TABLE public.knowledge_base_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    file_name text NOT NULL,
    description text,
    storage_path text NOT NULL
);

-- Primary Keys
ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.knowledge_base_documents
    ADD CONSTRAINT knowledge_base_documents_pkey PRIMARY KEY (id);

-- Foreign Keys
ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- RLS Policies for workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their own workspaces." ON public.workspaces FOR SELECT USING ((auth.uid() = user_id));
CREATE POLICY "Users can create workspaces." ON public.workspaces FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update their own workspaces." ON public.workspaces FOR UPDATE USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own workspaces." ON public.workspaces FOR DELETE USING ((auth.uid() = user_id));

-- RLS Policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile." ON public.profiles FOR SELECT USING ((auth.uid() = id));
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for quizzes
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD their own quizzes" ON public.quizzes FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for knowledge_base_documents
ALTER TABLE public.knowledge_base_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to view all documents" ON public.knowledge_base_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin users to insert documents" ON public.knowledge_base_documents FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin users to update documents" ON public.knowledge_base_documents FOR UPDATE USING (public.is_admin());
CREATE POLICY "Allow admin users to delete documents" ON public.knowledge_base_documents FOR DELETE USING (public.is_admin());

-- Storage Policies for knowledge-base-files bucket
CREATE POLICY "Allow authenticated users to view all files" ON storage.objects FOR SELECT USING (bucket_id = 'knowledge-base-files');
CREATE POLICY "Allow admin users to insert files" ON storage.objects FOR INSERT WITH CHECK ((bucket_id = 'knowledge-base-files' AND public.is_admin()));
CREATE POLICY "Allow admin users to update files" ON storage.objects FOR UPDATE USING ((bucket_id = 'knowledge-base-files' AND public.is_admin()));
CREATE POLICY "Allow admin users to delete files" ON storage.objects FOR DELETE USING ((bucket_id = 'knowledge-base-files' AND public.is_admin()));

-- Functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'user');
  return new;
end;
$$;

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

-- Function to check email domain
CREATE OR REPLACE FUNCTION public.check_gmail_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NEW.email NOT LIKE '%@gmail.com' THEN
        RAISE EXCEPTION 'use valid email address e.g. @gmail.com';
    END IF;
    RETURN NEW;
END;
$$;

-- Function to check LLM request limit
CREATE OR REPLACE FUNCTION public.check_llm_request_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  current_count INTEGER;
  is_admin_user BOOLEAN;
BEGIN
  -- Check if the user is an admin
  SELECT role = 'admin' INTO is_admin_user
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- If user is admin, bypass the limit check
  IF is_admin_user THEN
    RETURN NEW;
  END IF;

  -- Get the current request count for the user trying to create a quiz.
  SELECT llm_requests_count INTO current_count
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Check if the user has reached or exceeded their limit.
  IF current_count >= 10 THEN
    -- If the limit is reached, block the insertion by raising an error.
    RAISE EXCEPTION 'You have reached your maximum of 10 requests.';
  END IF;

  -- If the limit is not reached, allow the insertion to proceed.
  RETURN NEW;
END;
$$;

-- Function to increment LLM request count
CREATE OR REPLACE FUNCTION public.increment_llm_request_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  -- Increment the request count for the user who just created the quiz.
  UPDATE public.profiles
  SET llm_requests_count = llm_requests_count + 1
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

-- Triggers
-- Trigger to create a profile for a new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to check email domain on user insert
DROP TRIGGER IF EXISTS before_user_insert_check_gmail ON auth.users;
CREATE TRIGGER before_user_insert_check_gmail
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.check_gmail_email();

-- Trigger to check LLM request limit before quiz insert
DROP TRIGGER IF EXISTS before_quiz_insert_check_limit ON public.quizzes;
CREATE TRIGGER before_quiz_insert_check_limit
  BEFORE INSERT ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.check_llm_request_limit();

-- Trigger to increment LLM request count after quiz insert
DROP TRIGGER IF EXISTS after_quiz_insert_increment_count ON public.quizzes;
CREATE TRIGGER after_quiz_insert_increment_count
  AFTER INSERT ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.increment_llm_request_count();
