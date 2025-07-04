
"use server";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/supabase";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

async function verifyAdmin() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be logged in to perform this action.");
  
  const { data: isAdmin, error } = await supabase.rpc('is_admin');
  if (error || !isAdmin) {
    throw new Error("Access Denied: You do not have permission to perform this action.");
  }
}

export async function listAllUsers(): Promise<Profile[]> {
  await verifyAdmin();
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from("profiles")
    .select(`id, role, llm_requests_count, llm_request_limit`);

  if (error) {
    console.error("Error listing users:", error);
    throw new Error("Failed to load the list of users. Please refresh the page.");
  }

  // Manually cast to Profile[] as select with specific columns is not fully typed
  return data as Profile[];
}

export async function updateUserRequestLimit(userId: string, newLimit: number): Promise<Profile> {
  await verifyAdmin();
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  if (newLimit < 0) {
    throw new Error("Limit cannot be a negative number.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ llm_request_limit: newLimit })
    .eq("id", userId)
    .select();

  if (error) {
    console.error("Error updating user limit:", error);
    throw new Error("Could not update the user's limit. Please try again.");
  }

  if (!data || data.length === 0) {
    throw new Error("Profile not found or permission denied.");
  }

  revalidatePath("/admin/users");
  return data[0];
}
