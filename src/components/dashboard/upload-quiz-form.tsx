
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useState, type FormEvent, useEffect, RefObject, useMemo } from "react";
import { generateQuizFromPdfsAction } from "@/lib/actions/quiz.actions";
import { BadgeAlert, Percent, FolderOpen, Clock, Calculator } from "lucide-react";
import type { Quiz, KnowledgeBaseDocument, KnowledgeCategory } from "@/types/supabase";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

interface UploadQuizFormProps {
  workspaceId: string;
  onUploadStarted: () => void;
  onUploadComplete: (quizId: string) => void;
  onActualCancel: () => void; 
  onFormValidityChange: (isValid: boolean) => void;
  initialNumQuestions?: number;
  initialPassingScore?: number | null;
  initialDurationMinutes?: number | null;
  existingQuizIdToUpdate?: string;
  className?: string; 
  formSubmitRef: RefObject<HTMLButtonElement>;
  knowledgeFiles: KnowledgeBaseDocument[];
}

const MAX_QUESTIONS = 50;
const MAX_SELECTED_FILES = 5;

const questionStyleOptions = [
  { id: "multiple-choice", label: "Multiple choice questions" },
  { id: "short-descriptions", label: "Short Descriptions (as MCQs)" },
  { id: "fill-in-the-blanks", label: "Fill in the blanks (as MCQs)" },
];

export const CATEGORIES: KnowledgeCategory[] = ['Biology', 'Chemistry', 'Physics', 'English', 'Logical Reasoning'];
const UNCATEGORIZED_ID = "Uncategorized";

export function UploadQuizForm({
    workspaceId,
    onUploadStarted,
    onUploadComplete,
    onActualCancel,
    onFormValidityChange,
    initialNumQuestions,
    initialPassingScore,
    initialDurationMinutes,
    existingQuizIdToUpdate,
    className,
    formSubmitRef,
    knowledgeFiles
}: UploadQuizFormProps) {
  const [selectedFilePaths, setSelectedFilePaths] = useState<string[]>([]);
  const [numQuestions, setNumQuestions] = useState(initialNumQuestions || 5);
  const [passingScore, setPassingScore] = useState<number | null>(initialPassingScore === undefined ? 70 : initialPassingScore);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(initialDurationMinutes === undefined ? null : initialDurationMinutes);
  const [selectedQuestionStyles, setSelectedQuestionStyles] = useState<string[]>(["multiple-choice"]);
  const [hardMode, setHardMode] = useState(false);
  const [numericalMode, setNumericalMode] = useState(false);
  const [topicsToFocus, setTopicsToFocus] = useState("");
  const [topicsToDrop, setTopicsToDrop] = useState("");
  const [loading, setLoading] = useState(false); 
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const isRegenerationMode = !!existingQuizIdToUpdate;

  const docsByCategory = useMemo(() => {
    const grouped: Record<string, KnowledgeBaseDocument[]> = {
      [UNCATEGORIZED_ID]: [],
    };
    CATEGORIES.forEach(cat => grouped[cat] = []);

    knowledgeFiles.forEach(doc => {
      const category = doc.category || UNCATEGORIZED_ID;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(doc);
    });

    return grouped;
  }, [knowledgeFiles]);

  useEffect(() => {
    const isSelectionValid = selectedFilePaths.length > 0;
    const isConfigValid = numQuestions >= 1 && numQuestions <= MAX_QUESTIONS &&
                    (passingScore === null || (passingScore >=0 && passingScore <= 100));

    onFormValidityChange(isSelectionValid && isConfigValid);
  }, [selectedFilePaths, numQuestions, passingScore, onFormValidityChange]);


  useEffect(() => {
    if (initialNumQuestions !== undefined) {
      setNumQuestions(initialNumQuestions);
    }
    if (initialPassingScore !== undefined) {
      setPassingScore(initialPassingScore);
    } else {
      setPassingScore(70);
    }
     if (initialDurationMinutes !== undefined) {
      setDurationMinutes(initialDurationMinutes);
    } else {
      setDurationMinutes(null);
    }

    if (!isRegenerationMode) {
        setSelectedQuestionStyles(["multiple-choice"]); 
        setHardMode(false);
        setNumericalMode(false);
        setTopicsToFocus("");
        setTopicsToDrop("");
        setSelectedFilePaths([]);
    }
  }, [initialNumQuestions, initialPassingScore, initialDurationMinutes, isRegenerationMode]);

  const handleFileSelectionChange = (filePath: string, checked: boolean) => {
    setSelectedFilePaths(prev => {
      if (checked) {
        if (prev.length >= MAX_SELECTED_FILES) {
          toast({
            title: "Selection Limit Reached",
            description: `You can select up to ${MAX_SELECTED_FILES} files.`,
            variant: "destructive"
          });
          return prev;
        }
        return [...prev, filePath];
      } else {
        return prev.filter(path => path !== filePath);
      }
    });
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

   const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setDurationMinutes(null);
    } else {
      const parsedValue = parseInt(value, 10);
      if (!isNaN(parsedValue) && parsedValue > 0) {
        setDurationMinutes(parsedValue);
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

    if (selectedFilePaths.length === 0) {
      toast({ title: "No Source Selected", description: "Please select one or more files from the Knowledge Base.", variant: "destructive" });
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
      const fileNames = selectedFilePaths.map(path => {
        const file = knowledgeFiles.find(f => f.storage_path === path);
        return file ? file.file_name : "Unknown File";
      });
      const quizTitle = fileNames.length > 1 ? `${fileNames.length} files` : fileNames[0];

      if (!isMobile) {
        toast({
          title: `Processing Document(s)`,
          description: `Quiz generation has started for "${quizTitle}". This may take a moment.`
        });
      }

      const preferredStylesString = selectedQuestionStyles.join(", ");

      const generatedQuiz: Quiz = await generateQuizFromPdfsAction({
        workspaceId,
        knowledgeFileStoragePaths: selectedFilePaths,
        totalNumberOfQuestions: numQuestions,
        passingScorePercentage: passingScore,
        durationMinutes: durationMinutes,
        quizTitle: isRegenerationMode ? undefined : quizTitle,
        existingQuizIdToUpdate: isRegenerationMode ? existingQuizIdToUpdate : undefined,
        preferredQuestionStyles: preferredStylesString || undefined,
        hardMode: hardMode,
        numericalMode: numericalMode,
        topicsToFocus: topicsToFocus || undefined,
        topicsToDrop: topicsToDrop || undefined,
      });

      onUploadComplete(generatedQuiz.id); 

    } catch (error) {
        const errorMessage = (error as Error).message || "An unknown error occurred.";
        toast({
          title: "Error Generating Quiz",
          description: errorMessage,
          variant: "destructive",
        });
    } finally {
      setLoading(false);
      if (!isRegenerationMode) {
        setSelectedFilePaths([]);
        setSelectedQuestionStyles(["multiple-choice"]);
        setHardMode(false);
        setNumericalMode(false);
        setTopicsToFocus("");
        setTopicsToDrop("");
        setPassingScore(70);
        setDurationMinutes(null);
      }
      const formElement = document.getElementById('pdf-upload-form-in-dialog') as HTMLFormElement;
      if (formElement) formElement.reset(); 
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
          <Label>Knowledge Base (Select up to {MAX_SELECTED_FILES} files)</Label>
          <Accordion type="single" collapsible className="w-full border rounded-md">
              <AccordionItem value="knowledge-base-selector" className="border-b-0">
                  <AccordionTrigger className="px-3 hover:no-underline">
                      <div className="flex items-center">
                          <FolderOpen className="mr-2 h-4 w-4" />
                          <span>Browse Knowledge Base</span>
                      </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-2 pt-0 pb-2">
                      <Accordion type="multiple" className="w-full">
                          {Object.entries(docsByCategory).filter(([, docs]) => docs.length > 0).map(([category, docs]) => (
                              <AccordionItem value={category} key={category} className="border-b-0">
                                  <AccordionTrigger className="px-2 py-2 text-sm font-normal hover:no-underline">
                                      {category}
                                  </AccordionTrigger>
                                  <AccordionContent className="pl-2 pr-1 pb-1">
                                      <div className="max-h-36 overflow-y-auto w-full rounded-md border p-2 bg-muted/50 space-y-1.5">
                                          {docs.map(doc => (
                                              <div key={doc.id} className="flex items-center space-x-3 p-1">
                                                  <Checkbox
                                                      id={`kb-checkbox-${doc.id}`}
                                                      checked={selectedFilePaths.includes(doc.storage_path)}
                                                      onCheckedChange={(checked) => handleFileSelectionChange(doc.storage_path, !!checked)}
                                                      disabled={loading || (selectedFilePaths.length >= MAX_SELECTED_FILES && !selectedFilePaths.includes(doc.storage_path))}
                                                  />
                                                  <Label htmlFor={`kb-checkbox-${doc.id}`} className="font-normal truncate cursor-pointer flex-1" title={doc.file_name}>
                                                      {doc.file_name}
                                                  </Label>
                                              </div>
                                          ))}
                                      </div>
                                  </AccordionContent>
                              </AccordionItem>
                          ))}
                      </Accordion>
                  </AccordionContent>
              </AccordionItem>
          </Accordion>
          
          {selectedFilePaths.length > 0 && (
            <div className="space-y-1 pt-2">
              <Label className="text-xs text-muted-foreground">Selected ({selectedFilePaths.length}):</Label>
              <div className="flex flex-wrap gap-1.5">
                {selectedFilePaths.map(path => {
                    const file = knowledgeFiles.find(f => f.storage_path === path);
                    return file ? (
                      <Badge key={path} variant="secondary" className="font-normal">
                        {file.file_name}
                      </Badge>
                    ) : null;
                  })}
              </div>
            </div>
          )}
        </div>


        {selectedFilePaths.length === 0 && !loading && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700 flex items-start">
              <BadgeAlert className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>Please select one or more files from the Knowledge Base.</span>
          </div>
        )}

        <Separator className="my-4" />
        
        <h3 className="text-md font-semibold">Quiz Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="num-questions-dialog">Total Questions (1-{MAX_QUESTIONS})</Label>
            <Input id="num-questions-dialog" type="number" value={numQuestions > 0 ? numQuestions.toString() : ""} onChange={handleNumQuestionsChange} min="1" max={MAX_QUESTIONS.toString()} placeholder="e.g., 10" required disabled={loading} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="passing-score-dialog" className="flex items-center">
              <Percent className="mr-2 h-4 w-4 text-muted-foreground" /> Passing Score %
            </Label>
            <Input id="passing-score-dialog" type="number" value={passingScore === null ? "" : passingScore.toString()} onChange={handlePassingScoreChange} min="0" max="100" placeholder="e.g., 70" disabled={loading} />
            {passingScore !== null && (passingScore < 0 || passingScore > 100) && (
              <p className="text-xs text-destructive">Score must be between 0 and 100.</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration-minutes-dialog" className="flex items-center">
             <Clock className="mr-2 h-4 w-4 text-muted-foreground" /> Timer in Minutes (Optional)
          </Label>
          <Input id="duration-minutes-dialog" type="number" value={durationMinutes === null ? "" : durationMinutes.toString()} onChange={handleDurationChange} min="1" placeholder="e.g., 30" disabled={loading} />
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
          <Switch id="hard-mode" checked={hardMode} onCheckedChange={setHardMode} disabled={loading || numericalMode} />
          <Label htmlFor="hard-mode">Hard Mode (More challenging questions)</Label>
        </div>
        
        <div className="flex items-center space-x-2 pt-2">
          <Switch id="numerical-mode" checked={numericalMode} onCheckedChange={setNumericalMode} disabled={loading} />
          <Label htmlFor="numerical-mode" className="flex items-center">
             <Calculator className="mr-2 h-4 w-4 text-muted-foreground" /> Numerical Mode (All questions are calculations)
          </Label>
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
