
"use server";

import { createClient } from "@/lib/supabase/server";
import type { KnowledgeBaseFile } from "@/types/supabase";
import { revalidatePath } from "next/cache";

export async function getKnowledgeBaseFiles(workspaceId: string): Promise<KnowledgeBaseFile[]> {
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
    console.error("Error fetching knowledge base files:", error);
    throw new Error(error.message || "Failed to fetch knowledge base files.");
  }
  return data || [];
}

export async function uploadKnowledgeBaseFile(workspaceId: string, formData: FormData): Promise<KnowledgeBaseFile> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

  const file = formData.get("file") as File;
  if (!file) {
    throw new Error("No file provided.");
  }

  const filePath = `${user.id}/${workspaceId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("knowledge-base-files")
    .upload(filePath, file);

  if (uploadError) {
    console.error("Error uploading file to storage:", uploadError);
    throw new Error(uploadError.message || "Failed to upload file.");
  }

  const { data: dbEntry, error: dbError } = await supabase
    .from("knowledge_base_files")
    .insert({
      workspace_id: workspaceId,
      user_id: user.id,
      file_name: file.name,
      file_path: filePath,
    })
    .select()
    .single();

  if (dbError || !dbEntry) {
    console.error("Error creating knowledge base file record:", dbError);
    // Attempt to clean up storage if DB insert fails
    await supabase.storage.from("knowledge-base-files").remove([filePath]);
    throw new Error(dbError?.message || "Failed to create file record in database.");
  }
  
  revalidatePath(`/dashboard/workspace/${workspaceId}`);
  return dbEntry;
}

export async function deleteKnowledgeBaseFile(id: string): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated.");
    }

    const { data: fileData, error: fetchError } = await supabase
        .from("knowledge_base_files")
        .select("id, file_path, workspace_id")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

    if (fetchError || !fileData) {
        console.error("Error fetching file for deletion or file not found:", fetchError);
        throw new Error(fetchError?.message || "File not found or permission denied.");
    }

    const { error: storageError } = await supabase.storage
        .from("knowledge-base-files")
        .remove([fileData.file_path]);

    if (storageError) {
        console.error("Error deleting file from storage:", storageError);
        throw new Error(storageError.message || "Failed to delete file from storage.");
    }

    const { error: dbError } = await supabase
        .from("knowledge_base_files")
        .delete()
        .eq("id", id);

    if (dbError) {
        console.error("Error deleting file record from database:", dbError);
        throw new Error(dbError.message || "Failed to delete file record.");
    }

    revalidatePath(`/dashboard/workspace/${fileData.workspace_id}`);
}

export async function renameKnowledgeBaseFile(id: string, newName: string): Promise<KnowledgeBaseFile> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated.");
    }
    if (!newName.trim()) {
        throw new Error("File name cannot be empty.");
    }

    const { data: updatedFile, error } = await supabase
        .from("knowledge_base_files")
        .update({ file_name: newName.trim(), updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();
    
    if (error || !updatedFile) {
        console.error("Error renaming knowledge base file:", error);
        throw new Error(error.message || "Failed to rename file.");
    }

    revalidatePath(`/dashboard/workspace/${updatedFile.workspace_id}`);
    return updatedFile;
}

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
    
    // Extract original filename from path, everything after the last '/'
    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1).split('-').slice(1).join('-');


    const buffer = Buffer.from(await blob.arrayBuffer());
    const dataUri = `data:${blob.type};base64,${buffer.toString('base64')}`;

    return { name: fileName, dataUri };
}
