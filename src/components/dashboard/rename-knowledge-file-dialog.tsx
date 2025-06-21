
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
import { renameKnowledgeBaseDocument } from "@/lib/actions/knowledge.actions";
import { useToast } from "@/hooks/use-toast";
import type { KnowledgeBaseDocument } from "@/types/supabase";
import { useState, useEffect, type FormEvent } from "react";
import { Edit3 } from "lucide-react";

interface RenameKnowledgeFileDialogProps {
  doc: KnowledgeBaseDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileRenamed: () => void;
}

export function RenameKnowledgeFileDialog({ doc, open, onOpenChange, onFileRenamed }: RenameKnowledgeFileDialogProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (doc) {
      setName(doc.file_name || "");
    }
  }, [doc]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!doc) return;
    if (!name.trim()) {
      toast({ title: "Error", description: "File name cannot be empty.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await renameKnowledgeBaseDocument(doc.id, name.trim());
      toast({ title: "Success", description: "File renamed successfully." });
      onFileRenamed();
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Error Renaming File", description: (error as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!doc) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Edit3 className="mr-2 h-5 w-5" /> Rename File
          </DialogTitle>
          <DialogDescription>
            Enter a new name for the file: &quot;{doc.file_name}&quot;.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="file-name" className="text-right">
                Name
              </Label>
              <Input
                id="file-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="e.g., Chapter 1 Notes.pdf"
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
