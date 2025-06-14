
"use client";

import type { Quiz } from "@/types/supabase";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, FileText, CheckCircle2, XCircle, Hourglass } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";

interface QuizItemProps {
  quiz: Quiz;
  onSelect: () => void;
  isSelected: boolean;
}

export function QuizItem({ quiz, onSelect, isSelected }: QuizItemProps) {

  const getStatusBadge = () => {
    const baseBadgeClass = "text-xs px-1.5 py-0.5"; 
    const iconClass = "mr-1 h-3 w-3";

    switch (quiz.status) {
      case "completed":
        return <Badge variant={isSelected ? "default" : "secondary"} className={cn(baseBadgeClass, "bg-green-500 hover:bg-green-600 text-white", isSelected && "bg-white text-green-600 dark:bg-green-300 dark:text-green-900 dark:hover:bg-green-200")}><CheckCircle2 className={iconClass}/>Completed</Badge>;
      case "processing":
        return <Badge variant="secondary" className={cn(baseBadgeClass, "animate-pulse")}><Loader2 className={cn(iconClass, "animate-spin")} /> Processing</Badge>;
      case "pending":
        return <Badge variant="outline" className={baseBadgeClass}><Hourglass className={iconClass} />Pending</Badge>;
      case "failed":
        return <Badge variant="destructive" className={baseBadgeClass}><XCircle className={iconClass} /> Failed</Badge>;
      default:
        return <Badge variant="outline" className={baseBadgeClass}>{quiz.status}</Badge>;
    }
  };

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full h-auto justify-start p-2.5 rounded-md transition-all text-left space-x-3 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0",
        isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted/60", // Use muted for hover
        !isSelected && "text-foreground"
      )}
      aria-pressed={isSelected}
    >
      <div className="flex items-center space-x-2">
        <FileText className={cn("h-4 w-4 flex-shrink-0", isSelected ? "text-accent-foreground/80" : "text-primary")} /> {/* Ensure icon color contrasts with accent */}
        <div className="flex-1 overflow-hidden">
          <h3 className={cn("font-medium text-sm truncate", isSelected ? "text-accent-foreground" : "text-foreground")} title={quiz.pdf_name || "Untitled Quiz"}>
            {quiz.pdf_name || "Untitled Quiz"}
          </h3>
          <p className={cn("text-xs", isSelected ? "text-accent-foreground/70" : "text-muted-foreground")}>
            {quiz.num_questions} questions &bull; {formatDistanceToNow(new Date(quiz.created_at), { addSuffix: true })}
          </p>
          {quiz.status === "failed" && quiz.error_message && (
             <p className="text-xs text-red-500/80 dark:text-red-400/80 mt-0.5 truncate" title={quiz.error_message}>Error: {quiz.error_message}</p>
          )}
        </div>
      </div>
      <div className="ml-auto flex-shrink-0 self-start mt-0.5">
        {getStatusBadge()}
      </div>
    </button>
  );
}
