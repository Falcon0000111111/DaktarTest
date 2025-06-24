--
-- Base schema
--
create type "public"."user_role" as enum ('user', 'admin');

create table "public"."profiles" (
    "id" uuid not null,
    "role" user_role not null default 'user'::user_role
);

alter table "public"."profiles" enable row level security;

create table "public"."workspaces" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "name" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);

alter table "public"."workspaces" enable row level security;

create table "public"."quizzes" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "user_id" uuid not null,
    "pdf_name" text,
    "num_questions" integer not null,
    "generated_quiz_data" jsonb,
    "status" text not null default 'pending'::text,
    "error_message" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "passing_score_percentage" integer,
    "last_attempt_score_percentage" integer,
    "last_attempt_passed" boolean,
    "duration_minutes" integer
);

alter table "public"."quizzes" enable row level security;

create table "public"."knowledge_base_documents" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "file_name" text not null,
    "description" text,
    "storage_path" text not null
);

alter table "public"."knowledge_base_documents" enable row level security;

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);
CREATE UNIQUE INDEX workspaces_pkey ON public.workspaces USING btree (id);
CREATE UNIQUE INDEX quizzes_pkey ON public.quizzes USING btree (id);
CREATE UNIQUE INDEX knowledge_base_documents_pkey ON public.knowledge_base_documents USING btree (id);

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";
alter table "public"."workspaces" add constraint "workspaces_pkey" PRIMARY KEY using index "workspaces_pkey";
alter table "public"."quizzes" add constraint "quizzes_pkey" PRIMARY KEY using index "quizzes_pkey";
alter table "public"."knowledge_base_documents" add constraint "knowledge_base_documents_pkey" PRIMARY KEY using index "knowledge_base_documents_pkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;
alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."workspaces" add constraint "workspaces_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;
alter table "public"."workspaces" validate constraint "workspaces_user_id_fkey";

alter table "public"."quizzes" add constraint "quizzes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;
alter table "public"."quizzes" validate constraint "quizzes_user_id_fkey";
alter table "public"."quizzes" add constraint "quizzes_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE not valid;
alter table "public"."quizzes" validate constraint "quizzes_workspace_id_fkey";

--
-- RLS Policies
--

-- Profiles
create policy "Allow authenticated user to read their own profile"
on "public"."profiles"
as permissive
for select
to authenticated
using ((auth.uid() = id));

create policy "Allow user to update their own profile"
on "public"."profiles"
as permissive
for update
to authenticated
using ((auth.uid() = id));

-- Workspaces
create policy "Allow authenticated users to manage their own workspaces"
on "public"."workspaces"
as permissive
for all
to authenticated
using ((auth.uid() = user_id));

-- Quizzes
create policy "Allow authenticated users to manage their own quizzes"
on "public"."quizzes"
as permissive
for all
to authenticated
using ((auth.uid() = user_id));

-- Knowledge Base Documents
create policy "Allow admins to manage knowledge base"
on "public"."knowledge_base_documents"
as permissive
for all
to authenticated
using (is_admin());

create policy "Allow any authenticated user to read knowledge base"
on "public"."knowledge_base_documents"
as permissive
for select
to authenticated
using (true);

-- Storage RLS
-- Knowledge Base Files
create policy "Allow admin to manage knowledge base files"
on storage.objects for all
with check ( bucket_id = 'knowledge-base-files' AND is_admin() );

create policy "Allow authenticated users to read knowledge base files"
on storage.objects for select
with check ( bucket_id = 'knowledge-base-files' );

--
-- Functions
--
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  return (
    select role from public.profiles
    where id = auth.uid()
  ) = 'admin'::user_role;
end;
$$;

CREATE OR REPLACE FUNCTION public.check_gmail_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NEW.email NOT LIKE '%@gmail.com' THEN
        RAISE EXCEPTION 'use valid email address e.g. @gmail.com';
    END IF;
    RETURN NEW;
END;
$$;


--
-- Triggers
--
-- Function to create a profile for a new user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'user');
  return new;
end;
$$;

-- Trigger to create a profile when a new user signs up
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Drop the trigger IF IT EXISTS to prevent an error on re-run.
DROP TRIGGER IF EXISTS before_user_insert_check_gmail ON auth.users;

-- Create the trigger to attach the function to the auth.users table.
CREATE TRIGGER before_user_insert_check_gmail
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.check_gmail_email();