"use client";

import type { Quiz } from "@/types/supabase";
import { QuizItem } from "./quiz-item";
import { FileQuestion } from "lucide-react";

interface QuizListProps {
  initialQuizzes: Quiz[];
  workspaceId: string; // Used to potentially refresh or filter if needed client-side later
}

export function QuizList({ initialQuizzes }: QuizListProps) {
  if (initialQuizzes.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed rounded-lg">
        <FileQuestion className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold">No Quizzes Generated Yet</h3>
        <p className="text-muted-foreground">
          Upload a PDF and generate your first quiz for this workspace.
        </p>
      </div>
    );
  }

  // Sort quizzes by creation date, newest first
  const sortedQuizzes = [...initialQuizzes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());


  return (
    <div className="space-y-4">
      {sortedQuizzes.map((quiz) => (
        <QuizItem key={quiz.id} quiz={quiz} />
      ))}
    </div>
  );
}
