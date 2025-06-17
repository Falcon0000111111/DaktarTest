
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Folder, Trash2, ArrowRightCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { Workspace } from "@/types/supabase";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteWorkspace } from "@/lib/actions/workspace.actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface WorkspaceCardProps {
  workspace: Workspace;
}

export function WorkspaceCard({ workspace }: WorkspaceCardProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteWorkspace(workspace.id);
      toast({ title: "Success", description: `Workspace "${workspace.name}" deleted.` });
      router.refresh();
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div 
      className={cn(
        "group bg-card rounded-lg border border-neutral-200 dark:border-neutral-700/50",
        "hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors duration-150 p-4 flex flex-col justify-between min-h-[160px] animate-slide-in-up"
      )}
    >
      <div>
        <Link href={`/dashboard/workspace/${workspace.id}`} className="block mb-2 group-hover:text-primary transition-colors">
          <div className="flex items-center mb-2">
            <Folder className="h-5 w-5 mr-2.5 text-neutral-500 dark:text-neutral-400 group-hover:text-primary transition-colors" />
            <h2 className="text-lg font-medium font-headline text-gray-800 dark:text-gray-100 truncate" title={workspace.name}>
              {workspace.name}
            </h2>
          </div>
        </Link>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
          Created: {new Date(workspace.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="flex items-center justify-end space-x-2 mt-auto pt-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-neutral-500 dark:text-neutral-400 hover:text-destructive dark:hover:text-destructive h-7 w-7"
              title="Delete workspace"
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5 text-destructive" /> Are you sure?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the workspace
                &quot;{workspace.name}&quot; and all associated quizzes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary h-7 px-2">
          <Link href={`/dashboard/workspace/${workspace.id}`}>
            Open <ArrowRightCircle className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
