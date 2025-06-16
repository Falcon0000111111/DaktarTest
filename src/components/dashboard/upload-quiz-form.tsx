
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState, type FormEvent, useEffect, ChangeEvent } from "react";
import { generateQuizFromPdfsAction } from "@/lib/actions/quiz.actions"; // Updated action import
import { FileUp, Wand2, Loader2, X, Info, FileText, BadgeAlert } from "lucide-react";
import type { Quiz } from "@/types/supabase";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      let currentFileCount = 0;

      const maxFilesAllowed = isRegenerationMode ? 1 : MAX_TOTAL_FILES;

      for (const file of filesArray) {
        if (currentFileCount >= maxFilesAllowed) {
            toast({
                title: "File Limit Reached",
                description: `You can select a maximum of ${maxFilesAllowed} file(s) ${isRegenerationMode ? 'for regeneration' : 'at a time'}. Additional files were skipped.`,
                variant: "destructive"
            });
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
        currentFileCount++;
      }
      setPdfFiles(newValidFiles);
      if (filesSkipped === filesArray.length && filesArray.length > 0) {
         event.target.value = ""; 
      } else if (newValidFiles.length === 0 && filesArray.length > 0) {
         event.target.value = ""; // Clear if all new selections were invalid but some were attempted
      }
    }
  };

  const handleNumQuestionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      // Allow empty for a moment
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
    if (numQuestions < 1 || numQuestions > 20) { // Consider adjusting max based on LLM capabilities with multiple docs
      toast({ title: "Invalid Question Count", description: "Total number of questions must be between 1 and 20.", variant: "destructive" });
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
      // For regeneration, initialPdfNameHint is used, which should be the existing quiz's name

      toast({ 
        title: `Processing Document(s)`, 
        description: "Quiz generation has started. This may take a moment." 
      });

      const generatedQuiz: Quiz = await generateQuizFromPdfsAction({
        workspaceId,
        pdfDocuments: pdfDocumentsInput,
        totalNumberOfQuestions: numQuestions,
        quizTitle: quizTitle, 
        existingQuizIdToUpdate: isRegenerationMode ? existingQuizIdToUpdate : undefined,
      });
      
      onUploadComplete(generatedQuiz.id);

    } catch (error) {
      console.error(`Error processing files:`, error);
      toast({ title: `Error Generating Quiz`, description: (error as Error).message || "Failed to process the PDF(s).", variant: "destructive" });
      // Call onCancel or a specific error handler if the entire batch fails before AI call
      onCancel(); 
    } finally {
      setLoading(false);
      setPdfFiles([]);
      const formElement = document.getElementById('pdf-upload-form-in-dialog') as HTMLFormElement;
      formElement?.reset(); // Reset the actual file input
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
          required={pdfFiles.length === 0} 
          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
        />
      </div>

      {pdfFiles.length > 0 && (
        <div className="space-y-2">
            <Label className="text-sm">Selected file(s):</Label>
            <ScrollArea className="h-24 w-full rounded-md border p-2 bg-muted/50">
                 <ul className="space-y-1">
                    {pdfFiles.map((file, index) => (
                    <li key={index} className="text-xs flex items-center">
                        <FileText className="h-3 w-3 mr-1.5 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate" title={file.name}>{file.name}</span>
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
        <Label htmlFor="num-questions-dialog">Total Number of Questions (1-20)</Label>
        <Input
          id="num-questions-dialog"
          type="number"
          value={numQuestions.toString()} 
          onChange={handleNumQuestionsChange}
          min="1"
          max="20"
          required
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
