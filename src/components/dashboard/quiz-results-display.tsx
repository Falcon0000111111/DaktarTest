
"use client";

import type { Quiz, GeneratedQuizQuestion, UserAnswers } from "@/types/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, HelpCircle, InfoIcon, RefreshCcw, ListChecks, ChevronDown, ChevronUp, Award, AlertTriangleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import Image from 'next/image';

interface QuizResultsDisplayProps {
  quiz: Quiz;
  quizData: GeneratedQuizQuestion[];
  userAnswers: UserAnswers;
  onRetake: () => void;
}

export function QuizResultsDisplay({ quiz, quizData, userAnswers, onRetake }: QuizResultsDisplayProps) {
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

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-6 p-6 rounded-lg border bg-card shadow-sm">
        <div className="flex-shrink-0">
          {passed ? (
            <Image 
                src="https://placehold.co/100x100.png" 
                alt="Celebration" 
                width={100} 
                height={100} 
                className="rounded-lg"
                data-ai-hint="celebration trophy" 
            />
          ) : (
            <Image 
                src="https://placehold.co/100x100.png" 
                alt="Sad bear" 
                width={100} 
                height={100} 
                className="rounded-lg"
                data-ai-hint="sad bear"
            />
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-1">Quiz Results: {quiz.pdf_name || "Untitled Quiz"}</h3>
          <p className="text-muted-foreground mb-2">
            You scored {score} out of {quizData.length} ({percentage}%)
          </p>
          {passed !== null && (
            <div className={cn(
              "flex items-center text-lg font-semibold p-3 rounded-md",
              passed ? "bg-green-100 text-green-700 dark:bg-green-800/30 dark:text-green-300" 
                     : "bg-red-100 text-red-700 dark:bg-red-800/30 dark:text-red-300"
            )}>
              {passed ? <Award className="mr-2 h-5 w-5" /> : <AlertTriangleIcon className="mr-2 h-5 w-5" />}
              Status: {passed ? "Passed" : "Failed"}
              {passingScore !== null && <span className="text-sm font-normal ml-1">(Passing score: {passingScore}%)</span>}
            </div>
          )}
        </div>
      </div>


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
