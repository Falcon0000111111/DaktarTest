
"use server";

import { createClient } from "@/lib/supabase/server";
import type { KnowledgeBaseFile, NewKnowledgeBaseFile } from "@/types/supabase";
import { revalidatePath } from "next/cache";

/**
 * Uploads a PDF file to Supabase Storage and creates a corresponding record in the knowledge_base_files table.
 * @param workspaceId The ID of the workspace to associate the file with.
 * @param formData The FormData object containing the file to upload.
 */
export async function uploadKnowledgeBaseFile(workspaceId: string, formData: FormData): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

  const file = formData.get("file") as File;
  if (!file) {
    throw new Error("No file provided.");
  }
  if (file.type !== 'application/pdf') {
      throw new Error("Only PDF files are allowed.");
  }

  const filePath = `${user.id}/${workspaceId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("knowledge-base-files")
    .upload(filePath, file);

  if (uploadError) {
    console.error("Error uploading file to storage:", uploadError);
    throw new Error(uploadError.message || "Failed to upload file to storage.");
  }

  const newFileEntry: NewKnowledgeBaseFile = {
    file_name: file.name,
    file_path: filePath,
    workspace_id: workspaceId,
    user_id: user.id,
  };

  const { error: dbError } = await supabase
    .from("knowledge_base_files")
    .insert(newFileEntry);

  if (dbError) {
    console.error("Error creating knowledge base file record:", dbError);
    // Attempt to delete the orphaned file from storage
    await supabase.storage.from("knowledge-base-files").remove([filePath]);
    throw new Error(dbError.message || "Failed to save file metadata to the database.");
  }

  revalidatePath(`/dashboard/workspace/${workspaceId}`);
}


/**
 * Lists all knowledge base files for a given workspace from the database table.
 * @param workspaceId The ID of the workspace.
 * @returns An array of KnowledgeBaseFile objects.
 */
export async function listKnowledgeBaseFiles(workspaceId: string): Promise<KnowledgeBaseFile[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data, error } = await supabase
    .from("knowledge_base_files")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error listing knowledge base files:", error);
    throw new Error(error.message || "Failed to list knowledge base files.");
  }

  return data || [];
}

/**
 * Downloads a file from Supabase Storage using its path and returns it as a data URI.
 * @param filePath The path to the file in storage.
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
    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1).replace(/^\d+-/, '');

    const buffer = Buffer.from(await blob.arrayBuffer());
    const dataUri = `data:${blob.type || 'application/pdf'};base64,${buffer.toString('base64')}`;

    return { name: fileName, dataUri };
}


/**
 * Renames a knowledge base file in the database. Does not change the file in storage.
 * @param fileId The ID of the file record to rename.
 * @param newName The new name for the file.
 */
export async function renameKnowledgeBaseFile(fileId: string, newName: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data: file, error: fetchError } = await supabase
    .from("knowledge_base_files")
    .select("workspace_id")
    .eq("id", fileId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !file) {
    throw new Error("File not found or permission denied.");
  }

  const { error: updateError } = await supabase
    .from("knowledge_base_files")
    .update({ file_name: newName, updated_at: new Date().toISOString() })
    .eq("id", fileId);

  if (updateError) {
    throw new Error(updateError.message || "Failed to rename file.");
  }
  revalidatePath(`/dashboard/workspace/${file.workspace_id}`);
}


/**
 * Deletes a knowledge base file from the database and from Supabase Storage.
 * @param fileId The ID of the file record to delete.
 */
export async function deleteKnowledgeBaseFile(fileId: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data: file, error: fetchError } = await supabase
    .from("knowledge_base_files")
    .select("file_path, workspace_id")
    .eq("id", fileId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !file) {
    throw new Error("File not found or permission denied.");
  }

  const { error: storageError } = await supabase.storage
    .from("knowledge-base-files")
    .remove([file.file_path]);
  
  if (storageError) {
    console.error("Error deleting file from storage:", storageError);
    // Decide if you want to proceed or throw an error.
    // Proceeding might leave an orphaned DB record.
  }

  const { error: dbError } = await supabase
    .from("knowledge_base_files")
    .delete()
    .eq("id", fileId);

  if (dbError) {
    throw new Error(dbError.message || "Failed to delete file record from database.");
  }
  revalidatePath(`/dashboard/workspace/${file.workspace_id}`);
}
