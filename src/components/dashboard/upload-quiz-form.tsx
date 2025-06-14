
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState, type FormEvent } from "react";
import { generateQuizFromPdfAction } from "@/lib/actions/quiz.actions";
import { FileUp, Wand2, Loader2, X } from "lucide-react";

interface UploadQuizFormProps {
  workspaceId: string;
  onUploadComplete: () => void; // Callback for successful upload
  onCancel: () => void; // Callback for cancellation
}

export function UploadQuizForm({ workspaceId, onUploadComplete, onCancel }: UploadQuizFormProps) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [numQuestions, setNumQuestions] = useState(5);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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
    // Allow empty string temporarily, or parse if not empty
    if (value === "") {
      // Keep current valid number, or set a default if you prefer the field to clear
      // For now, let's allow it to be "empty" visually but numQuestions holds last valid
    } else {
      const parsedValue = parseInt(value, 10);
      if (!isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 20) {
        setNumQuestions(parsedValue);
      } else if (!isNaN(parsedValue) && (parsedValue < 1 || parsedValue > 20)) {
        // If out of range, don't update, or clamp, or show error
        // For now, we let the native input validation handle min/max messages
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
          });
          toast({ title: "Quiz Generation Started", description: "Your quiz is being generated. This may take a few moments." });
          setPdfFile(null);
          (document.getElementById('pdf-upload-form-in-dialog') as HTMLFormElement)?.reset(); 
          onUploadComplete(); // Call parent callback
        } catch (error) {
          console.error("Error in generateQuizFromPdfAction call:", error);
          toast({ title: "Error Generating Quiz", description: (error as Error).message, variant: "destructive" });
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
          value={numQuestions} // Controlled component
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
            {loading ? "Generating..." : "Generate Quiz"}
          </Button>
      </div>
    </form>
  );
}
