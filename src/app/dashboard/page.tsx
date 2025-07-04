
import { Button } from "@/components/ui/button";
import { CreateWorkspaceDialog } from "@/components/dashboard/create-workspace-dialog";
import { getWorkspaces } from "@/lib/actions/workspace.actions";
import { WorkspaceList } from "@/components/dashboard/workspace-list";
import { PlusCircle, LayoutDashboard } from "lucide-react";
import { Header } from "@/components/layout/header";

export default async function DashboardPage() {
  const workspaces = await getWorkspaces();

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 md:px-8 py-4 md:py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <LayoutDashboard className="h-8 w-8 mr-3 text-primary" />
              <h1 className="text-3xl font-bold">Your Workspaces</h1>
            </div>
            <CreateWorkspaceDialog>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> New workspace
              </Button>
            </CreateWorkspaceDialog>
          </div>
          <WorkspaceList initialWorkspaces={workspaces} />
        </div>
      </div>
    </div>
  );
}
