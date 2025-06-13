"use client";

import type { Quiz, GeneratedQuizQuestion } from "@/types/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, AlertCircle, Loader2, RefreshCcw } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { generateQuizFromPdfAction } from "@/lib/actions/quiz.actions"; // Assuming this can be reused or a specific retry action exists

interface QuizItemProps {
  quiz: Quiz;
}

export function QuizItem({ quiz }: QuizItemProps) {
  const [isQuizViewOpen, setIsQuizViewOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  let parsedQuizData: GeneratedQuizQuestion[] = [];
  if (quiz.status === "completed" && quiz.generated_quiz_data) {
    try {
      // Ensure generated_quiz_data is an object before accessing .quiz
      if (typeof quiz.generated_quiz_data === 'object' && quiz.generated_quiz_data !== null && 'quiz' in quiz.generated_quiz_data) {
         parsedQuizData = (quiz.generated_quiz_data as { quiz: GeneratedQuizQuestion[] }).quiz;
      } else if (Array.isArray(quiz.generated_quiz_data)) { // Fallback if it's directly an array (older format?)
         parsedQuizData = quiz.generated_quiz_data as GeneratedQuizQuestion[];
      } else {
        console.error("Unexpected quiz data format:", quiz.generated_quiz_data);
      }
    } catch (error) {
      console.error("Error parsing quiz data:", error);
    }
  }

  const handleRetry = async () => {
    // This is a simplified retry. In a real app, you'd need the original PDF data URI.
    // For now, this will likely fail or require re-upload.
    // A better approach would be to store the PDF URI or reference if retries are common.
    toast({
      title: "Retry Not Implemented",
      description: "Retrying failed quiz generation requires re-uploading the PDF or a more complex setup to store PDF data for retries.",
      variant: "destructive",
    });
    return;


    // Example of how it *might* work if PDF data was available:
    // setIsRetrying(true);
    // try {
    //   // You would need to fetch or have access to the original pdfDataUri here
    //   // This is a placeholder and will not work without pdfDataUri
    //   const placeholderPdfDataUri = "data:application/pdf;base64, Cg=="; // Invalid placeholder
    //   await generateQuizFromPdfAction({
    //     workspaceId: quiz.workspace_id,
    //     pdfName: quiz.pdf_name || "Retry Quiz",
    //     pdfDataUri: placeholderPdfDataUri, 
    //     numberOfQuestions: quiz.num_questions,
    //     existingQuizIdToUpdate: quiz.id, // To update existing record
    //   });
    //   toast({ title: "Retrying Quiz Generation", description: "Quiz generation has been re-initiated." });
    //   router.refresh();
    // } catch (error) {
    //   toast({ title: "Retry Failed", description: (error as Error).message, variant: "destructive" });
    // } finally {
    //   setIsRetrying(false);
    // }
  };


  return (
    <Card className="mb-4 transition-all hover:shadow-md">
      <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div className="flex-1 mb-4 sm:mb-0">
          <h3 className="font-semibold text-lg">{quiz.pdf_name || "Untitled Quiz"}</h3>
          <p className="text-sm text-muted-foreground">
            {quiz.num_questions} questions &bull; Created {formatDistanceToNow(new Date(quiz.created_at), { addSuffix: true })}
          </p>
          {quiz.status === "failed" && quiz.error_message && (
             <p className="text-xs text-destructive mt-1">Error: {quiz.error_message}</p>
          )}
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          {quiz.status === "completed" && (
            <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white">Completed</Badge>
          )}
          {quiz.status === "processing" && (
            <Badge variant="secondary" className="animate-pulse"><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Processing</Badge>
          )}
          {quiz.status === "pending" && (
            <Badge variant="outline">Pending</Badge>
          )}
          {quiz.status === "failed" && (
            <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" /> Failed</Badge>
          )}

          {quiz.status === "completed" && parsedQuizData.length > 0 && (
            <Dialog open={isQuizViewOpen} onOpenChange={setIsQuizViewOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm"><Eye className="mr-2 h-4 w-4" /> View Quiz</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="font-headline">{quiz.pdf_name || "Quiz Details"}</DialogTitle>
                  <DialogDescription>
                    Review the generated questions and answers for this quiz.
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                  <Accordion type="single" collapsible className="w-full">
                    {parsedQuizData.map((q, index) => (
                      <AccordionItem value={`item-${index}`} key={index}>
                        <AccordionTrigger className="text-left hover:no-underline">
                          <span className="font-medium">Q{index + 1}: {q.question}</span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <ul className="space-y-2 pl-4">
                            {q.options.map((option, optIndex) => (
                              <li key={optIndex} className={`text-sm p-2 rounded-md ${option === q.answer ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 font-semibold' : 'bg-muted/50'}`}>
                                {option} {option === q.answer && "(Correct Answer)"}
                              </li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          )}
          {quiz.status === "failed" && (
            <Button variant="outline" size="sm" onClick={handleRetry} disabled={isRetrying}>
              {isRetrying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              Retry
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
