
"use client";

import type { Quiz, GeneratedQuizQuestion, UserAnswers, StoredQuizData } from "@/types/supabase";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";

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
    // Optionally, validate if all questions are answered
    // For now, we allow partial submission
    onSubmit(currentAnswers);
  };

  if (!quizData || quizData.length === 0) {
    return <p className="text-muted-foreground">No questions available for this quiz.</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <ScrollArea className="h-[calc(100vh-var(--header-height,4rem)-280px)] pr-3"> {/* Adjust height */}
        <div className="space-y-6">
          {quizData.map((q, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="bg-muted/30 p-4">
                <CardTitle className="text-lg font-medium">Question {index + 1}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <p className="text-base font-semibold">{q.question}</p>
                <RadioGroup
                  onValueChange={(value) => handleOptionChange(index, value)}
                  value={currentAnswers[index]}
                  className="space-y-2"
                >
                  {q.options.map((option, optIndex) => (
                    <div key={optIndex} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors border border-transparent has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                      <RadioGroupItem value={option} id={`q${index}-opt${optIndex}`} />
                      <Label htmlFor={`q${index}-opt${optIndex}`} className="flex-1 cursor-pointer text-sm">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
      <div className="mt-6 flex justify-end">
        <Button type="submit" disabled={isSubmitting || Object.keys(currentAnswers).length === 0}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          {isSubmitting ? "Submitting..." : "Submit Quiz"}
        </Button>
      </div>
    </form>
  );
}
