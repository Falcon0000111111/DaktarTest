
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
} from "@/components/ui/dialog";
import { UploadQuizForm } from "./upload-quiz-form";
import type { ReactNode} from "react";
import { FileUp, X, Wand2, Loader2 } from "lucide-react";
import React, { useRef, useState } from "react";

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
  const formSubmitButtonRef = useRef<HTMLButtonElement>(null);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [isFormValidForSubmission, setIsFormValidForSubmission] = useState(false);


  const handleDialogClose = (refresh?: boolean) => {
    setIsFormSubmitting(false); // Reset submitting state on close
    onDialogClose(refresh);
  }

  const handleOpenChangeWithReset = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      handleDialogClose(false);
    }
  }

  const handleGenerateClick = () => {
    formSubmitButtonRef.current?.click();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChangeWithReset}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="p-6 pb-4 flex-shrink-0">
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
          onUploadStarted={() => {
            setIsFormSubmitting(true);
            onQuizGenerationStart();
          }} 
          onUploadComplete={(quizId) => {
            setIsFormSubmitting(false);
            onQuizGenerated(quizId); 
          }}
          onFormValidityChange={setIsFormValidForSubmission}
          // Note: onCancel is effectively handled by DialogFooter's cancel button + onOpenChange
          initialNumQuestions={initialNumQuestions}
          existingQuizIdToUpdate={existingQuizIdToUpdate}
          initialPdfNameHint={initialPdfName}
          className="flex-1 min-h-0 px-6 pt-2 pb-1" // Ensure form takes space and has padding for its scrollable content
          formSubmitRef={formSubmitButtonRef} // Pass ref for programmatic submission
          onActualCancel={() => { // form's internal cancel, e.g. if it had its own "reset"
            onOpenChange(false);
            handleDialogClose(false);
          }}
        />
        <DialogFooter className="p-6 pt-4 border-t flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => {
                onOpenChange(false);
                handleDialogClose(false);
            }} disabled={isFormSubmitting}>
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button type="button" onClick={handleGenerateClick} disabled={isFormSubmitting || !isFormValidForSubmission}>
              {isFormSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              {isFormSubmitting ? (isRegenerationMode ? "Re-Generating..." : "Generating...") : (isRegenerationMode ? "Re-Generate Quiz" : "Generate Quiz")}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
