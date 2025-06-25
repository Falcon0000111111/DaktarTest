
"use client";

import type { GeneratedQuizQuestion } from "@/types/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface QuizReviewDisplayProps {
  quizData: GeneratedQuizQuestion[];
  quizName: string;
  showAnswers: boolean; 
}

export function QuizReviewDisplay({ quizData, quizName, showAnswers }: QuizReviewDisplayProps) {
  if (!quizData || quizData.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground text-lg">No questions available for review in this quiz.</p>
        <p className="text-sm text-muted-foreground mt-2">Try generating the quiz again or check the source document.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Heading moved to page.tsx or header */}
      <div className="space-y-6">
        {quizData.map((q, index) => (
          <Card key={index} className="bg-card shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Question {index + 1}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base mb-4 whitespace-pre-wrap">{q.question_text}</p>
              <ul className="space-y-2">
                {Object.entries(q.options).map(([key, optionText]) => (
                  <li
                    key={key}
                    className={cn(
                      "p-3 rounded-md border border-input text-sm bg-background",
                      showAnswers && key === q.correct_answer_key && "border-green-500 bg-green-50 dark:bg-green-900/20"
                    )}
                  >
                    <span className="font-semibold mr-2">{key}.</span>{optionText}
                  </li>
                ))}
              </ul>
              {showAnswers && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-semibold">Correct Answer:</p>
                  <p className="text-sm mb-2 text-green-600 dark:text-green-400">{q.options[q.correct_answer_key]}</p>
                  <p className="text-sm font-semibold">Explanation:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{q.explanation || "No explanation provided."}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
