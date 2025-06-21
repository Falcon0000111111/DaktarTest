-- Create the knowledge_base_files table to store metadata about pre-uploaded files.
CREATE TABLE public.knowledge_base_files (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    file_name text NOT NULL,
    file_path text NOT NULL,
    workspace_id uuid NOT NULL,
    user_id uuid NOT NULL,
    CONSTRAINT knowledge_base_files_pkey PRIMARY KEY (id)
);

-- Add foreign key constraint to link knowledge_base_files to workspaces.
-- This ensures that if a workspace is deleted, its related knowledge files are also deleted.
ALTER TABLE public.knowledge_base_files
ADD CONSTRAINT fk_workspace
FOREIGN KEY (workspace_id)
REFERENCES public.workspaces(id)
ON DELETE CASCADE;

-- Add foreign key constraint to link knowledge_base_files to users.
ALTER TABLE public.knowledge_base_files
ADD CONSTRAINT fk_user
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Enable Row Level Security (RLS) on the table.
-- This is a critical security step.
ALTER TABLE public.knowledge_base_files ENABLE ROW LEVEL SECURITY;

-- Create policies to control access.
-- These policies ensure that users can only interact with their own files.

-- Users can view their own knowledge base files.
CREATE POLICY "Allow users to view their own files"
ON public.knowledge_base_files FOR SELECT
USING (auth.uid() = user_id);

-- Users can add new knowledge base files for themselves.
CREATE POLICY "Allow users to insert their own files"
ON public.knowledge_base_files FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own knowledge base files.
CREATE POLICY "Allow users to update their own files"
ON public.knowledge_base_files FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own knowledge base files.
CREATE POLICY "Allow users to delete their own files"
ON public.knowledge_base_files FOR DELETE
USING (auth.uid() = user_id);
