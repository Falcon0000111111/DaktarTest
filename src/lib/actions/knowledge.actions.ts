
"use server";

import { createClient } from "@/lib/supabase/server";
import type { KnowledgeBaseDocument } from "@/types/supabase";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

async function verifyAdmin() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
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
  await verifyAdmin();
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const file = formData.get("file") as File;
  const fileName = formData.get("fileName") as string;
  const description = formData.get("description") as string;

  if (!file) throw new Error("No file provided.");
  if (!fileName) throw new Error("File name is required.");
  if (file.type !== 'application/pdf') throw new Error("Only PDF files are allowed.");

  const fileExt = file.name.split('.').pop() || 'pdf';
  const sanitizedFileName = fileName.replace(/\.pdf$/i, '').replace(/\s+/g, "_");
  const storagePath = `${Date.now()}-${sanitizedFileName}.${fileExt}`;

  // Step 1: Upload to storage
  const { error: uploadError } = await supabase.storage
    .from("knowledge-base-files")
    .upload(storagePath, file);

  if (uploadError) {
    console.error("Error during storage upload:", uploadError);
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  // Step 2: Insert into database
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
    console.error("Error during database insert:", dbError);
    // Cleanup storage if db insert fails
    await supabase.storage.from("knowledge-base-files").remove([storagePath]);
    throw new Error(`Database insert failed: ${dbError?.message || "Could not save file metadata."}`);
  }

  revalidatePath("/admin/knowledge-base");
  revalidatePath("/dashboard", "layout");
  return newDocEntry;
}

export async function listKnowledgeBaseDocuments(): Promise<KnowledgeBaseDocument[]> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  // RLS policy will handle authentication. Removing redundant user check.
  
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
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("User not authenticated.");
    }

    const { data: blob, error } = await supabase.storage
        .from("knowledge-base-files")
        .download(storagePath);

    if (error || !blob) {
        console.error("Error downloading file:", error);
        throw new Error(error.message || "Could not download file from knowledge base.");
    }
    
    const { data: doc, error: docError } = await supabase.from('knowledge_base_documents').select('file_name').eq('storage_path', storagePath).single();

    if (docError || !doc) {
      console.error("Error fetching document name:", docError);
      // Fallback to parsing from storage path if DB lookup fails
      const fileNameWithPrefix = storagePath.substring(storagePath.lastIndexOf('/') + 1);
      const fallbackFileName = fileNameWithPrefix.substring(fileNameWithPrefix.indexOf('-') + 1).replace(/_/g, " ");
      
      const buffer = Buffer.from(await blob.arrayBuffer());
      const dataUri = `data:${blob.type || 'application/pdf'};base64,${buffer.toString('base64')}`;
      return { name: fallbackFileName, dataUri };
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    const dataUri = `data:${blob.type || 'application/pdf'};base64,${buffer.toString('base64')}`;

    return { name: doc.file_name, dataUri };
}


export async function deleteKnowledgeBaseDocument(documentId: string): Promise<void> {
  await verifyAdmin();
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: doc, error: fetchError } = await supabase
    .from("knowledge_base_documents")
    .select("storage_path")
    .eq("id", documentId)
    .single();

  if (fetchError || !doc) {
    throw new Error("Document not found.");
  }

  const { error: storageError } = await supabase.storage
    .from("knowledge-base-files")
    .remove([doc.storage_path]);
  
  if (storageError) {
    console.warn("Could not delete file from storage, but proceeding to delete DB record:", storageError);
  }

  const { error: dbError } = await supabase
    .from("knowledge_base_documents")
    .delete()
    .eq("id", documentId);

  if (dbError) {
    throw new Error(dbError.message || "Failed to delete document record from database.");
  }
  revalidatePath("/admin/knowledge-base");
  revalidatePath("/dashboard", "layout");
}

export async function renameKnowledgeBaseDocument(documentId: string, newName: string): Promise<void> {
  await verifyAdmin();
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

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
  revalidatePath("/dashboard", "layout");
}
