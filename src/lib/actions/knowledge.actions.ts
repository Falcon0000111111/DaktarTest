
"use server";

import { createClient } from "@/lib/supabase/server";
import type { KnowledgeBaseDocument, KnowledgeCategory } from "@/types/supabase";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

async function verifyAdmin(supabase: SupabaseClient<Database>) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to perform this action.");
  }
  
  const { data: isAdmin, error } = await supabase.rpc('is_admin');
  
  if (error) {
    console.error("RPC error checking admin status:", error);
    throw new Error("Could not verify your permissions. Please try again later.");
  }

  if (!isAdmin) {
    throw new Error("Access Denied: You do not have permission to perform this action.");
  }

  return user;
}

interface UploadFileParams {
  fileDataUri: string;
  fileName: string;
  description: string;
}

export async function uploadKnowledgeBaseFile(params: UploadFileParams): Promise<KnowledgeBaseDocument> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  await verifyAdmin(supabase);

  const { fileDataUri, fileName, description } = params;
  
  if (!fileDataUri) throw new Error("No file data was provided.");
  if (!fileName) throw new Error("A file name is required.");

  const matches = fileDataUri.match(/^data:(.+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("The uploaded file appears to be corrupted or in an invalid format. Please try uploading it again.");
  }
  const contentType = matches[1];
  const base64Data = matches[2];
  
  if (contentType !== 'application/pdf') throw new Error("Only PDF files are allowed.");

  const fileBuffer = Buffer.from(base64Data, 'base64');

  const fileExt = fileName.split('.').pop() || 'pdf';
  const sanitizedFileName = fileName.replace(/\.pdf$/i, '').replace(/[\s\W]+/g, "_");
  const storagePath = `${Date.now()}-${sanitizedFileName}.${fileExt}`;

  // Step 1: Upload to storage
  const { error: uploadError } = await supabase.storage
      .from("knowledge-base-files")
      .upload(storagePath, fileBuffer, { contentType: 'application/pdf' });

  if (uploadError) {
    console.error("Error during storage upload:", uploadError);
    throw new Error("There was a problem saving your file. Please try again later.");
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
      throw new Error("Could not save the file's metadata to the database. Please try again.");
  }

  revalidatePath("/admin/knowledge-base");
  revalidatePath("/dashboard", "layout");
  return newDocEntry;
}


export async function listKnowledgeBaseDocuments(): Promise<KnowledgeBaseDocument[]> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  // RLS policy will handle authentication.
  
  const { data, error } = await supabase
    .from("knowledge_base_documents")
    .select("*")
    .order("file_name", { ascending: true });

  if (error) {
    console.error("Error listing knowledge base documents:", error);
    throw new Error("Could not load documents from the Knowledge Base.");
  }

  return data || [];
}


export async function getKnowledgeBaseFileAsDataUri(storagePath: string): Promise<{name: string; dataUri: string; category: KnowledgeCategory | null}> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("You must be logged in to access this file.");
    }

    const { data: blob, error } = await supabase.storage
        .from("knowledge-base-files")
        .download(storagePath);

    if (error || !blob) {
        console.error("Error downloading file:", error);
        throw new Error("The requested file could not be downloaded from the knowledge base.");
    }
    
    const { data: doc, error: docError } = await supabase.from('knowledge_base_documents').select('file_name, category').eq('storage_path', storagePath).single();
    
    const buffer = Buffer.from(await blob.arrayBuffer());
    const dataUri = `data:${blob.type || 'application/pdf'};base64,${buffer.toString('base64')}`;

    if (docError || !doc) {
      console.error("Error fetching document metadata:", docError);
      // Fallback to parsing from storage path if DB lookup fails
      const fileNameWithPrefix = storagePath.substring(storagePath.lastIndexOf('/') + 1);
      const fallbackFileName = fileNameWithPrefix.substring(fileNameWithPrefix.indexOf('-') + 1).replace(/_/g, " ");
      
      return { name: fallbackFileName, dataUri, category: null };
    }


    return { name: doc.file_name, dataUri, category: doc.category };
}


export async function deleteKnowledgeBaseDocument(documentId: string): Promise<void> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  await verifyAdmin(supabase);

  const { data: doc, error: fetchError } = await supabase
    .from("knowledge_base_documents")
    .select("storage_path")
    .eq("id", documentId)
    .single();

  if (fetchError || !doc) {
    throw new Error("The document you are trying to delete could not be found.");
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
    throw new Error("Failed to delete the document record. Please try again.");
  }
  revalidatePath("/admin/knowledge-base");
  revalidatePath("/dashboard", "layout");
}

export async function renameKnowledgeBaseDocument(documentId: string, newName: string): Promise<void> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  await verifyAdmin(supabase);

  if (!newName.trim()) {
    throw new Error("File name cannot be empty.");
  }

  const { error } = await supabase
    .from("knowledge_base_documents")
    .update({ file_name: newName, updated_at: new Date().toISOString() })
    .eq("id", documentId);

  if (error) {
    throw new Error("Failed to rename the document. Please try again.");
  }

  revalidatePath("/admin/knowledge-base");
  revalidatePath("/dashboard", "layout");
}

export async function updateKnowledgeBaseFileCategory(
  documentId: string,
  category: KnowledgeCategory | null
): Promise<KnowledgeBaseDocument> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  await verifyAdmin(supabase);

  const { data, error } = await supabase
    .from("knowledge_base_documents")
    .update({ category: category, updated_at: new Date().toISOString() })
    .eq("id", documentId)
    .select()
    .single();
  
  if (error) {
    console.error("Error updating file category:", error);
    throw new Error("Failed to update the file's category. Please try again.");
  }

  revalidatePath("/admin/knowledge-base");
  revalidatePath("/dashboard/workspace", "layout");

  return data;
}
