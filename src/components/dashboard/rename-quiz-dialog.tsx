
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
import { renameQuizAction } from "@/lib/actions/quiz.actions";
import { useToast } from "@/hooks/use-toast";
import type { Quiz } from "@/types/supabase";
import { useState, useEffect, type FormEvent } from "react";
import { Edit3 } from "lucide-react";

interface RenameQuizDialogProps {
  quiz: Quiz | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuizRenamed: () => void; // To refresh list or update UI
}

export function RenameQuizDialog({ quiz, open, onOpenChange, onQuizRenamed }: RenameQuizDialogProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (quiz) {
      setName(quiz.pdf_name || "");
    }
  }, [quiz]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!quiz) return;
    if (!name.trim()) {
      toast({ title: "Error", description: "Quiz name cannot be empty.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await renameQuizAction(quiz.id, name.trim());
      toast({ title: "Success", description: "Quiz renamed successfully." });
      onQuizRenamed();
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Error Renaming Quiz", description: (error as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!quiz) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Edit3 className="mr-2 h-5 w-5" /> Rename Quiz
          </DialogTitle>
          <DialogDescription>
            Enter a new name for the quiz: &quot;{quiz.pdf_name || "Untitled Quiz"}&quot;.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quiz-name" className="text-right">
                Name
              </Label>
              <Input
                id="quiz-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="e.g., Chapter 1 Review"
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
