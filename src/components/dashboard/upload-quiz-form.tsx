
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState, type FormEvent, useEffect, ChangeEvent } from "react";
import { generateQuizFromPdfAction } from "@/lib/actions/quiz.actions";
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
const MAX_TOTAL_FILES = 5; // Limit total number of files to prevent abuse

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

      if (!isRegenerationMode && filesArray.length > MAX_TOTAL_FILES) {
        toast({ 
          title: "Too Many Files", 
          description: `Please select a maximum of ${MAX_TOTAL_FILES} PDF files at a time.`, 
          variant: "destructive" 
        });
        event.target.value = ""; // Clear the input
        setPdfFiles([]); // Clear current selection
        return;
      }
      
      const filesToProcess = isRegenerationMode ? filesArray.slice(0,1) : filesArray;

      for (const file of filesToProcess) {
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
      }
      setPdfFiles(newValidFiles);
      if (filesSkipped === filesArray.length && filesArray.length > 0) {
         event.target.value = ""; // Clear input if all files were skipped
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
    if (numQuestions < 1 || numQuestions > 20) {
      toast({ title: "Invalid Question Count", description: "Number of questions must be between 1 and 20.", variant: "destructive" });
      return;
    }

    setLoading(true);
    onUploadStarted(); 

    let lastGeneratedQuizId: string | null = null;
    let filesProcessedSuccessfully = 0;

    const filesToSubmit = isRegenerationMode ? pdfFiles.slice(0,1) : pdfFiles;

    for (const pdfFile of filesToSubmit) {
      try {
        const reader = new FileReader();
        const promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
        });
        reader.readAsDataURL(pdfFile);
        const pdfDataUri = await promise;

        toast({ 
          title: `Processing: ${pdfFile.name}`, 
          description: "Quiz generation has started for this file. This may take a moment." 
        });

        const generatedQuiz: Quiz = await generateQuizFromPdfAction({
          workspaceId,
          pdfName: pdfFile.name,
          pdfDataUri,
          numberOfQuestions: numQuestions,
          existingQuizIdToUpdate: isRegenerationMode ? existingQuizIdToUpdate : undefined, 
        });
        lastGeneratedQuizId = generatedQuiz.id;
        filesProcessedSuccessfully++;
      } catch (error) {
        console.error(`Error processing file ${pdfFile.name}:`, error);
        toast({ title: `Error: ${pdfFile.name}`, description: (error as Error).message || "Failed to process this PDF.", variant: "destructive" });
      }
    }

    setLoading(false);
    if (lastGeneratedQuizId) {
        if(filesToSubmit.length > 1 && filesProcessedSuccessfully > 0) {
            toast({
                title: "Processing Complete",
                description: `${filesProcessedSuccessfully} of ${filesToSubmit.length} quizzes started generation. You'll be taken to the last one. Check 'Review/Retake Quizzes' for others.`
            });
        }
      onUploadComplete(lastGeneratedQuizId);
    } else if (filesProcessedSuccessfully === 0 && filesToSubmit.length > 0) {
      // No quiz ID to pass, but need to signify that dialog can close if all failed
      onCancel(); // Effectively closing the dialog as if generation failed for all
    }
    
    setPdfFiles([]);
    const formElement = document.getElementById('pdf-upload-form-in-dialog') as HTMLFormElement;
    formElement?.reset();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4" id="pdf-upload-form-in-dialog">
      {isRegenerationMode && initialPdfNameHint && (
        <div className="p-3 bg-secondary/50 rounded-md text-sm text-secondary-foreground flex items-start">
            <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            <span>Re-generating for: <strong>{initialPdfNameHint}</strong>. Please re-select the PDF file.</span>
        </div>
      )}
      {!isRegenerationMode && initialPdfNameHint && ( 
        <div className="p-3 bg-secondary/50 rounded-md text-sm text-secondary-foreground flex items-start">
            <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            <span>Generating new quiz. Hint from previous: <strong>{initialPdfNameHint}</strong>. Select new PDF(s).</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="pdf-file-dialog" className="flex items-center">
          <FileUp className="mr-2 h-5 w-5" /> {isRegenerationMode ? "PDF Document" : `PDF Document(s) (Max ${MAX_TOTAL_FILES})`}
        </Label>
        <Input
          id="pdf-file-dialog"
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          multiple={!isRegenerationMode} // Allow multiple only if not regenerating
          required={pdfFiles.length === 0} // Required only if no files are yet in state (e.g. after a clear)
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
            <span>{isRegenerationMode ? "Please select a PDF file to re-generate the quiz." : "Please select one or more PDF files to generate quizzes."}</span>
        </div>
       )}


      <div className="space-y-2">
        <Label htmlFor="num-questions-dialog">Number of Questions (1-20)</Label>
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
            {loading ? (isRegenerationMode ? "Re-Generating..." : "Generating...") : (isRegenerationMode ? "Re-Generate Quiz" : "Generate Quiz(zes)")}
          </Button>
      </div>
    </form>
  );
}
