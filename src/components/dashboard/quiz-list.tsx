
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
  const completedQuizzes = initialQuizzes.filter(q => q.status === 'completed');

  if (completedQuizzes.length === 0) {
    // This component is typically rendered only if initialQuizzes.length > 0 (due to checks in WorkspacePage)
    // So, if completedQuizzes is empty here, it means there are quizzes, but none are 'completed'.
    return (
      <div className="text-center py-6 border-2 border-dashed rounded-lg mt-4">
        <Inbox className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-md font-semibold">No Completed Quizzes</h3>
        <p className="text-sm text-muted-foreground px-2">
          There are no quizzes that have finished generating successfully.
          Quizzes that are still processing or have failed will not appear in this list for review or retake.
        </p>
      </div>
    );
  }

  const sortedCompletedQuizzes = [...completedQuizzes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-2 mt-2">
      {sortedCompletedQuizzes.map((quiz) => (
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
