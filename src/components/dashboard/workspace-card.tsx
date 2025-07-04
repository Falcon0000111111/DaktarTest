
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
      toast({ title: "Error", description: "Could not delete the workspace. Please try again.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200 flex flex-col animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Folder className="h-6 w-6 mr-3 text-primary" />
            <CardTitle className="text-xl">{workspace.name}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <CardDescription>
          Created at: {new Date(workspace.created_at).toLocaleDateString()}
        </CardDescription>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2 border-t pt-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-destructive border-destructive/50 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive" 
              disabled={isDeleting} 
              title="Delete Workspace"
            >
              <Trash2 className="mr-0 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Delete</span>
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
        <Button asChild size="sm">
          <Link href={`/dashboard/workspace/${workspace.id}`}>
            Open Workspace <ArrowRightCircle className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
