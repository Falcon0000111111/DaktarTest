
"use client";

import type { Quiz, GeneratedQuizQuestion, UserAnswers } from "@/types/supabase";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Send } from "lucide-react";

interface QuizTakerFormProps {
  quiz: Quiz;
  quizData: GeneratedQuizQuestion[];
  onSubmit: (answers: UserAnswers) => void;
  isSubmitting: boolean;
  answers: UserAnswers;
  onAnswerChange: (answers: UserAnswers) => void;
}

export function QuizTakerForm({ quiz, quizData, onSubmit, isSubmitting, answers, onAnswerChange }: QuizTakerFormProps) {
  const handleOptionChange = (questionIndex: number, optionValue: string) => {
    onAnswerChange({
      ...answers,
      [questionIndex]: optionValue,
    });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(answers);
  };

  if (!quizData || quizData.length === 0) {
    return <p className="text-muted-foreground">No questions available for this quiz.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {quizData.map((q, index) => (
        <div key={index} className="p-4 rounded-lg border bg-card shadow-sm">
          <p className="text-lg font-semibold mb-1">Question {index + 1}</p>
          <p className="text-base mb-4">{q.question_text}</p>
          <RadioGroup
            onValueChange={(value) => handleOptionChange(index, value)}
            value={answers[index]}
            className="space-y-2"
          >
            {Object.entries(q.options).map(([key, optionText]) => (
              <div key={key} className="flex items-center space-x-3 p-3 rounded-md hover:bg-muted/50 transition-colors border border-input has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                <RadioGroupItem value={optionText} id={`q${index}-opt${key}`} />
                <Label htmlFor={`q${index}-opt${key}`} className="flex-1 cursor-pointer text-sm font-normal">
                  <span className="font-semibold mr-2">{key}.</span>{optionText}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      ))}
      <div className="mt-8 flex justify-end">
        <Button type="submit" disabled={isSubmitting || Object.keys(answers).length === 0} size="lg">
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          {isSubmitting ? "Submitting..." : "Submit Quiz"}
        </Button>
      </div>
    </form>
  );
}
