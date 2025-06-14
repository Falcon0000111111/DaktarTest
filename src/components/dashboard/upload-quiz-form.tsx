
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState, type FormEvent, useEffect } from "react";
import { generateQuizFromPdfAction } from "@/lib/actions/quiz.actions";
import { FileUp, Wand2, Loader2, X, Info } from "lucide-react";

interface UploadQuizFormProps {
  workspaceId: string;
  onUploadComplete: () => void; 
  onCancel: () => void; 
  initialNumQuestions?: number;
  existingQuizIdToUpdate?: string;
  initialPdfNameHint?: string;
}

export function UploadQuizForm({ 
    workspaceId, 
    onUploadComplete, 
    onCancel, 
    initialNumQuestions,
    existingQuizIdToUpdate,
    initialPdfNameHint
}: UploadQuizFormProps) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [numQuestions, setNumQuestions] = useState(initialNumQuestions || 5);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (initialNumQuestions !== undefined) {
      setNumQuestions(initialNumQuestions);
    }
  }, [initialNumQuestions]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type !== "application/pdf") {
        toast({ title: "Invalid File Type", description: "Please upload a PDF file.", variant: "destructive" });
        setPdfFile(null);
        event.target.value = ""; 
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({ title: "File Too Large", description: "PDF file size should not exceed 10MB.", variant: "destructive" });
        setPdfFile(null);
        event.target.value = ""; 
        return;
      }
      setPdfFile(file);
    }
  };

  const handleNumQuestionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      // Let it be empty for a moment, handleSubmit will validate
      // Or clamp: setNumQuestions(1); 
    } else {
      const parsedValue = parseInt(value, 10);
      if (!isNaN(parsedValue)) { // Allow any number temporarily, validation on submit
        setNumQuestions(parsedValue);
      }
    }
  };


  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!pdfFile) {
      toast({ title: "Error", description: "Please select a PDF file.", variant: "destructive" });
      return;
    }
    if (numQuestions < 1 || numQuestions > 20) {
      toast({ title: "Error", description: "Number of questions must be between 1 and 20.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(pdfFile);
      reader.onloadend = async () => {
        const pdfDataUri = reader.result as string;
        try {
          await generateQuizFromPdfAction({
            workspaceId,
            pdfName: pdfFile.name,
            pdfDataUri,
            numberOfQuestions: numQuestions,
            existingQuizIdToUpdate: existingQuizIdToUpdate, // Pass this along
          });
          toast({ 
            title: existingQuizIdToUpdate ? "Quiz Re-Generation Started" : "Quiz Generation Started", 
            description: "Your quiz is being processed. This may take a few moments." 
          });
          setPdfFile(null);
          (document.getElementById('pdf-upload-form-in-dialog') as HTMLFormElement)?.reset(); 
          onUploadComplete(); 
        } catch (error) {
          console.error("Error in generateQuizFromPdfAction call:", error);
          toast({ title: existingQuizIdToUpdate ? "Error Re-Generating Quiz" : "Error Generating Quiz", description: (error as Error).message, variant: "destructive" });
        } finally {
          setLoading(false);
        }
      };
      reader.onerror = () => {
        console.error("Error reading file");
        toast({ title: "File Read Error", description: "Could not read the PDF file.", variant: "destructive" });
        setLoading(false);
      };
    } catch (error) {
      console.error("Error preparing file:", error);
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4" id="pdf-upload-form-in-dialog">
      {initialPdfNameHint && (
        <div className="p-3 bg-secondary/50 rounded-md text-sm text-secondary-foreground flex items-center">
            <Info className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>Re-generating for: <strong>{initialPdfNameHint}</strong>. Please re-select the PDF file.</span>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="pdf-file-dialog" className="flex items-center">
          <FileUp className="mr-2 h-5 w-5" /> PDF Document
        </Label>
        <Input
          id="pdf-file-dialog"
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          required
          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
        />
        {pdfFile && <p className="text-sm text-muted-foreground">Selected: {pdfFile.name}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="num-questions-dialog">Number of Questions (1-20)</Label>
        <Input
          id="num-questions-dialog"
          type="number"
          value={numQuestions.toString()} // Ensure value is string for input
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
          <Button type="submit" disabled={loading || !pdfFile}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            {loading ? (existingQuizIdToUpdate ? "Re-Generating..." : "Generating...") : (existingQuizIdToUpdate ? "Re-Generate Quiz" : "Generate Quiz")}
          </Button>
      </div>
    </form>
  );
}
