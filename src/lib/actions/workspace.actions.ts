"use server";

import { createClient } from "@/lib/supabase/server"; // Updated import
import type { Workspace } from "@/types/supabase";
import { revalidatePath } from "next/cache";
import { cookies } from 'next/headers'; // Required for server client

export async function createWorkspace(name: string): Promise<Workspace> {
  const supabase = createClient(); // Updated client creation
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
  const supabase = createClient(); // Updated client creation
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
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
  const supabase = createClient(); // Updated client creation
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
  
  if (error && error.code !== 'PGRST116') { 
    console.error("Error fetching workspace by ID:", error);
    throw new Error(error.message || "Failed to fetch workspace.");
  }
  return data;
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  const supabase = createClient(); // Updated client creation
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

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

  const { error: deleteQuizzesError } = await supabase
    .from("quizzes")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id); 
  
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
