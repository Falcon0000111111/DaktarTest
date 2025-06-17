
"use client";

import type { Quiz } from "@/types/supabase";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, FileText, CheckCircle2, XCircle, Hourglass, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";

interface QuizItemProps {
  quiz: Quiz;
  onSelect: () => void;
  isSelected: boolean;
}

export function QuizItem({ quiz, onSelect, isSelected }: QuizItemProps) {

  const getStatusBadge = () => {
    const baseBadgeClass = "text-xs px-1.5 py-0.5 rounded-sm"; 
    const iconClass = "mr-1 h-3 w-3";

    switch (quiz.status) {
      case "completed":
        return <Badge variant={isSelected ? "default" : "secondary"} className={cn(baseBadgeClass, "bg-green-100 text-green-700 dark:bg-green-800/30 dark:text-green-300 border border-green-300 dark:border-green-700", isSelected && "bg-primary/10 text-primary border-primary/30")}><CheckCircle2 className={iconClass}/>Completed</Badge>;
      case "processing":
        return <Badge variant="secondary" className={cn(baseBadgeClass, "animate-pulse border")}><Loader2 className={cn(iconClass, "animate-spin")} /> Processing</Badge>;
      case "pending":
        return <Badge variant="outline" className={cn(baseBadgeClass, "border")}><Hourglass className={iconClass} />Pending</Badge>;
      case "failed":
        return <Badge variant="destructive" className={cn(baseBadgeClass, "bg-red-100 text-red-700 dark:bg-red-800/30 dark:text-red-300 border border-red-300 dark:border-red-700")}><XCircle className={iconClass} /> Failed</Badge>;
      default:
        return <Badge variant="outline" className={cn(baseBadgeClass, "border")}>{quiz.status}</Badge>;
    }
  };

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full h-auto flex items-center justify-between p-2 rounded-md transition-all text-left focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
        isSelected ? "bg-primary/10 dark:bg-primary/20" : "hover:bg-muted/50 dark:hover:bg-muted/20",
        !isSelected && "text-foreground"
      )}
      aria-pressed={isSelected}
    >
      <div className="flex items-center space-x-2 overflow-hidden">
        <FileText className={cn("h-4 w-4 flex-shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
        <div className="flex-1 overflow-hidden">
          <h3 className={cn("font-medium text-xs truncate", isSelected ? "text-primary" : "text-foreground")} title={quiz.pdf_name || "Untitled Quiz"}>
            {quiz.pdf_name || "Untitled Quiz"}
          </h3>
          <p className={cn("text-[0.7rem]", isSelected ? "text-primary/80" : "text-muted-foreground")}>
            {quiz.num_questions} questions &bull; {formatDistanceToNow(new Date(quiz.created_at), { addSuffix: true })}
          </p>
          {quiz.status === "failed" && quiz.error_message && (
             <p className="text-[0.7rem] text-red-500/90 dark:text-red-400/80 mt-0.5 truncate" title={quiz.error_message}>Error: {quiz.error_message}</p>
          )}
        </div>
      </div>
      <div className="ml-2 flex-shrink-0 self-start mt-0.5 flex flex-col items-end space-y-1">
        {getStatusBadge()}
        {isSelected && <ChevronRight className="h-4 w-4 text-primary" />}
      </div>
    </button>
  );
}

