
import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { CreateWorkspaceDialog } from "./create-workspace-dialog";
import { getWorkspaces } from "@/lib/actions/workspace.actions";
import { WorkspaceList } from "./workspace-list";
import Link from "next/link";
import { PlusCircle, Settings, Folder as FolderIcon } from "lucide-react";

export async function DashboardSidebar() {
  const workspaces = await getWorkspaces();

  return (
    <>
      <SidebarHeader className="p-2">
        <CreateWorkspaceDialog>
          <Button variant="default" className="w-full bg-gray-800 hover:bg-gray-700 text-white">
            <PlusCircle className="mr-2 h-5 w-5" />
            New Workspace
          </Button>
        </CreateWorkspaceDialog>
      </SidebarHeader>
      <SidebarContent className="p-0">
        <SidebarGroup className="p-2">
          <SidebarGroupLabel className="px-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
            Your Workspaces
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <WorkspaceList initialWorkspaces={workspaces} isInSidebar={true} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2 mt-auto border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild variant="ghost" className="w-full justify-start">
              <Link href="/dashboard/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
