-- Full schema for FinalQuiz

-- Custom type for user roles
create type public.user_role as enum ('user', 'admin');

-- Profiles table to store user-specific data like roles and generation limits.
-- Note: RLS is enabled.
create table public.profiles (
    id uuid not null primary key references auth.users on delete cascade,
    role public.user_role not null default 'user'::public.user_role,
    quiz_generations_count integer not null default 0,
    generation_limit integer not null default 10
);
alter table public.profiles enable row level security;


-- Workspaces table to organize quizzes.
-- Note: RLS is enabled.
create table public.workspaces (
    id uuid not null default gen_random_uuid() primary key,
    user_id uuid not null references auth.users on delete cascade,
    name text not null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);
alter table public.workspaces enable row level security;


-- Quizzes table to store quiz metadata and results.
-- Note: RLS is enabled.
create table public.quizzes (
    id uuid not null default gen_random_uuid() primary key,
    workspace_id uuid not null references public.workspaces on delete cascade,
    user_id uuid not null references auth.users on delete cascade,
    pdf_name text,
    num_questions integer not null,
    generated_quiz_data jsonb,
    status text not null default 'pending'::text,
    error_message text,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    passing_score_percentage integer,
    last_attempt_score_percentage integer,
    last_attempt_passed boolean,
    duration_minutes integer
);
alter table public.quizzes enable row level security;


-- Knowledge Base Documents table for global quiz sources.
-- Note: RLS is enabled.
create table public.knowledge_base_documents (
    id uuid not null default gen_random_uuid() primary key,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    file_name text not null,
    description text,
    storage_path text not null unique
);
alter table public.knowledge_base_documents enable row level security;


-------------------
-- DB FUNCTIONS --
-------------------

-- Creates a profile for a new user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, quiz_generations_count, generation_limit)
  values (new.id, 'user', 0, 10);
  return new;
end;
$$;


-- Checks if the current user is an admin.
create or replace function public.is_admin()
returns boolean
language plpgsql
as $$
declare
  user_role public.user_role;
begin
  select role into user_role from public.profiles where id = auth.uid();
  return user_role = 'admin';
end;
$$;


-- Enforces @gmail.com email addresses on signup.
create or replace function public.check_gmail_email()
returns trigger language plpgsql security definer as $$
begin
    if new.email not like '%@gmail.com' then
        raise exception 'use valid email address e.g. @gmail.com';
    end if;
    return new;
end;
$$;


-- Atomically increments a user's quiz generation count.
create or replace function public.increment_quiz_generations(user_id_param uuid)
returns void as $$
begin
  update public.profiles
  set quiz_generations_count = quiz_generations_count + 1
  where id = user_id_param;
end;
$$ language plpgsql security definer;


------------------
-- DB TRIGGERS --
------------------

-- Trigger for new user profile creation.
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- Trigger to check email domain before user creation.
drop trigger if exists before_user_insert_check_gmail on auth.users;
create trigger before_user_insert_check_gmail
  before insert on auth.users
  for each row execute function public.check_gmail_email();


--------------------------------
-- ROW LEVEL SECURITY POLICIES --
--------------------------------

-- Profiles Table
create policy "Allow individual user read access" on public.profiles for select using (auth.uid() = id);
create policy "Allow admin full access to profiles" on public.profiles for all using (public.is_admin());

-- Workspaces Table
create policy "Allow individual user access to own workspaces" on public.workspaces for all using (auth.uid() = user_id);

-- Quizzes Table
create policy "Allow individual user access to own quizzes" on public.quizzes for all using (auth.uid() = user_id);

-- Knowledge Base Documents Table
create policy "Allow admins full access to knowledge base" on public.knowledge_base_documents for all using (public.is_admin());
create policy "Allow authenticated users to read knowledge base" on public.knowledge_base_documents for select using (auth.role() = 'authenticated');
