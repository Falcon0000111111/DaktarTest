
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { generateQuizFromPdfAction } from "@/lib/actions/quiz.actions";
import { FileUp, Wand2, Loader2 } from "lucide-react";

interface UploadQuizFormProps {
  workspaceId: string;
}

export function UploadQuizForm({ workspaceId }: UploadQuizFormProps) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [numQuestions, setNumQuestions] = useState(5);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type !== "application/pdf") {
        toast({ title: "Invalid File Type", description: "Please upload a PDF file.", variant: "destructive" });
        setPdfFile(null);
        event.target.value = ""; // Reset file input
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({ title: "File Too Large", description: "PDF file size should not exceed 10MB.", variant: "destructive" });
        setPdfFile(null);
        event.target.value = ""; // Reset file input
        return;
      }
      setPdfFile(file);
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
          (document.getElementById('pdf-upload-form') as HTMLFormElement)?.reset(); // Reset form fields
          router.refresh(); // Re-fetch quizzes list
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
    <form onSubmit={handleSubmit} className="space-y-6" id="pdf-upload-form">
      <div className="space-y-2">
        <Label htmlFor="pdf-file" className="flex items-center">
          <FileUp className="mr-2 h-5 w-5" /> PDF Document
        </Label>
        <Input
          id="pdf-file"
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          required
          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
        />
        {pdfFile && <p className="text-sm text-muted-foreground">Selected: {pdfFile.name}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="num-questions">Number of Questions</Label>
        <Input
          id="num-questions"
          type="number"
          value={numQuestions}
          onChange={(e) => {
            const parsedValue = parseInt(e.target.value, 10);
            if (!isNaN(parsedValue)) {
              setNumQuestions(parsedValue);
            }
            // If parseInt results in NaN (e.g., empty string or non-numeric text),
            // setNumQuestions is not called. numQuestions retains its previous valid value.
            // This prevents the `value` prop of the input from receiving NaN.
          }}
          min="1"
          max="20" // Reasonable limit for demo
          required
        />
      </div>
      <Button type="submit" disabled={loading || !pdfFile} className="w-full sm:w-auto">
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Wand2 className="mr-2 h-4 w-4" />
        )}
        {loading ? "Generating..." : "Generate Quiz"}
      </Button>
    </form>
  );
}
