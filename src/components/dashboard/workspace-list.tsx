"use client";

import type { Workspace } from "@/types/supabase";
import { WorkspaceCard } from "./workspace-card";
import { Frown } from "lucide-react";

interface WorkspaceListProps {
  initialWorkspaces: Workspace[];
}

export function WorkspaceList({ initialWorkspaces }: WorkspaceListProps) {
  if (initialWorkspaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 border-2 border-dashed rounded-lg animate-fade-in">
        <Frown className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold font-headline">No Workspaces Yet</h2>
        <p className="text-muted-foreground">
          Get started by creating your first workspace to organize your quizzes.
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
