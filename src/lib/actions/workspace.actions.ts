
"use server";

import { createClient } from "@/lib/supabase/server";
import type { Workspace } from "@/types/supabase";
import { revalidatePath } from "next/cache";
import { cookies } from 'next/headers';

export async function createWorkspace(name: string): Promise<Workspace> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to create a workspace.");
  }

  const { data, error } = await supabase
    .from("workspaces")
    .insert({ name, user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error("Error creating workspace:", error);
    throw new Error("Could not create the workspace. Please try again later.");
  }
  revalidatePath("/dashboard");
  return data;
}

export async function getWorkspaces(): Promise<Workspace[]> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
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
    throw new Error("Could not load your workspaces. Please refresh the page.");
  }
  return data || [];
}

export async function getWorkspaceById(workspaceId: string): Promise<Workspace | null> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to view a workspace.");
  }

  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .eq("user_id", user.id)
    .single();
  
  if (error && error.code !== 'PGRST116') { 
    console.error("Error fetching workspace by ID:", error);
    throw new Error("Could not load the workspace. Please try again later.");
  }
  return data;
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to delete a workspace.");
  }

  // First, verify the user owns the workspace they're trying to delete.
  const { error: checkError } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (checkError) {
    throw new Error("Workspace not found or you don't have permission to delete it.");
  }

  // Delete all quizzes associated with the workspace.
  const { error: deleteQuizzesError } = await supabase
    .from("quizzes")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id); 
  
  if (deleteQuizzesError) {
    console.error("Error deleting quizzes in workspace:", deleteQuizzesError);
    throw new Error("Failed to delete quizzes associated with the workspace. Please try again.");
  }

  // Finally, delete the workspace itself.
  const { error } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspaceId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting workspace:", error);
    throw new Error("Failed to delete the workspace. Please try again.");
  }
  revalidatePath("/dashboard");
}
