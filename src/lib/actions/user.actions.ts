
"use server";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/supabase";
import { revalidatePath } from "next/cache";

async function verifyAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated.");
  
  const { data: isAdmin, error } = await supabase.rpc('is_admin');
  if (error || !isAdmin) {
    throw new Error("Access Denied: You do not have permission to perform this action.");
  }
}

export async function listAllUsers(): Promise<Profile[]> {
  await verifyAdmin();
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("profiles")
    .select(`id, role, llm_requests_count, llm_request_limit`);

  if (error) {
    console.error("Error listing users:", error);
    throw new Error(error.message);
  }

  // Manually cast to Profile[] as select with specific columns is not fully typed
  return data as Profile[];
}

export async function updateUserRequestLimit(userId: string, newLimit: number): Promise<Profile> {
  await verifyAdmin();
  const supabase = createClient();
  
  if (newLimit < 0) {
    throw new Error("Limit cannot be negative.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ llm_request_limit: newLimit })
    .eq("id", userId)
    .select()
    .single();

  if (error || !data) {
    console.error("Error updating user limit:", error);
    throw new Error(error?.message || "Failed to update user limit.");
  }

  revalidatePath("/admin/users");
  return data;
}
