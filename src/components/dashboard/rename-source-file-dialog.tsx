
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
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, type FormEvent } from "react";
import { Edit3 } from "lucide-react";

interface RenameSourceFileDialogProps {
  oldName: string | null; // Can be null if dialog is not yet triggered
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSourceFileRenamed: (oldName: string, newName: string) => void;
}

export function RenameSourceFileDialog({ oldName, open, onOpenChange, onSourceFileRenamed }: RenameSourceFileDialogProps) {
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (oldName) {
      setNewName(oldName); // Initialize with current name for editing
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
        onOpenChange(false); // No change, just close
        return;
    }

    setLoading(true);
    try {
      // The actual renaming logic is handled by the parent via onSourceFileRenamed
      // which calls the server action. This dialog just collects the new name.
      onSourceFileRenamed(oldName, trimmedNewName);
      onOpenChange(false); // Close dialog on successful submission in parent
    } catch (error) {
      // This catch might not be strictly necessary if parent handles toast
      // but good for robustness if onSourceFileRenamed itself could throw client-side
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!oldName) return null; // Don't render if oldName isn't set (dialog not properly triggered)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Edit3 className="mr-2 h-5 w-5" /> Rename Source File
          </DialogTitle>
          <DialogDescription>
            Enter a new name for the source file: &quot;{oldName}&quot;. This will update all quizzes associated with this source file.
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
                placeholder="e.g., Annual Report 2023.pdf"
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
