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
  children?: ReactNode; // Make children optional if dialog is opened programmatically
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDialogClose: (refresh?: boolean) => void; // Keep this for general close handling
  onQuizGenerationStart: () => void; // Callback when generation starts
  onQuizGenerated: (quizId: string) => void; // Callback with new/updated quiz ID
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
  onQuizGenerationStart,
  onQuizGenerated,
  initialPdfName,
  initialNumQuestions,
  existingQuizIdToUpdate,
}: UploadQuizDialogProps) {
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) {
         onDialogClose(false); 
      }
    }}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
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
          onUploadStarted={onQuizGenerationStart} // Pass down the start callback
          onUploadComplete={(quizId) => {
            onQuizGenerated(quizId); // Notify parent with quizId
            onOpenChange(false); // Close dialog on successful generation
          }}
          onCancel={() => {
            onOpenChange(false);
            onDialogClose(false); // Also call dialog close if form is cancelled
          }}
          initialNumQuestions={initialNumQuestions}
          existingQuizIdToUpdate={existingQuizIdToUpdate}
          initialPdfNameHint={initialPdfName}
        />
      </DialogContent>
    </Dialog>
  );
}
