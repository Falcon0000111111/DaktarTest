import { createClient } from "@/lib/supabase/server"; // Updated import
import { cookies } from 'next/headers'; // Required for server client
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { CreateWorkspaceDialog } from "@/components/dashboard/create-workspace-dialog";
import { WorkspaceList } from "@/components/dashboard/workspace-list";
import { getWorkspaces } from "@/lib/actions/workspace.actions";

export default async function DashboardPage() {
  const supabase = createClient(); // Updated client creation

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // This should ideally be handled by middleware, but as a fallback:
    return <p>You need to be logged in to view this page.</p>;
  }

  const workspaces = await getWorkspaces();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight">Your Workspaces</h1>
          <p className="text-muted-foreground">Organize your quizzes by creating and managing workspaces.</p>
        </div>
        <CreateWorkspaceDialog>
          <Button>
            <PlusCircle className="mr-2 h-5 w-5" />
            New Workspace
          </Button>
        </CreateWorkspaceDialog>
      </div>
      <WorkspaceList initialWorkspaces={workspaces} />
    </div>
  );
}
