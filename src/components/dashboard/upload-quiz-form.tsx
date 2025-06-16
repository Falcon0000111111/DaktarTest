
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState, type FormEvent, useEffect, ChangeEvent } from "react";
import { generateQuizFromPdfsAction } from "@/lib/actions/quiz.actions"; // Updated action import
import { FileUp, Wand2, Loader2, X, Info, FileText, BadgeAlert, Trash2 } from "lucide-react";
import type { Quiz } from "@/types/supabase";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface UploadQuizFormProps {
  workspaceId: string;
  onUploadStarted: () => void; 
  onUploadComplete: (quizId: string) => void; 
  onCancel: () => void; 
  initialNumQuestions?: number;
  existingQuizIdToUpdate?: string;
  initialPdfNameHint?: string;
}

const MAX_FILE_SIZE_MB = 10;
const MAX_TOTAL_FILES = 5; 
const MAX_QUESTIONS = 50;

export function UploadQuizForm({ 
    workspaceId, 
    onUploadStarted,
    onUploadComplete, 
    onCancel, 
    initialNumQuestions,
    existingQuizIdToUpdate,
    initialPdfNameHint
}: UploadQuizFormProps) {
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [numQuestions, setNumQuestions] = useState(initialNumQuestions || 5);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isRegenerationMode = !!existingQuizIdToUpdate;

  useEffect(() => {
    if (initialNumQuestions !== undefined) {
      setNumQuestions(initialNumQuestions);
    }
  }, [initialNumQuestions]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      const newValidFiles: File[] = [];
      let filesSkipped = 0;
      
      const maxFilesAllowed = isRegenerationMode ? 1 : MAX_TOTAL_FILES;
      const currentAndNewTotal = pdfFiles.length + filesArray.length;

      if (!isRegenerationMode && currentAndNewTotal > maxFilesAllowed) {
         toast({
            title: "File Limit Exceeded",
            description: `You can select a maximum of ${maxFilesAllowed} files. ${currentAndNewTotal - maxFilesAllowed} additional file(s) were skipped.`,
            variant: "destructive"
        });
      }
      
      let acceptedCount = pdfFiles.length;

      for (const file of filesArray) {
        if (acceptedCount >= maxFilesAllowed) {
            break; 
        }

        if (file.type !== "application/pdf") {
          toast({ title: "Invalid File Type", description: `"${file.name}" is not a PDF and was skipped.`, variant: "destructive" });
          filesSkipped++;
          continue;
        }
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          toast({ title: "File Too Large", description: `"${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB and was skipped.`, variant: "destructive" });
          filesSkipped++;
          continue;
        }
        newValidFiles.push(file);
        acceptedCount++;
      }
      
      if (isRegenerationMode) {
        setPdfFiles(newValidFiles.slice(0, 1)); // Only one file for regeneration
      } else {
        setPdfFiles(prevFiles => [...prevFiles, ...newValidFiles].slice(0, MAX_TOTAL_FILES));
      }

      // Smart reset of file input: only if all *newly selected* files were invalid
      if (filesSkipped === filesArray.length && filesArray.length > 0) {
         event.target.value = ""; 
      }
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setPdfFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    // Reset file input if all files are removed to allow re-selection of the same file
    if (pdfFiles.length === 1 && indexToRemove === 0) {
        const fileInput = document.getElementById('pdf-file-dialog') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = "";
        }
    }
  };


  const handleNumQuestionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      // Allow empty for a moment, handle validation on submit
    } else {
      const parsedValue = parseInt(value, 10);
      if (!isNaN(parsedValue)) { 
        setNumQuestions(parsedValue);
      }
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pdfFiles.length === 0) {
      toast({ title: "No PDF Selected", description: "Please select at least one PDF file.", variant: "destructive" });
      return;
    }
    if (numQuestions < 1 || numQuestions > MAX_QUESTIONS) { 
      toast({ title: "Invalid Question Count", description: `Total number of questions must be between 1 and ${MAX_QUESTIONS}.`, variant: "destructive" });
      return;
    }

    setLoading(true);
    onUploadStarted(); 

    try {
      const pdfDocumentsInput = await Promise.all(
        pdfFiles.map(async (file) => {
          const reader = new FileReader();
          const promise = new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
          });
          reader.readAsDataURL(file);
          const dataUri = await promise;
          return { name: file.name, dataUri };
        })
      );

      let quizTitle = initialPdfNameHint;
      if (!isRegenerationMode && pdfDocumentsInput.length > 1) {
        quizTitle = `Quiz from ${pdfDocumentsInput.length} documents`;
      } else if (!isRegenerationMode && pdfDocumentsInput.length === 1) {
        quizTitle = pdfDocumentsInput[0].name;
      }
      
      const filesToProcess = isRegenerationMode ? pdfDocumentsInput.slice(0,1) : pdfDocumentsInput;

      toast({ 
        title: `Processing Document(s)`, 
        description: `Quiz generation has started for ${filesToProcess.length} document(s). This may take a moment.` 
      });

      const generatedQuiz: Quiz = await generateQuizFromPdfsAction({
        workspaceId,
        pdfDocuments: filesToProcess,
        totalNumberOfQuestions: numQuestions,
        quizTitle: quizTitle, 
        existingQuizIdToUpdate: isRegenerationMode ? existingQuizIdToUpdate : undefined,
      });
      
      onUploadComplete(generatedQuiz.id);

    } catch (error) {
      console.error(`Error processing files:`, error);
      let errorMessage = "Failed to process the PDF(s).";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({ title: `Error Generating Quiz`, description: errorMessage, variant: "destructive" });
      onCancel(); 
    } finally {
      setLoading(false);
      setPdfFiles([]);
      const formElement = document.getElementById('pdf-upload-form-in-dialog') as HTMLFormElement;
      formElement?.reset(); 
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4" id="pdf-upload-form-in-dialog">
      {isRegenerationMode && initialPdfNameHint && (
        <div className="p-3 bg-secondary/50 rounded-md text-sm text-secondary-foreground flex items-start">
            <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            <span>Re-generating for: <strong>{initialPdfNameHint}</strong>. Please re-select the PDF file.</span>
        </div>
      )}
      {!isRegenerationMode && pdfFiles.length > 0 && (
         <div className="p-3 bg-secondary/50 rounded-md text-sm text-secondary-foreground flex items-start">
            <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            <span>A single quiz with {numQuestions} questions will be generated from the selected {pdfFiles.length} document(s).</span>
        </div>
      )}


      <div className="space-y-2">
        <Label htmlFor="pdf-file-dialog" className="flex items-center">
          <FileUp className="mr-2 h-5 w-5" /> 
          {isRegenerationMode ? "PDF Document (Single File)" : `PDF Document(s) (Max ${MAX_TOTAL_FILES})`}
        </Label>
        <Input
          id="pdf-file-dialog"
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          multiple={!isRegenerationMode} 
          required={pdfFiles.length === 0 && !isRegenerationMode} 
          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
          disabled={loading || (pdfFiles.length >= MAX_TOTAL_FILES && !isRegenerationMode)}
        />
         {pdfFiles.length >= MAX_TOTAL_FILES && !isRegenerationMode && (
            <p className="text-xs text-muted-foreground">Maximum of {MAX_TOTAL_FILES} files reached.</p>
        )}
      </div>

      {pdfFiles.length > 0 && (
        <div className="space-y-2">
            <Label className="text-sm">Selected file(s):</Label>
            <ScrollArea className="h-24 w-full rounded-md border p-2 bg-muted/50">
                 <ul className="space-y-1.5">
                    {pdfFiles.map((file, index) => (
                    <li key={index} className="text-xs flex items-center justify-between group p-1 hover:bg-background/50 rounded">
                        <div className="flex items-center truncate">
                            <FileText className="h-3.5 w-3.5 mr-1.5 flex-shrink-0 text-muted-foreground" />
                            <span className="truncate" title={file.name}>{file.name}</span>
                        </div>
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5 opacity-50 group-hover:opacity-100 focus:opacity-100 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveFile(index)}
                            disabled={loading}
                            title={`Remove ${file.name}`}
                        >
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </li>
                    ))}
                </ul>
            </ScrollArea>
        </div>
      )}
       {pdfFiles.length === 0 && !loading && (
         <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700 flex items-start">
            <BadgeAlert className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            <span>{isRegenerationMode ? "Please select a PDF file to re-generate the quiz." : "Please select one or more PDF files to generate a quiz."}</span>
        </div>
       )}


      <div className="space-y-2">
        <Label htmlFor="num-questions-dialog">Total Number of Questions (1-{MAX_QUESTIONS})</Label>
        <Input
          id="num-questions-dialog"
          type="number"
          value={numQuestions.toString()} 
          onChange={handleNumQuestionsChange}
          min="1"
          max={MAX_QUESTIONS.toString()}
          required
          disabled={loading}
        />
      </div>
      <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
          <Button type="submit" disabled={loading || pdfFiles.length === 0}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            {loading ? (isRegenerationMode ? "Re-Generating..." : "Generating...") : (isRegenerationMode ? "Re-Generate Quiz" : "Generate Quiz")}
          </Button>
      </div>
    </form>
  );
}

