
"use client";

import type { Workspace } from "@/types/supabase";
import { WorkspaceCard } from "./workspace-card";
import { Folder } from "lucide-react"; // Changed from Frown
import Link from "next/link";
import { Button } from "../ui/button";

interface WorkspaceListProps {
  initialWorkspaces: Workspace[];
  isInSidebar?: boolean;
}

export function WorkspaceList({ initialWorkspaces, isInSidebar = false }: WorkspaceListProps) {
  if (initialWorkspaces.length === 0) {
    if (isInSidebar) {
      return (
        <div className="flex flex-col items-center justify-center text-center py-4 px-2">
          <Folder className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No workspaces yet
          </p>
          <p className="text-xs text-muted-foreground">
            Create your first workspace
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 border-2 border-dashed rounded-lg animate-fade-in">
        <Folder className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold font-headline">No Workspaces Yet</h2>
        <p className="text-muted-foreground">
          Get started by creating your first workspace to organize your quizzes.
        </p>
      </div>
    );
  }

  if (isInSidebar) {
    return (
      <div className="space-y-1 py-1">
        {initialWorkspaces.map((ws) => (
          <Button
            key={ws.id}
            variant="ghost"
            className="w-full justify-start h-auto py-2 px-2 text-sm"
            asChild
          >
            <Link href={`/dashboard/workspace/${ws.id}`}>
              <Folder className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="truncate">{ws.name}</span>
            </Link>
          </Button>
        ))}
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

