
"use client";

import type { Quiz, GeneratedQuizQuestion, UserAnswers } from "@/types/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle, XCircle, HelpCircle } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";

interface QuizResultsDisplayProps {
  quiz: Quiz;
  quizData: GeneratedQuizQuestion[];
  userAnswers: UserAnswers;
}

export function QuizResultsDisplay({ quiz, quizData, userAnswers }: QuizResultsDisplayProps) {
  if (!quizData || quizData.length === 0) {
    return <p className="text-muted-foreground">No quiz data available to display results.</p>;
  }

  let score = 0;
  quizData.forEach((q, index) => {
    if (userAnswers[index] === q.answer) {
      score++;
    }
  });
  const percentage = quizData.length > 0 ? Math.round((score / quizData.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl">Quiz Results: {quiz.pdf_name || "Untitled Quiz"}</CardTitle>
          <CardDescription>
            You scored {score} out of {quizData.length} ({percentage}%)
          </CardDescription>
        </CardHeader>
      </Card>

      <ScrollArea className="h-[calc(100vh-var(--header-height,4rem)-320px)] pr-3"> {/* Adjust height */}
        <Accordion type="multiple" className="w-full space-y-4">
          {quizData.map((q, index) => {
            const userAnswer = userAnswers[index];
            const isCorrect = userAnswer === q.answer;
            const wasAttempted = userAnswer !== undefined;

            return (
              <AccordionItem value={`item-${index}`} key={index} className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="p-4 hover:no-underline [&[data-state=open]]:bg-muted/50">
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium text-left flex-1 pr-2">Q{index + 1}: {q.question}</span>
                    {wasAttempted ? (
                      isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                      )
                    ) : (
                      <HelpCircle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 border-t bg-background">
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Options:</p>
                    <ul className="space-y-2 pl-2">
                      {q.options.map((option, optIndex) => (
                        <li
                          key={optIndex}
                          className={`text-sm p-2 rounded-md border 
                            ${option === q.answer ? 'bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 font-semibold' : ''}
                            ${option === userAnswer && option !== q.answer ? 'bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-700 text-red-700 dark:text-red-300' : ''}
                            ${option !== q.answer && option !== userAnswer ? 'bg-muted/30 border-border' : ''}
                          `}
                        >
                          {option}
                          {option === q.answer && <span className="ml-2 font-bold">(Correct Answer)</span>}
                          {option === userAnswer && option !== q.answer && <span className="ml-2 font-bold">(Your Answer)</span>}
                        </li>
                      ))}
                    </ul>
                    {wasAttempted && !isCorrect && userAnswer && (
                       <p className="text-sm text-red-600 dark:text-red-400"><strong>Your Answer:</strong> {userAnswer}</p>
                    )}
                    <p className="text-sm text-green-700 dark:text-green-300"><strong>Correct Answer:</strong> {q.answer}</p>
                    
                    <div className="pt-2">
                        <p className="text-sm font-semibold">Explanation:</p>
                        <p className="text-sm text-muted-foreground">{q.explanation || "No explanation provided."}</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </ScrollArea>
    </div>
  );
}

