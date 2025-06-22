
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { renameQuizzesBySourcePdfAction } from "@/lib/actions/quiz.actions";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, type FormEvent } from "react";
import { Edit3 } from "lucide-react";

interface RenameSourceFileDialogProps {
  workspaceId: string;
  oldName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSourceFileRenamed: () => void;
}

export function RenameSourceFileDialog({ workspaceId, oldName, open, onOpenChange, onSourceFileRenamed }: RenameSourceFileDialogProps) {
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (oldName) {
      setNewName(oldName);
    }
  }, [oldName]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!oldName) return;
    const trimmedNewName = newName.trim();
    if (!trimmedNewName) {
      toast({ title: "Error", description: "Source file name cannot be empty.", variant: "destructive" });
      return;
    }
    if (trimmedNewName === oldName) {
      onOpenChange(false);
      return;
    }

    setLoading(true);
    try {
      await renameQuizzesBySourcePdfAction(workspaceId, oldName, trimmedNewName);
      toast({ title: "Success", description: "Source name updated for all related quizzes in this workspace." });
      onSourceFileRenamed();
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Error Renaming Source", description: (error as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!oldName) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Edit3 className="mr-2 h-5 w-5" /> Rename Source File
          </DialogTitle>
          <DialogDescription>
            Enter a new name for the source file &quot;{oldName}&quot;. This will update all quizzes in this workspace that were generated from this source. This will not affect the global Knowledge Base.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="source-file-name" className="text-right">
                New Name
              </Label>
              <Input
                id="source-file-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="col-span-3"
                placeholder="e.g., Q1 Financial Report"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    