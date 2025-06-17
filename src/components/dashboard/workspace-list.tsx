
"use client";

import type { Workspace } from "@/types/supabase";
import { WorkspaceCard } from "./workspace-card";
import { FolderOpen } from "lucide-react"; 

interface WorkspaceListProps {
  initialWorkspaces: Workspace[];
}

export function WorkspaceList({ initialWorkspaces }: WorkspaceListProps) {
  if (initialWorkspaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
        <FolderOpen className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-6" data-ai-hint="empty folder" />
        <h2 className="text-2xl font-semibold font-headline text-gray-700 dark:text-gray-200">
          No Workspaces Yet
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md">
          It looks like you haven&apos;t created any workspaces.
          Get started by clicking the &quot;+ New Workspace&quot; button above.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {initialWorkspaces.map((ws) => (
        <WorkspaceCard key={ws.id} workspace={ws} />
      ))}
    </div>
  );
}
