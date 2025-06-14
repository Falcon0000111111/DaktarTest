
"use client";

import type { Quiz, StoredQuizData } from "@/types/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, RefreshCcw, FileText, CheckCircle2, XCircle, Hourglass } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState } from "react"; 

interface QuizItemProps {
  quiz: Quiz;
  onSelect: () => void;
  isSelected: boolean;
}

export function QuizItem({ quiz, onSelect, isSelected }: QuizItemProps) {
  const [isRetrying, setIsRetrying] = useState(false); 
  const { toast } = useToast();
  const router = useRouter();

  const handleRetry = async () => {
    toast({
      title: "Retry Not Implemented",
      description: "Retrying failed quiz generation requires re-uploading the PDF or a more complex setup to store PDF data for retries.",
      variant: "destructive",
    });
  };

  const getStatusBadge = () => {
    const baseBadgeClass = "text-xs px-2 py-0.5";
    const iconClass = "mr-1 h-3 w-3";

    switch (quiz.status) {
      case "completed":
        return <Badge variant={isSelected ? "secondary" : "default"} className={cn(baseBadgeClass, "bg-green-500 hover:bg-green-600 text-white", isSelected && "bg-white text-green-700 hover:bg-green-100")}><CheckCircle2 className={iconClass}/>Completed</Badge>;
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
    <Button
      variant="ghost"
      onClick={onSelect}
      className={cn(
        "w-full h-auto justify-start p-3 rounded-md transition-all text-left space-x-3",
        isSelected ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-muted/50",
        "focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0"
      )}
      aria-pressed={isSelected}
    >
      <FileText className={cn("h-5 w-5 flex-shrink-0", isSelected ? "text-primary-foreground/80" : "text-primary/80")} />
      <div className="flex-1 overflow-hidden">
        <h3 className={cn("font-medium text-sm truncate", isSelected ? "text-primary-foreground" : "text-card-foreground")} title={quiz.pdf_name || "Untitled Quiz"}>
          {quiz.pdf_name || "Untitled Quiz"}
        </h3>
        <p className={cn("text-xs", isSelected ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {quiz.num_questions} questions &bull; {formatDistanceToNow(new Date(quiz.created_at), { addSuffix: true })}
        </p>
        {quiz.status === "failed" && quiz.error_message && (
           <p className="text-xs text-destructive mt-0.5 truncate" title={quiz.error_message}>Error: {quiz.error_message}</p>
        )}
      </div>
      <div className="ml-auto flex-shrink-0">
        {getStatusBadge()}
      </div>
    </Button>
  );
}
