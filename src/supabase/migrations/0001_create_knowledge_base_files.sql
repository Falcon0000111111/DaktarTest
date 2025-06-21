
-- Create the global knowledge base table.
-- It is not linked to specific users or workspaces.
CREATE TABLE public.knowledge_base_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE
);

-- Enable Row Level Security (RLS) on the table.
ALTER TABLE public.knowledge_base_files ENABLE ROW LEVEL SECURITY;

-- Policy: Allow any authenticated user to READ the documents.
-- Management (INSERT, UPDATE, DELETE) will be handled by server-side actions
-- using the service_role key, which bypasses RLS. These actions will
-- contain the logic to verify if the user is an admin.
CREATE POLICY "Allow authenticated read access"
ON public.knowledge_base_files
FOR SELECT
TO authenticated
USING (true);


-- STORAGE POLICIES for 'knowledge-base-files' bucket
-- NOTE: Execute these policies for your storage bucket.

-- Drop existing policies if they exist to avoid conflicts.
DROP POLICY IF EXISTS "Admin full access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read" ON storage.objects;


-- Policy: Allow any authenticated user to view/download files.
CREATE POLICY "Allow authenticated read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'knowledge-base-files');

-- Policy: Block client-side uploads, updates, and deletes.
-- This ensures these operations can only be performed by a role that
-- bypasses RLS, such as the `service_role` key used in server-side actions.
-- The server actions themselves contain the admin verification logic.
CREATE POLICY "Block client-side CUD"
ON storage.objects FOR ALL
USING (false)
WITH CHECK (false);
