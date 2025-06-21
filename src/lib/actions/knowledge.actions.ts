
"use server";

import { createClient } from "@/lib/supabase/server";
import type { KnowledgeBaseDocument } from "@/types/supabase";
import { revalidatePath } from "next/cache";

async function verifyAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }
  
  const { data: isAdmin, error } = await supabase.rpc('is_admin');
  
  if (error) {
    console.error("RPC error checking admin status:", error);
    throw new Error("Could not verify user permissions.");
  }

  if (!isAdmin) {
    throw new Error("Access Denied: You do not have permission to perform this action.");
  }

  return user;
}


export async function uploadKnowledgeBaseFile(formData: FormData): Promise<KnowledgeBaseDocument> {
  const user = await verifyAdmin();
  const supabase = createClient();

  const file = formData.get("file") as File;
  const fileName = formData.get("fileName") as string;
  const description = formData.get("description") as string;

  if (!file) throw new Error("No file provided.");
  if (!fileName) throw new Error("File name is required.");
  if (file.type !== 'application/pdf') throw new Error("Only PDF files are allowed.");

  const fileExt = file.name.split('.').pop();
  const storagePath = `${Date.now()}-${fileName.replace(/\s+/g, "_")}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("knowledge_base_files")
    .upload(storagePath, file);

  if (uploadError) {
    console.error("Error uploading file to storage:", uploadError);
    throw new Error(uploadError.message);
  }

  const { data: newDocEntry, error: dbError } = await supabase
    .from("knowledge_base_documents")
    .insert({
      file_name: fileName,
      description: description,
      storage_path: storagePath,
    })
    .select()
    .single();

  if (dbError || !newDocEntry) {
    console.error("Error creating knowledge base document record:", dbError);
    await supabase.storage.from("knowledge_base_files").remove([storagePath]);
    throw new Error(dbError?.message || "Failed to save file metadata.");
  }

  revalidatePath("/admin/knowledge-base");
  revalidatePath("/dashboard/workspace/.*", "layout");
  return newDocEntry;
}

export async function listKnowledgeBaseDocuments(): Promise<KnowledgeBaseDocument[]> {
  const supabase = createClient();
  // Any authenticated user can list the files.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated.");
  
  const { data, error } = await supabase
    .from("knowledge_base_documents")
    .select("*")
    .order("file_name", { ascending: true });

  if (error) {
    console.error("Error listing knowledge base documents:", error);
    throw new Error(error.message);
  }

  return data || [];
}


export async function getKnowledgeBaseFileAsDataUri(storagePath: string): Promise<{name: string; dataUri: string}> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated.");
    }

    const { data: blob, error } = await supabase.storage
        .from("knowledge_base_files")
        .download(storagePath);

    if (error || !blob) {
        console.error("Error downloading file:", error);
        throw new Error(error.message || "Could not download file from knowledge base.");
    }
    
    const fileNameWithPrefix = storagePath.substring(storagePath.lastIndexOf('/') + 1);
    const fileName = fileNameWithPrefix.substring(fileNameWithPrefix.indexOf('-') + 1).replace(/_/g, " ");

    const buffer = Buffer.from(await blob.arrayBuffer());
    const dataUri = `data:${blob.type || 'application/pdf'};base64,${buffer.toString('base64')}`;

    return { name: fileName, dataUri };
}


export async function deleteKnowledgeBaseDocument(documentId: string): Promise<void> {
  await verifyAdmin();
  const supabase = createClient();

  const { data: doc, error: fetchError } = await supabase
    .from("knowledge_base_documents")
    .select("storage_path")
    .eq("id", documentId)
    .single();

  if (fetchError || !doc) {
    throw new Error("Document not found.");
  }

  const { error: storageError } = await supabase.storage
    .from("knowledge_base_files")
    .remove([doc.storage_path]);
  
  if (storageError) {
    console.error("Error deleting file from storage, but proceeding to delete DB record:", storageError);
  }

  const { error: dbError } = await supabase
    .from("knowledge_base_documents")
    .delete()
    .eq("id", documentId);

  if (dbError) {
    throw new Error(dbError.message || "Failed to delete document record from database.");
  }
  revalidatePath("/admin/knowledge-base");
  revalidatePath("/dashboard/workspace/.*", "layout");
}

export async function renameKnowledgeBaseDocument(documentId: string, newName: string): Promise<void> {
  await verifyAdmin();
  const supabase = createClient();

  if (!newName.trim()) {
    throw new Error("File name cannot be empty.");
  }

  const { error } = await supabase
    .from("knowledge_base_documents")
    .update({ file_name: newName, updated_at: new Date().toISOString() })
    .eq("id", documentId);

  if (error) {
    throw new Error(error.message || "Failed to rename document.");
  }

  revalidatePath("/admin/knowledge-base");
  revalidatePath("/dashboard/workspace/.*", "layout");
}
