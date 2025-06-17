
import { Button } from "@/components/ui/button";
import { CreateWorkspaceDialog } from "@/components/dashboard/create-workspace-dialog";
import { getWorkspaces } from "@/lib/actions/workspace.actions";
import { WorkspaceList } from "@/components/dashboard/workspace-list";
import { PlusCircle, LayoutDashboard } from "lucide-react";

export default async function DashboardPage() {
  const workspaces = await getWorkspaces();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <LayoutDashboard className="h-8 w-8 mr-3 text-primary" />
          <h1 className="text-3xl font-bold font-headline">Your Workspaces</h1>
        </div>
        <CreateWorkspaceDialog>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> New workspace
          </Button>
        </CreateWorkspaceDialog>
      </div>
      <WorkspaceList initialWorkspaces={workspaces} />
    </div>
  );
}
