
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { UploadQuizForm } from "./upload-quiz-form";
import type { ReactNode } from "react";
import { FileUp } from "lucide-react";

interface UploadQuizDialogProps {
  children: ReactNode; // Trigger element
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDialogClose: (refresh?: boolean) => void; // Callback when dialog closes, optionally indicating refresh
}

export function UploadQuizDialog({
  children,
  workspaceId,
  open,
  onOpenChange,
  onDialogClose,
}: UploadQuizDialogProps) {
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) {
        // Assuming no refresh by default when just closing by 'x' or overlay click
        // The form submission will call onDialogClose(true)
      }
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center">
            <FileUp className="mr-2 h-5 w-5 text-primary" /> Generate New Quiz
          </DialogTitle>
          <DialogDescription>
            Upload a PDF document and specify the number of questions.
            The AI will generate a quiz based on the document content.
          </DialogDescription>
        </DialogHeader>
        
        <UploadQuizForm 
          workspaceId={workspaceId} 
          onUploadComplete={() => onDialogClose(true)} // Pass refresh true on successful upload
          onCancel={() => onOpenChange(false)} // Simply close dialog on form's cancel
        />

      </DialogContent>
    </Dialog>
  );
}
