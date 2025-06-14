
"use client";

import type { Quiz } from "@/types/supabase";
import { QuizItem } from "./quiz-item";
import { FileQuestion, Inbox } from "lucide-react";

interface QuizListProps {
  initialQuizzes: Quiz[];
  workspaceId: string;
  onQuizSelect: (quizId: string) => void;
  selectedQuizId?: string | null;
}

export function QuizList({ initialQuizzes, onQuizSelect, selectedQuizId }: QuizListProps) {
  if (initialQuizzes.length === 0) {
    return (
      <div className="text-center py-6 border-2 border-dashed rounded-lg mt-4">
        <Inbox className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-md font-semibold">No Quizzes Yet</h3>
        <p className="text-sm text-muted-foreground px-2">
          Click "+ Add" to generate your first quiz for this workspace.
        </p>
      </div>
    );
  }

  const sortedQuizzes = [...initialQuizzes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-2 mt-2">
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
