
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
import { X, Wand2, Loader2 } from "lucide-react";
import React, { useRef, useState } from "react";
import type { KnowledgeBaseDocument } from "@/types/supabase";
import { QuizGenerationProgress } from "./quiz-generation-progress";

interface UploadQuizDialogProps {
  children?: ReactNode; 
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDialogClose: (refresh?: boolean) => void; 
  onQuizGenerationStart: () => void; 
  onQuizGenerated: (quizId: string) => void; 
  initialNumQuestions?: number;
  initialPassingScore?: number | null;
  initialDurationMinutes?: number | null;
  existingQuizIdToUpdate?: string;
  knowledgeFiles: KnowledgeBaseDocument[];
}

export function UploadQuizDialog({
  children,
  workspaceId,
  open,
  onOpenChange,
  onDialogClose,
  onQuizGenerationStart,
  onQuizGenerated,
  initialNumQuestions,
  initialPassingScore,
  initialDurationMinutes,
  existingQuizIdToUpdate,
  knowledgeFiles,
}: UploadQuizDialogProps) {
  
  const isRegenerationMode = !!existingQuizIdToUpdate;
  const formSubmitButtonRef = useRef<HTMLButtonElement>(null);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [isFormValidForSubmission, setIsFormValidForSubmission] = useState(false);


  const handleDialogClose = (refresh?: boolean) => {
    setIsFormSubmitting(false); 
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
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 flex-shrink-0 border-b">
          <DialogTitle className="font-headline flex items-center">
            <Wand2 className="mr-2 h-5 w-5 text-primary" /> 
            {isFormSubmitting
              ? "Quiz Generation In Progress"
              : isRegenerationMode
              ? "Re-Generate Quiz"
              : "Generate New Quiz"}
          </DialogTitle>
          <DialogDescription>
            {isFormSubmitting
              ? "The AI is working on your request."
              : isRegenerationMode 
              ? `Re-generating quiz.` 
              : "Select up to 5 files from the global Knowledge Base and configure options to generate a quiz."
            }
          </DialogDescription>
        </DialogHeader>
        
        {isFormSubmitting ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <QuizGenerationProgress />
          </div>
        ) : (
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
            initialNumQuestions={initialNumQuestions}
            initialPassingScore={initialPassingScore}
            initialDurationMinutes={initialDurationMinutes}
            existingQuizIdToUpdate={existingQuizIdToUpdate}
            formSubmitRef={formSubmitButtonRef}
            onActualCancel={() => { 
              onOpenChange(false);
              handleDialogClose(false);
            }}
            knowledgeFiles={knowledgeFiles}
            className="flex-1 min-h-0 px-6 py-4" 
          />
        )}
        
        {!isFormSubmitting && (
          <DialogFooter className="p-6 pt-4 flex-shrink-0 border-t">
              <Button type="button" variant="outline" onClick={() => {
                  onOpenChange(false);
                  handleDialogClose(false);
              }}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button type="button" onClick={handleGenerateClick} disabled={!isFormValidForSubmission}>
                <Wand2 className="mr-2 h-4 w-4" />
                {isRegenerationMode ? "Re-Generate Quiz" : "Generate Quiz"}
              </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
