
"use client";

import type { Quiz, GeneratedQuizQuestion, UserAnswers } from "@/types/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, HelpCircle, InfoIcon, ChevronDown, ChevronUp, Award, AlertTriangleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import Image from 'next/image';
import type { User } from "@supabase/supabase-js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface QuizResultsDisplayProps {
  quiz: Quiz;
  quizData: GeneratedQuizQuestion[];
  userAnswers: UserAnswers;
  user: User | null;
  onRetake: () => void;
}

export function QuizResultsDisplay({ quiz, quizData, userAnswers, user, onRetake }: QuizResultsDisplayProps) {
  const [expandedExplanations, setExpandedExplanations] = useState<Record<number, boolean>>({});

  if (!quizData || quizData.length === 0) {
    return <p className="text-muted-foreground">No quiz data available to display results.</p>;
  }

  let score = 0;
  quizData.forEach((q, index) => {
    if (userAnswers[index] === q.options[q.correct_answer_key]) {
      score++;
    }
  });
  const percentage = quizData.length > 0 ? Math.round((score / quizData.length) * 100) : 0;
  
  const passingScore = quiz.passing_score_percentage;
  let passed: boolean | null = null;
  if (passingScore !== null && passingScore !== undefined) {
    passed = percentage >= passingScore;
  }

  const toggleExplanation = (index: number) => {
    setExpandedExplanations(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Quiz Taker";
  const userEmail = user?.email || "User";
  const fallbackName = userEmail.substring(0, 2).toUpperCase();

  const congratulatoryText = `Amazing work, ${userName}! You've mastered this topic. Keep up the great momentum!`;
  const encouragingText = `Good effort, ${userName}! This was a tough one. Review the explanations below and give it another shot.`;

  return (
    <div className="space-y-8">
       <Card className="overflow-hidden shadow-lg border">
        <CardContent className="p-0 flex flex-col md:flex-row items-stretch">
            <div className={cn(
                "p-6 flex-shrink-0 flex items-center justify-center",
                passed ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"
            )}>
              <Image 
                  src={passed ? "https://placehold.co/120x120.png" : "https://placehold.co/120x120.png"}
                  alt={passed ? "Celebration" : "Encouragement"}
                  width={120} 
                  height={120} 
                  className="rounded-full shadow-md object-cover"
                  data-ai-hint={passed ? "celebration trophy" : "sad bear study"}
              />
            </div>
            <div className="p-6 flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-start gap-4">
                    <div>
                        <h3 className="text-xl font-semibold mb-1">Quiz Results: {quiz.pdf_name || "Untitled Quiz"}</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                            You scored {score} out of {quizData.length} ({percentage}%)
                        </p>
                    </div>
                    <Avatar className="h-12 w-12 flex-shrink-0 border-2 border-white dark:border-background shadow-sm">
                        <AvatarImage src={user?.user_metadata?.avatar_url} alt={userEmail} />
                        <AvatarFallback>{fallbackName}</AvatarFallback>
                    </Avatar>
                </div>
              
              {passed !== null && (
                <div className={cn(
                  "text-lg font-semibold",
                  passed ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {passed ? <Award className="mr-2 h-5 w-5 inline-block" /> : <AlertTriangleIcon className="mr-2 h-5 w-5 inline-block" />}
                  Status: {passed ? "Passed" : "Failed"}
                  {passingScore !== null && <span className="text-sm font-normal ml-1 text-muted-foreground">(Passing: {passingScore}%)</span>}
                </div>
              )}
               <p className="text-muted-foreground mt-2 text-sm">{passed ? congratulatoryText : encouragingText}</p>
            </div>
        </CardContent>
      </Card>


      <div className="space-y-6">
        {quizData.map((q, index) => {
          const userAnswer = userAnswers[index];
          const correctAnswerText = q.options[q.correct_answer_key];
          const isCorrect = userAnswer === correctAnswerText;
          const wasAttempted = userAnswer !== undefined && userAnswer !== null && userAnswer !== "";
          const isExplanationVisible = expandedExplanations[index];

          return (
            <div key={index} className="p-4 rounded-lg border bg-card shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <p className="text-base font-semibold flex-1 pr-2">Q{index + 1}: {q.question_text}</p>
                {wasAttempted ? (
                  isCorrect ? (
                    <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                  )
                ) : (
                  <HelpCircle className="h-6 w-6 text-yellow-500 flex-shrink-0" />
                )}
              </div>
              
              <div className="space-y-3">
                <ul className="space-y-2">
                  {Object.entries(q.options).map(([key, optionText]) => (
                    <li
                      key={key}
                      className={cn(
                        "text-sm p-3 rounded-md border flex items-start",
                        optionText === correctAnswerText ? 'bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 font-medium' : '',
                        optionText === userAnswer && !isCorrect ? 'bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-700 text-red-700 dark:text-red-300' : '',
                        optionText !== correctAnswerText && optionText !== userAnswer ? 'bg-muted/30 border-border' : ''
                      )}
                    >
                      <span className="font-semibold mr-2">{key}.</span>
                      <span className="flex-1">{optionText}</span>
                      {optionText === correctAnswerText && <span className="ml-2 font-semibold text-xs py-1">(Correct)</span>}
                      {optionText === userAnswer && !isCorrect && <span className="ml-2 font-semibold text-xs py-1">(Your Answer)</span>}
                    </li>
                  ))}
                </ul>
                
                {!wasAttempted && (
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">You did not attempt this question.</p>
                )}
                
                <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold flex items-center">
                            <InfoIcon className="h-4 w-4 mr-2 text-blue-500"/>
                            Explanation:
                        </p>
                        <Button variant="ghost" size="icon" onClick={() => toggleExplanation(index)} className="h-7 w-7 text-muted-foreground">
                            {isExplanationVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            <span className="sr-only">{isExplanationVisible ? "Hide" : "Show"} explanation</span>
                        </Button>
                    </div>
                    {isExplanationVisible && (
                        <p className="text-sm text-muted-foreground pl-1 animate-accordion-down">
                            {q.explanation || "No explanation provided."}
                        </p>
                    )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
