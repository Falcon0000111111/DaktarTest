
"use client";

import { cn } from "@/lib/utils";

interface QuizProgressBarProps {
  totalQuestions: number;
  answeredQuestions: number;
}

export function QuizProgressBar({ totalQuestions, answeredQuestions }: QuizProgressBarProps) {
  return (
    <div className="fixed top-1/2 right-4 md:right-8 transform -translate-y-1/2 z-50 animate-fade-in">
      <div className="flex flex-col items-center gap-2.5 bg-card/60 backdrop-blur-sm p-2 rounded-full border shadow-lg">
        {Array.from({ length: totalQuestions }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-2.5 w-2.5 rounded-full bg-muted/70 transition-all duration-300",
              index < answeredQuestions && "bg-primary scale-125"
            )}
            title={`Question ${index + 1} ${index < answeredQuestions ? '(Answered)' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}
