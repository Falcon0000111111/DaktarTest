
import { Button } from "@/components/ui/button";
import { CreateWorkspaceDialog } from "@/components/dashboard/create-workspace-dialog";
import { getWorkspaces } from "@/lib/actions/workspace.actions";
import { WorkspaceList } from "@/components/dashboard/workspace-list";
import { PlusCircle, LayoutDashboard } from "lucide-react";

export default async function DashboardPage() {
  const workspaces = await getWorkspaces();

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <LayoutDashboard className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-3xl font-bold font-headline">Your Workspaces</h1>
            <p className="text-muted-foreground">
              Manage your study materials and generated quizzes.
            </p>
          </div>
        </div>
        <CreateWorkspaceDialog>
          <Button>
            <PlusCircle className="mr-2 h-5 w-5" /> New Workspace
          </Button>
        </CreateWorkspaceDialog>
      </div>
      <WorkspaceList initialWorkspaces={workspaces} />
    </div>
  );
}
