
"use client";

import type { Workspace } from "@/types/supabase";
import { WorkspaceCard } from "./workspace-card";
import { FileText } from "lucide-react"; // Changed icon

interface WorkspaceListProps {
  initialWorkspaces: Workspace[];
}

export function WorkspaceList({ initialWorkspaces }: WorkspaceListProps) {
  if (initialWorkspaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg animate-fade-in">
        <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" data-ai-hint="document paper" />
        <h2 className="text-xl font-semibold font-headline text-gray-700 dark:text-gray-200">
          No workspaces yet
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Click &lsquo;+ New workspace&rsquo; above to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {initialWorkspaces.map((ws) => (
        <WorkspaceCard key={ws.id} workspace={ws} />
      ))}
    </div>
  );
}
