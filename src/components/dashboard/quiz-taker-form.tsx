
"use client";

import type { Quiz, GeneratedQuizQuestion, UserAnswers, StoredQuizData } from "@/types/supabase";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Send } from "lucide-react";

interface QuizTakerFormProps {
  quiz: Quiz;
  quizData: GeneratedQuizQuestion[];
  onSubmit: (answers: UserAnswers) => void;
  isSubmitting: boolean;
}

export function QuizTakerForm({ quiz, quizData, onSubmit, isSubmitting }: QuizTakerFormProps) {
  const [currentAnswers, setCurrentAnswers] = useState<UserAnswers>({});

  const handleOptionChange = (questionIndex: number, optionValue: string) => {
    setCurrentAnswers(prev => ({
      ...prev,
      [questionIndex]: optionValue,
    }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(currentAnswers);
  };

  if (!quizData || quizData.length === 0) {
    return <p className="text-muted-foreground">No questions available for this quiz.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {quizData.map((q, index) => (
        <div key={index} className="p-4 rounded-lg border bg-card shadow-sm">
          <p className="text-lg font-semibold mb-1">Question {index + 1}</p>
          <p className="text-base mb-4">{q.question}</p>
          <RadioGroup
            onValueChange={(value) => handleOptionChange(index, value)}
            value={currentAnswers[index]}
            className="space-y-2"
          >
            {q.options.map((option, optIndex) => (
              <div key={optIndex} className="flex items-center space-x-3 p-3 rounded-md hover:bg-muted/50 transition-colors border border-input has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                <RadioGroupItem value={option} id={`q${index}-opt${optIndex}`} />
                <Label htmlFor={`q${index}-opt${optIndex}`} className="flex-1 cursor-pointer text-sm font-normal">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      ))}
      <div className="mt-8 flex justify-end">
        <Button type="submit" disabled={isSubmitting || Object.keys(currentAnswers).length === 0} size="lg">
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          {isSubmitting ? "Submitting..." : "Submit Quiz"}
        </Button>
      </div>
    </form>
  );
}
