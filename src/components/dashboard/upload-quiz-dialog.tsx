
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
  initialPdfName?: string; // Renamed from initialPdfNameHint for clarity
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
  initialPdfName, // Use the renamed prop
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
      <DialogContent className="sm:max-w-lg">
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
            // Dialog is closed by onOpenChange(false) from parent after this usually
          }}
          onCancel={() => {
            onOpenChange(false);
            onDialogClose(false); 
          }}
          initialNumQuestions={initialNumQuestions}
          existingQuizIdToUpdate={existingQuizIdToUpdate}
          initialPdfNameHint={initialPdfName} // Pass down the renamed prop
        />
      </DialogContent>
    </Dialog>
  );
}
