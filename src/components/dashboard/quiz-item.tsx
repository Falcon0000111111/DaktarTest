
"use client";

import type { Quiz } from "@/types/supabase";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, FileText, CheckCircle2, XCircle, Hourglass, RefreshCcw } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface QuizItemProps {
  quiz: Quiz;
  onSelect: () => void;
  isSelected: boolean;
}

export function QuizItem({ quiz, onSelect, isSelected }: QuizItemProps) {
  const { toast } = useToast();
  // const [isRetrying, setIsRetrying] = useState(false); // Retry handled by re-generate button now

  const getStatusBadge = () => {
    const baseBadgeClass = "text-xs px-1.5 py-0.5"; // Slightly smaller padding
    const iconClass = "mr-1 h-3 w-3";

    switch (quiz.status) {
      case "completed":
        return <Badge variant={isSelected ? "default" : "secondary"} className={cn(baseBadgeClass, "bg-green-600 hover:bg-green-700 text-white", isSelected && "bg-white text-green-700 hover:bg-green-100")}><CheckCircle2 className={iconClass}/>Completed</Badge>;
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

  // Simplified handleRetry - actual regeneration is now initiated from the right pane's "Re-Generate" button
  // const handleRetry = async () => {
  //   toast({
  //     title: "Re-Generate Quiz",
  //     description: "Use the 'Re-Generate Questions' button in the main view after selecting this quiz.",
  //   });
  // };


  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full h-auto justify-start p-2.5 rounded-md transition-all text-left space-x-3 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0",
        isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted/20 dark:hover:bg-muted/10",
        !isSelected && "text-foreground"
      )}
      aria-pressed={isSelected}
    >
      <div className="flex items-center space-x-2">
        <FileText className={cn("h-4 w-4 flex-shrink-0", isSelected ? "text-accent-foreground/80" : "text-primary/80")} />
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
