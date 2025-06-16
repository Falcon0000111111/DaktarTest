
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
  children?: ReactNode; 
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDialogClose: (refresh?: boolean) => void; 
  onQuizGenerationStart: () => void; 
  onQuizGenerated: (quizId: string) => void; 
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
  
  const isRegenerationMode = !!existingQuizIdToUpdate;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) {
         onDialogClose(false); 
      }
    }}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center">
            <FileUp className="mr-2 h-5 w-5 text-primary" /> 
            {isRegenerationMode ? "Re-Generate Quiz" : "Generate New Quiz(zes)"}
          </DialogTitle>
          <DialogDescription>
            {isRegenerationMode 
              ? `Re-generating quiz for "${initialPdfName || 'document'}". You will need to re-upload the PDF.` 
              : "Upload one or more PDF documents (max 5) and specify the number of questions. The AI will generate a quiz based on each document's content."
            }
          </DialogDescription>
        </DialogHeader>
        
        <UploadQuizForm 
          workspaceId={workspaceId} 
          onUploadStarted={onQuizGenerationStart} 
          onUploadComplete={(quizId) => {
            onQuizGenerated(quizId); 
          }}
          onCancel={() => {
            onOpenChange(false);
            onDialogClose(false); 
          }}
          initialNumQuestions={initialNumQuestions}
          existingQuizIdToUpdate={existingQuizIdToUpdate}
          initialPdfNameHint={initialPdfName}
          className="flex-1 min-h-0" // Allows form to take available space and handle internal scroll
        />
      </DialogContent>
    </Dialog>
  );
}
