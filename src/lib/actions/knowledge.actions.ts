
"use server";

import { createClient } from "@/lib/supabase/server";
import type { KnowledgeBaseFile } from "@/types/supabase";
import { revalidatePath } from "next/cache";

async function verifyAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }
  if (!process.env.ADMIN_USER_ID) {
    throw new Error("ADMIN_USER_ID is not configured on the server.");
  }
  if (user.id !== process.env.ADMIN_USER_ID) {
    throw new Error("Access Denied: You do not have permission to perform this action.");
  }
  return user;
}


export async function uploadKnowledgeBaseFile(formData: FormData): Promise<KnowledgeBaseFile> {
  const user = await verifyAdmin();
  const supabase = createClient();

  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided.");
  if (file.type !== 'application/pdf') throw new Error("Only PDF files are allowed.");

  const filePath = `global/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;

  const { error: uploadError } = await supabase.storage
    .from("knowledge-base-files")
    .upload(filePath, file);

  if (uploadError) {
    console.error("Error uploading file to storage:", uploadError);
    throw new Error(uploadError.message);
  }

  const { data: newFileEntry, error: dbError } = await supabase
    .from("knowledge_base_files")
    .insert({
      file_name: file.name,
      file_path: filePath,
    })
    .select()
    .single();

  if (dbError || !newFileEntry) {
    console.error("Error creating knowledge base file record:", dbError);
    await supabase.storage.from("knowledge-base-files").remove([filePath]);
    throw new Error(dbError?.message || "Failed to save file metadata.");
  }

  revalidatePath("/admin/knowledge-base");
  revalidatePath("/dashboard/workspace/.*", "layout"); // Revalidate all workspaces
  return newFileEntry;
}

export async function listKnowledgeBaseFiles(): Promise<KnowledgeBaseFile[]> {
  const supabase = createClient();
  // Any authenticated user can list the files.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated.");
  
  const { data, error } = await supabase
    .from("knowledge_base_files")
    .select("*")
    .order("file_name", { ascending: true });

  if (error) {
    console.error("Error listing knowledge base files:", error);
    throw new Error(error.message);
  }

  return data || [];
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
    
    const fileNameWithPrefix = filePath.substring(filePath.lastIndexOf('/') + 1);
    const fileName = fileNameWithPrefix.substring(fileNameWithPrefix.indexOf('-') + 1).replace(/_/g, " ");

    const buffer = Buffer.from(await blob.arrayBuffer());
    const dataUri = `data:${blob.type || 'application/pdf'};base64,${buffer.toString('base64')}`;

    return { name: fileName, dataUri };
}


export async function deleteKnowledgeBaseFile(fileId: string): Promise<void> {
  const user = await verifyAdmin();
  const supabase = createClient();

  const { data: file, error: fetchError } = await supabase
    .from("knowledge_base_files")
    .select("file_path")
    .eq("id", fileId)
    .single();

  if (fetchError || !file) {
    throw new Error("File not found.");
  }

  const { error: storageError } = await supabase.storage
    .from("knowledge-base-files")
    .remove([file.file_path]);
  
  if (storageError) {
    console.error("Error deleting file from storage, but proceeding to delete DB record:", storageError);
  }

  const { error: dbError } = await supabase
    .from("knowledge_base_files")
    .delete()
    .eq("id", fileId);

  if (dbError) {
    throw new Error(dbError.message || "Failed to delete file record from database.");
  }
  revalidatePath("/admin/knowledge-base");
  revalidatePath("/dashboard/workspace/.*", "layout");
}
