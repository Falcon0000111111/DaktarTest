
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
  children: ReactNode; 
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDialogClose: (refresh?: boolean) => void;
  initialPdfName?: string;
  initialNumQuestions?: number;
  existingQuizIdToUpdate?: string;
}

export function UploadQuizDialog({
  children,
  workspaceId,
  open,
  onOpenChange,
  onDialogClose,
  initialPdfName,
  initialNumQuestions,
  existingQuizIdToUpdate,
}: UploadQuizDialogProps) {
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) {
         onDialogClose(false); // Explicitly call with false if dialog is closed without form submission
      }
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center">
            <FileUp className="mr-2 h-5 w-5 text-primary" /> 
            {existingQuizIdToUpdate ? "Re-Generate Quiz" : "Generate New Quiz"}
          </DialogTitle>
          <DialogDescription>
            {existingQuizIdToUpdate 
              ? `Re-generating quiz for "${initialPdfName || 'document'}". You may need to re-upload the PDF.` 
              : "Upload a PDF document and specify the number of questions. The AI will generate a quiz based on the document content."
            }
          </DialogDescription>
        </DialogHeader>
        
        <UploadQuizForm 
          workspaceId={workspaceId} 
          onUploadComplete={() => onDialogClose(true)}
          onCancel={() => onOpenChange(false)} // Form's cancel button
          initialNumQuestions={initialNumQuestions}
          existingQuizIdToUpdate={existingQuizIdToUpdate}
          initialPdfNameHint={initialPdfName} // Pass PDF name as a hint
        />

      </DialogContent>
    </Dialog>
  );
}
