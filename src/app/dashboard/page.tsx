
import { Button } from "@/components/ui/button";
import { CreateWorkspaceDialog } from "@/components/dashboard/create-workspace-dialog";
import { getWorkspaces } from "@/lib/actions/workspace.actions";
import { WorkspaceList } from "@/components/dashboard/workspace-list";
import { PlusCircle, LayoutDashboard } from "lucide-react";

export default async function DashboardPage() {
  const workspaces = await getWorkspaces();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold font-headline text-gray-800 dark:text-gray-100 mb-1 sm:mb-2">
            Workspaces
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-400">
            Organize your projects and quizzes.
          </p>
        </div>
        <CreateWorkspaceDialog>
          <Button variant="ghost" className="mt-4 sm:mt-0 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 px-3 py-2 rounded-md">
            <PlusCircle className="mr-2 h-4 w-4" /> New workspace
          </Button>
        </CreateWorkspaceDialog>
      </div>
      <WorkspaceList initialWorkspaces={workspaces} />
    </div>
  );
}
