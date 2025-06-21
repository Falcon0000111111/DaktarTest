
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useState, type FormEvent, useEffect, ChangeEvent, RefObject } from "react";
import { generateQuizFromPdfsAction } from "@/lib/actions/quiz.actions";
import { getKnowledgeBaseFileAsDataUri } from "@/lib/actions/knowledge.actions";
import { FileUp, Info, FileText, BadgeAlert, X, Percent, FolderOpen } from "lucide-react";
import type { Quiz, KnowledgeBaseFile } from "@/types/supabase";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface UploadQuizFormProps {
  workspaceId: string;
  onUploadStarted: () => void;
  onUploadComplete: (quizId: string) => void;
  onActualCancel: () => void; 
  onFormValidityChange: (isValid: boolean) => void;
  initialNumQuestions?: number;
  initialPassingScore?: number | null;
  existingQuizIdToUpdate?: string;
  initialPdfNameHint?: string;
  className?: string; 
  formSubmitRef: RefObject<HTMLButtonElement>;
  knowledgeFiles: KnowledgeBaseFile[];
}

const MAX_FILE_SIZE_MB = 10;
const MAX_QUESTIONS = 50;

const questionStyleOptions = [
  { id: "multiple-choice", label: "Multiple choice questions" },
  { id: "short-descriptions", label: "Short Descriptions (as MCQs)" },
  { id: "fill-in-the-blanks", label: "Fill in the blanks (as MCQs)" },
];

export function UploadQuizForm({
    workspaceId,
    onUploadStarted,
    onUploadComplete,
    onActualCancel,
    onFormValidityChange,
    initialNumQuestions,
    initialPassingScore,
    existingQuizIdToUpdate,
    initialPdfNameHint,
    className,
    formSubmitRef,
    knowledgeFiles
}: UploadQuizFormProps) {
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [numQuestions, setNumQuestions] = useState(initialNumQuestions || 5);
  const [passingScore, setPassingScore] = useState<number | null>(initialPassingScore === undefined ? 70 : initialPassingScore);
  const [selectedQuestionStyles, setSelectedQuestionStyles] = useState<string[]>(["multiple-choice"]);
  const [hardMode, setHardMode] = useState(false);
  const [topicsToFocus, setTopicsToFocus] = useState("");
  const [topicsToDrop, setTopicsToDrop] = useState("");
  const [loading, setLoading] = useState(false); 
  const { toast } = useToast();

  const [selectedKnowledgeFileId, setSelectedKnowledgeFileId] = useState<string>("");
  const isRegenerationMode = !!existingQuizIdToUpdate;

  useEffect(() => {
    const isDirectUploadValid = pdfFiles.length > 0;
    const isKnowledgeSelectionValid = !!selectedKnowledgeFileId;
    const isConfigValid = numQuestions >= 1 && numQuestions <= MAX_QUESTIONS &&
                    (passingScore === null || (passingScore >=0 && passingScore <= 100));

    onFormValidityChange((isDirectUploadValid || isKnowledgeSelectionValid) && isConfigValid);
  }, [pdfFiles, selectedKnowledgeFileId, numQuestions, passingScore, onFormValidityChange]);


  useEffect(() => {
    if (initialNumQuestions !== undefined) {
      setNumQuestions(initialNumQuestions);
    }
    if (initialPassingScore !== undefined) {
      setPassingScore(initialPassingScore);
    } else {
      setPassingScore(70);
    }

    if (!isRegenerationMode) {
        setSelectedQuestionStyles(["multiple-choice"]); 
        setHardMode(false);
        setTopicsToFocus("");
        setTopicsToDrop("");
        setSelectedKnowledgeFileId("");
        setPdfFiles([]);
    }
  }, [initialNumQuestions, initialPassingScore, isRegenerationMode]);

  const handleKnowledgeFileChange = (fileId: string) => {
    setSelectedKnowledgeFileId(fileId);
    if (fileId) {
        setPdfFiles([]);
        const fileInput = document.getElementById('pdf-file-dialog') as HTMLInputElement;
        if (fileInput) fileInput.value = "";
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const file = event.target.files[0];
      if (!file) return;

      if (file.type !== "application/pdf") {
        toast({ title: "Invalid File Type", description: `"${file.name}" is not a PDF.`, variant: "destructive" });
        return;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast({ title: "File Too Large", description: `"${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
        return;
      }
      setPdfFiles([file]);
      setSelectedKnowledgeFileId(""); 
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setPdfFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    if (pdfFiles.length === 1 && indexToRemove === 0) {
        const fileInput = document.getElementById('pdf-file-dialog') as HTMLInputElement;
        if (fileInput) fileInput.value = "";
    }
  };

  const handleNumQuestionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setNumQuestions(0); 
    } else {
      const parsedValue = parseInt(value, 10);
      if (!isNaN(parsedValue)) {
        setNumQuestions(parsedValue);
      }
    }
  };
  
  const handlePassingScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setPassingScore(null);
    } else {
      const parsedValue = parseInt(value, 10);
      if (!isNaN(parsedValue) && parsedValue >= 0 && parsedValue <= 100) {
        setPassingScore(parsedValue);
      } else if (!isNaN(parsedValue)) {
        setPassingScore(parsedValue); 
      }
    }
  };

  const handleQuestionStyleChange = (styleId: string, checked: boolean) => {
    setSelectedQuestionStyles(prev =>
      checked ? [...prev, styleId] : prev.filter(s => s !== styleId)
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const isDirectUpload = pdfFiles.length > 0;
    const isKnowledgeSelection = !!selectedKnowledgeFileId;

    if (!isDirectUpload && !isKnowledgeSelection) {
      toast({ title: "No Source Selected", description: "Please either upload a PDF or select a file from the Knowledge Base.", variant: "destructive" });
      return;
    }
    if (numQuestions < 1 || numQuestions > MAX_QUESTIONS) {
      toast({ title: "Invalid Question Count", description: `Total number of questions must be between 1 and ${MAX_QUESTIONS}.`, variant: "destructive" });
      return;
    }
    if (passingScore !== null && (passingScore < 0 || passingScore > 100)) {
      toast({ title: "Invalid Passing Score", description: "Passing score must be between 0 and 100, or left empty.", variant: "destructive" });
      return;
    }

    setLoading(true); 
    onUploadStarted(); 

    try {
      let pdfDocumentsInput: { name: string; dataUri: string }[] = [];
      let quizTitle: string | undefined = initialPdfNameHint;

      if (isDirectUpload) {
          const file = pdfFiles[0];
          const reader = new FileReader();
          const promise = new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
          });
          reader.readAsDataURL(file);
          const dataUri = await promise;
          pdfDocumentsInput = [{ name: file.name, dataUri }];
          if (!isRegenerationMode) {
              quizTitle = file.name;
          }
      } else if (isKnowledgeSelection) {
          const selectedFile = knowledgeFiles.find(f => f.id === selectedKnowledgeFileId);
          if (!selectedFile) throw new Error("Selected knowledge file not found.");
          
          toast({ title: "Processing File", description: `Retrieving "${selectedFile.file_name}" from Knowledge Base.`});
          const { name, dataUri } = await getKnowledgeBaseFileAsDataUri(selectedFile.file_path);
          pdfDocumentsInput = [{ name: name, dataUri }];
          quizTitle = name;
      }


      toast({
        title: `Processing Document`,
        description: `Quiz generation has started for "${quizTitle}". This may take a moment.`
      });

      const preferredStylesString = selectedQuestionStyles.join(", ");

      const generatedQuiz: Quiz = await generateQuizFromPdfsAction({
        workspaceId,
        pdfDocuments: pdfDocumentsInput,
        totalNumberOfQuestions: numQuestions,
        passingScorePercentage: passingScore,
        quizTitle: quizTitle,
        existingQuizIdToUpdate: isRegenerationMode ? existingQuizIdToUpdate : undefined,
        preferredQuestionStyles: preferredStylesString || undefined,
        hardMode: hardMode,
        topicsToFocus: topicsToFocus || undefined,
        topicsToDrop: topicsToDrop || undefined,
      });

      onUploadComplete(generatedQuiz.id); 

    } catch (error) {
      console.error(`Error processing files:`, error);
      let errorMessage = "Failed to process the PDF(s).";
      if (error instanceof Error) errorMessage = error.message;
      else if (typeof error === 'string') errorMessage = error;
      else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') errorMessage = error.message;
      
      toast({ title: `Error Generating Quiz`, description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false); 
      setPdfFiles([]);
      setSelectedKnowledgeFileId("");
      if (!isRegenerationMode) {
        setSelectedQuestionStyles(["multiple-choice"]);
        setHardMode(false);
        setTopicsToFocus("");
        setTopicsToDrop("");
        setPassingScore(70);
      }
      const formElement = document.getElementById('pdf-upload-form-in-dialog') as HTMLFormElement;
      if (formElement) formElement.reset(); 
      const fileInput = document.getElementById('pdf-file-dialog') as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    }
  };

  return (
    <form 
        onSubmit={handleSubmit} 
        className={cn("overflow-y-auto", className)} 
        id="pdf-upload-form-in-dialog"
    >
      <button type="submit" ref={formSubmitRef} style={{ display: 'none' }} aria-hidden="true" />

      <div className="space-y-4 pr-2">
        <div className="space-y-2">
            <Label htmlFor="kb-select" className="flex items-center">
              <FolderOpen className="mr-2 h-4 w-4" />
              Knowledge Base (Select an existing file)
            </Label>
            <Select
              value={selectedKnowledgeFileId}
              onValueChange={handleKnowledgeFileChange}
              disabled={loading || pdfFiles.length > 0 || isRegenerationMode}
            >
              <SelectTrigger id="kb-select">
                <SelectValue placeholder="Select a file..." />
              </SelectTrigger>
              <SelectContent>
                {knowledgeFiles.length > 0 ? (
                  knowledgeFiles.map(file => (
                    <SelectItem key={file.id} value={file.id}>
                      {file.file_name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-files" disabled>
                    No files in knowledge base
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {isRegenerationMode && <p className="text-xs text-muted-foreground">Knowledge base selection is disabled in re-generation mode.</p>}
        </div>

        <div className="relative py-2">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-content1 px-2 text-xs uppercase text-muted-foreground bg-background">Or</span>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="pdf-file-dialog" className="flex items-center">
            <FileUp className="mr-2 h-4 w-4" />
            Upload a New PDF
          </Label>
          <Input
            id="pdf-file-dialog"
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            disabled={loading || !!selectedKnowledgeFileId}
          />
        </div>

        {pdfFiles.length > 0 && (
          <div className="space-y-2">
              <div className="max-h-24 overflow-y-auto w-full rounded-md border p-2 bg-muted/50">
                  <ul className="space-y-1.5">
                      {pdfFiles.map((file, index) => (
                      <li key={index} className="text-xs flex items-center justify-between group p-1 hover:bg-background/50 rounded">
                          <div className="flex items-center truncate">
                              <FileText className="h-3.5 w-3.5 mr-1.5 flex-shrink-0 text-muted-foreground" />
                              <span className="truncate" title={file.name}>{file.name}</span>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="h-5 w-5 opacity-50 group-hover:opacity-100 focus:opacity-100 text-destructive hover:text-destructive" onClick={() => handleRemoveFile(index)} disabled={loading} title={`Remove ${file.name}`} >
                              <X className="h-3.5 w-3.5" />
                          </Button>
                      </li>
                      ))}
                  </ul>
              </div>
          </div>
        )}
        
        {!pdfFiles.length && !selectedKnowledgeFileId && !loading && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700 flex items-start">
              <BadgeAlert className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>Please select a file from the Knowledge Base or upload a new PDF.</span>
          </div>
        )}

        <Separator className="my-4" />
        
        <h3 className="text-md font-semibold">Quiz Configuration</h3>

        <div className="space-y-2">
          <Label htmlFor="num-questions-dialog">Total Number of Questions (1-{MAX_QUESTIONS})</Label>
          <Input id="num-questions-dialog" type="number" value={numQuestions > 0 ? numQuestions.toString() : ""} onChange={handleNumQuestionsChange} min="1" max={MAX_QUESTIONS.toString()} placeholder="e.g., 10" required disabled={loading} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="passing-score-dialog" className="flex items-center">
             <Percent className="mr-2 h-4 w-4 text-muted-foreground" /> Passing Score (Optional, 0-100%)
          </Label>
          <Input id="passing-score-dialog" type="number" value={passingScore === null ? "" : passingScore.toString()} onChange={handlePassingScoreChange} min="0" max="100" placeholder="e.g., 70 (for 70%)" disabled={loading} />
           {passingScore !== null && (passingScore < 0 || passingScore > 100) && (
            <p className="text-xs text-destructive">Passing score must be between 0 and 100.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Preferred Question Styles (Optional)</Label>
          <p className="text-xs text-muted-foreground">Output will be MCQs. Styles like "Short Descriptions" or "Fill in the blanks" will be adapted into an MCQ format.</p>
          <div className="grid grid-cols-1 sm:grid-cols-1 gap-x-4 gap-y-2 pt-1"> 
            {questionStyleOptions.map((style) => (
              <div key={style.id} className="flex items-center space-x-2">
                <Checkbox id={`style-${style.id}`} checked={selectedQuestionStyles.includes(style.id)} onCheckedChange={(checked) => handleQuestionStyleChange(style.id, !!checked)} disabled={loading} />
                <Label htmlFor={`style-${style.id}`} className="text-sm font-normal cursor-pointer">
                  {style.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 pt-2">
          <Switch id="hard-mode" checked={hardMode} onCheckedChange={setHardMode} disabled={loading} />
          <Label htmlFor="hard-mode">Hard Mode (More challenging questions)</Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="topics-to-focus">Topics/Keywords to Focus On (Optional, comma-separated)</Label>
          <Input id="topics-to-focus" type="text" placeholder="e.g., photosynthesis, cell division" value={topicsToFocus} onChange={(e) => setTopicsToFocus(e.target.value)} disabled={loading} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="topics-to-drop">Topics/Keywords to Drop (Optional, comma-separated)</Label>
          <Input id="topics-to-drop" type="text" placeholder="e.g., historical background, specific dates" value={topicsToDrop} onChange={(e) => setTopicsToDrop(e.target.value)} disabled={loading} />
        </div>
      </div>
    </form>
  );
}
