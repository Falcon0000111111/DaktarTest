
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { listAllUsers } from "@/lib/actions/user.actions";
import { UserManagementTable } from "@/components/admin/user-management-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { cookies } from "next/headers";

export default async function AdminUsersPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  try {
    const users = await listAllUsers();
    return <UserManagementTable initialUsers={users} />;
  } catch (error) {
    return (
      <Alert variant="destructive" className="max-w-lg">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Users</AlertTitle>
        <AlertDescription>
          There was a problem loading the user list. Please refresh the page to try again.
        </AlertDescription>
      </Alert>
    );
  }
}
