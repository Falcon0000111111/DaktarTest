
"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Lists all files directly from the root of the Supabase Storage bucket.
 * @param workspaceId The ID of the workspace (kept for API consistency, but not used for pathing).
 * @returns An array of file objects, each with a name and root path.
 */
export async function listKnowledgeBaseFilesFromStorage(workspaceId: string): Promise<{ name: string; path: string }[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

  // NOTE: Listing from the root of the bucket to find manually uploaded files.
  // This approach assumes all files in the bucket are available to the user.
  const { data: files, error } = await supabase.storage
    .from("knowledge-base-files")
    .list(); // List from the root directory

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
      // The path is now just the filename, since we are at the root.
      path: file.name
    }));
}


/**
 * Downloads a file from Supabase Storage and returns it as a data URI.
 * @param filePath The path to the file in storage (which is just the filename for root files).
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
