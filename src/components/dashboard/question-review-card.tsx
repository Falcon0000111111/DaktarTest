
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

  // Using a specific dark background for the card and light text for contrast
  // This assumes the overall page theme might be light, but these cards are dark.
  const cardBgClass = "bg-neutral-800"; // A dark gray from Tailwind's palette
  const textColorClass = "text-gray-200"; // Light gray text for readability
  const mutedTextColorClass = "text-gray-400"; // Muted text for explanations

  return (
    <div className={cn(cardBgClass, "p-5 rounded-lg shadow-md")}>
      <div className="flex justify-between items-start mb-3">
        <h3 className={cn("text-lg font-semibold", textColorClass)}> 
          Question {questionNumber}
        </h3>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" onClick={() => setShowAnswer(!showAnswer)} title={showAnswer ? "Hide Answer" : "Show Answer"} className={textColorClass /* Ensure icon buttons are also light */}>
            {showAnswer ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" title="Edit Question (coming soon)" disabled className={cn(textColorClass, "opacity-50")}>
            <Edit className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" title="Delete Question (coming soon)" disabled className={cn("text-red-400 hover:text-red-300", "opacity-50")}>
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <p className={cn("mb-4 text-base leading-relaxed", textColorClass)}>{question.question}</p>

      <ul className="space-y-2 mb-4">
        {question.options.map((option, index) => (
          <li
            key={index}
            className={cn(
              "p-3 rounded-md border text-sm transition-colors",
              // Base option style for dark card
              "border-neutral-700 hover:bg-neutral-700/70", 
              textColorClass,
              showAnswer && option === question.answer 
                ? "bg-green-600/30 border-green-500 text-green-300 font-medium" // Correct answer style
                : "",
              showAnswer && option !== question.answer && "opacity-60" // Dim incorrect options
            )}
          >
            {option}
            {showAnswer && option === question.answer && <CheckCircle className="inline-block ml-2 h-4 w-4 text-green-400" />}
          </li>
        ))}
      </ul>

      {showAnswer && (
        <div className="mt-4 p-3 bg-neutral-700/50 rounded-md border border-neutral-600">
          <p className={cn("text-sm font-semibold mb-1 flex items-center", textColorClass)}>
            <InfoIcon className="h-4 w-4 mr-2 text-blue-400"/>
            Explanation:
          </p>
          <p className={cn("text-sm", mutedTextColorClass)}>{question.explanation || "No explanation provided."}</p>
        </div>
      )}
    </div>
  );
}
