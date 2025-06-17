
"use client";

import type { GeneratedQuizQuestion } from "@/types/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface QuizReviewDisplayProps {
  quizData: GeneratedQuizQuestion[];
  quizName: string;
}

export function QuizReviewDisplay({ quizData, quizName }: QuizReviewDisplayProps) {
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
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-1">
          Review Quiz: {quizName}
        </h2>
        <p className="text-muted-foreground">
          Here are the questions generated for your quiz. You can proceed to take the quiz or regenerate it.
        </p>
      </div>

      <div className="space-y-6">
        {quizData.map((q, index) => (
          <Card key={index} className="bg-card shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Question {index + 1}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base mb-4 whitespace-pre-wrap">{q.question}</p>
              <ul className="space-y-2">
                {q.options.map((option, optIndex) => (
                  <li
                    key={optIndex}
                    className="p-3 rounded-md border border-input text-sm bg-background"
                  >
                    {option}
                  </li>
                ))}