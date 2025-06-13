"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Workspace } from "@/types/supabase";
import { revalidatePath } from "next/cache";

export async function createWorkspace(name: string): Promise<Workspace> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data, error } = await supabase
    .from("workspaces")
    .insert({ name, user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error("Error creating workspace:", error);
    throw new Error(error.message || "Failed to create workspace.");
  }
  revalidatePath("/dashboard");
  return data;
}

export async function getWorkspaces(): Promise<Workspace[]> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Return empty array or throw error based on desired behavior for unauthenticated access to this action
    return []; 
  }

  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching workspaces:", error);
    throw new Error(error.message || "Failed to fetch workspaces.");
  }
  return data || [];
}

export async function getWorkspaceById(workspaceId: string): Promise<Workspace | null> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .eq("user_id", user.id)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116: single row not found
    console.error("Error fetching workspace by ID:", error);
    throw new Error(error.message || "Failed to fetch workspace.");
  }
  return data;
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

  // Ensure the workspace belongs to the user before deleting
  const { error: checkError } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (checkError) {
    console.error("Error verifying workspace ownership or workspace not found:", checkError);
    throw new Error("Workspace not found or permission denied.");
  }

  // Delete quizzes associated with the workspace first (if cascade delete is not set up or want explicit control)
  const { error: deleteQuizzesError } = await supabase
    .from("quizzes")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id); // ensure user owns quizzes too
  
  if (deleteQuizzesError) {
    console.error("Error deleting quizzes in workspace:", deleteQuizzesError);
    throw new Error(deleteQuizzesError.message || "Failed to delete quizzes in workspace.");
  }

  const { error } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspaceId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting workspace:", error);
    throw new Error(error.message || "Failed to delete workspace.");
  }
  revalidatePath("/dashboard");
}
