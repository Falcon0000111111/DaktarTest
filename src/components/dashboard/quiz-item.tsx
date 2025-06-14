
"use client";

import type { Quiz, StoredQuizData } from "@/types/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, RefreshCcw, FileText, CheckCircle2, XCircle, Hourglass } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
// import { generateQuizFromPdfAction } from "@/lib/actions/quiz.actions"; // For retry, if implemented

interface QuizItemProps {
  quiz: Quiz;
  onSelect: () => void;
  isSelected: boolean;
}

export function QuizItem({ quiz, onSelect, isSelected }: QuizItemProps) {
  const [isRetrying, setIsRetrying] = useState(false); // If retry functionality is added
  const { toast } = useToast();
  const router = useRouter();

  const handleRetry = async () => {
    // This is a simplified retry. In a real app, you'd need the original PDF data URI.
    toast({
      title: "Retry Not Implemented",
      description: "Retrying failed quiz generation requires re-uploading the PDF or a more complex setup to store PDF data for retries.",
      variant: "destructive",
    });
    // Example of how it *might* work if PDF data was available:
    // setIsRetrying(true);
    // try {
    //   // You would need to fetch or have access to the original pdfDataUri here
    //   const placeholderPdfDataUri = "data:application/pdf;base64,Cg=="; 
    //   await generateQuizFromPdfAction({
    //     workspaceId: quiz.workspace_id,
    //     pdfName: quiz.pdf_name || "Retry Quiz",
    //     pdfDataUri: placeholderPdfDataUri, 
    //     numberOfQuestions: quiz.num_questions,
    //     existingQuizIdToUpdate: quiz.id, 
    //   });
    //   toast({ title: "Retrying Quiz Generation", description: "Quiz generation has been re-initiated." });
    //   router.refresh(); // Or use the onDialogClose with refresh passed to parent
    // } catch (error) {
    //   toast({ title: "Retry Failed", description: (error as Error).message, variant: "destructive" });
    // } finally {
    //   setIsRetrying(false);
    // }
  };

  const getStatusBadge = () => {
    switch (quiz.status) {
      case "completed":
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white text-xs"><CheckCircle2 className="mr-1 h-3 w-3"/>Completed</Badge>;
      case "processing":
        return <Badge variant="secondary" className="animate-pulse text-xs"><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Processing</Badge>;
      case "pending":
        return <Badge variant="outline" className="text-xs"><Hourglass className="mr-1 h-3 w-3" />Pending</Badge>;
      case "failed":
        return <Badge variant="destructive" className="text-xs"><XCircle className="mr-1 h-3 w-3" /> Failed</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{quiz.status}</Badge>;
    }
  };

  return (
    <Button
      variant="ghost"
      onClick={onSelect}
      className={cn(
        "w-full h-auto justify-start p-3 rounded-md transition-all text-left",
        isSelected ? "bg-primary/10 border-primary/50 border" : "hover:bg-muted/50",
        "focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0"
      )}
      aria-pressed={isSelected}
    >
      <FileText className="mr-3 h-5 w-5 flex-shrink-0 text-primary/80" />
      <div className="flex-1 overflow-hidden">
        <h3 className="font-medium text-sm truncate" title={quiz.pdf_name || "Untitled Quiz"}>
          {quiz.pdf_name || "Untitled Quiz"}
        </h3>
        <p className="text-xs text-muted-foreground truncate">
          {quiz.num_questions} questions &bull; {formatDistanceToNow(new Date(quiz.created_at), { addSuffix: true })}
        </p>
        {quiz.status === "failed" && quiz.error_message && (
           <p className="text-xs text-destructive mt-0.5 truncate" title={quiz.error_message}>Error: {quiz.error_message}</p>
        )}
      </div>
      <div className="ml-2 flex-shrink-0">
        {getStatusBadge()}
      </div>
      {/* {quiz.status === "failed" && (
        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleRetry(); }} disabled={isRetrying} className="ml-2">
          {isRetrying ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCcw className="mr-1 h-3 w-3" />}
          Retry
        </Button>
      )} */}
    </Button>
  );
}
