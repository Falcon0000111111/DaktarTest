
"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Lists all files for a given workspace directly from Supabase Storage.
 * @param workspaceId The ID of the workspace.
 * @returns An array of file objects, each with a name and full path.
 */
export async function listKnowledgeBaseFilesFromStorage(workspaceId: string): Promise<{ name: string; path: string }[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

  const userWorkspacePath = `${user.id}/${workspaceId}`;
  const { data: files, error } = await supabase.storage
    .from("knowledge-base-files")
    .list(userWorkspacePath);

  if (error) {
    console.error("Error listing files from storage:", error);
    throw new Error(error.message || "Failed to list knowledge base files.");
  }

  if (!files) {
    return [];
  }

  // Filter out the placeholder file that Supabase storage sometimes creates in empty folders.
  return files
    .filter(file => file.name !== '.emptyFolderPlaceholder')
    .map(file => ({
      name: file.name,
      path: `${userWorkspacePath}/${file.name}`
    }));
}


/**
 * Downloads a file from Supabase Storage and returns it as a data URI.
 * @param filePath The full path to the file in storage.
 * @returns An object containing the file's name and its data URI representation.
 */
export async function getKnowledgeBaseFileAsDataUri(filePath: string): Promise<{name: string; dataUri: string}> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated.");
    }

    const { data: blob, error } = await supabase.storage
        .from("knowledge-base-files")
        .download(filePath);

    if (error || !blob) {
        console.error("Error downloading file:", error);
        throw new Error(error.message || "Could not download file from knowledge base.");
    }
    
    // Extract original filename from the end of the path.
    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);

    const buffer = Buffer.from(await blob.arrayBuffer());
    // Ensure a PDF mime type if the blob type is missing.
    const dataUri = `data:${blob.type || 'application/pdf'};base64,${buffer.toString('base64')}`;

    return { name: fileName, dataUri };
}
