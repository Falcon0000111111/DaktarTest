
"use client";

import type { GeneratedQuizQuestion } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Edit, Trash2, CheckCircle, InfoIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface QuestionReviewCardProps {
  question: GeneratedQuizQuestion;
  questionNumber: number;
}

export function QuestionReviewCard({ question, questionNumber }: QuestionReviewCardProps) {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="bg-[#2B2B2B] dark:bg-neutral-800 p-5 rounded-lg shadow-md text-foreground"> {/* Using bg-neutral-800 for dark theme from Tailwind, or bg-[#2B2B2B] for specific color */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-primary">
          Question {questionNumber}
        </h3>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" onClick={() => setShowAnswer(!showAnswer)} title={showAnswer ? "Hide Answer" : "Show Answer"}>
            {showAnswer ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" title="Edit Question (coming soon)" disabled>
            <Edit className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" title="Delete Question (coming soon)" disabled className="text-destructive hover:text-destructive">
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <p className="mb-4 text-base leading-relaxed">{question.question}</p>

      <ul className="space-y-2 mb-4">
        {question.options.map((option, index) => (
          <li
            key={index}
            className={cn(
              "p-3 rounded-md border text-sm transition-colors",
              showAnswer && option === question.answer 
                ? "bg-green-500/20 border-green-500 text-green-300 font-medium" 
                : "border-border hover:bg-muted/10",
              showAnswer && option !== question.answer && "opacity-70" // Dim incorrect options when answer is shown
            )}
          >
            {option}
            {showAnswer && option === question.answer && <CheckCircle className="inline-block ml-2 h-4 w-4 text-green-400" />}
          </li>
        ))}
      </ul>

      {showAnswer && (
        <div className="mt-4 p-3 bg-muted/10 rounded-md border border-border">
          <p className="text-sm font-semibold mb-1 flex items-center text-primary">
            <InfoIcon className="h-4 w-4 mr-2"/>
            Explanation:
          </p>
          <p className="text-sm text-muted-foreground">{question.explanation || "No explanation provided."}</p>
        </div>
      )}
    </div>
  );
}
