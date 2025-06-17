
"use client";

import type { Quiz } from "@/types/supabase";
import { QuizItem } from "./quiz-item";
import { FileQuestion, Inbox } from "lucide-react";

interface QuizListProps {
  initialQuizzes: Quiz[];
  workspaceId: string; // Keep for potential future use, though not directly used in QuizItem selection logic now
  onQuizSelect: (quizId: string) => void;
  selectedQuizId?: string | null;
}

export function QuizList({ initialQuizzes, onQuizSelect, selectedQuizId }: QuizListProps) {

  if (initialQuizzes.length === 0) {
    return (
      <div className="text-center py-3 px-1">
        <Inbox className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <h3 className="text-sm font-medium">No Quizzes Yet</h3>
        <p className="text-xs text-muted-foreground">
          Generate quizzes using the '+' in Knowledge.
        </p>
      </div>
    );
  }

  // Sort by creation date, newest first
  const sortedQuizzes = [...initialQuizzes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-1.5 py-1">
      {sortedQuizzes.map((quiz) => (
        <QuizItem 
          key={quiz.id} 
          quiz={quiz} 
          onSelect={() => onQuizSelect(quiz.id)}
          isSelected={quiz.id === selectedQuizId}
        />
      ))}
    </div>
  );
}

