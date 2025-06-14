
"use client";

import { createClient } from "@/lib/supabase/client";
import { getWorkspaceById } from "@/lib/actions/workspace.actions";
import { getQuizzesForWorkspace } from "@/lib/actions/quiz.actions";
import type { Quiz, Workspace, StoredQuizData, UserAnswers } from "@/types/supabase";
import { use, useEffect, useState } from "react"; 
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, FileText, ListChecks, PlusSquare, Loader2, ChevronsLeftRight, Info, FileUp, CheckSquare, BookCopy } from "lucide-react";
import { QuizList } from "@/components/dashboard/quiz-list";
import { SourceFileList } from "@/components/dashboard/source-file-list";
import { UploadQuizDialog } from "@/components/dashboard/upload-quiz-dialog";
import { QuizTakerForm } from "@/components/dashboard/quiz-taker-form";
import { QuizResultsDisplay } from "@/components/dashboard/quiz-results-display";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";


export default function WorkspacePage({ params: paramsProp }: { params: { workspaceId: string } }) {
  const params = use(paramsProp as any); 
  const { workspaceId } = params; 

  const supabase = createClient();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [uniquePdfNames, setUniquePdfNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const [selectedQuizForDisplay, setSelectedQuizForDisplay] = useState<Quiz | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [quizAttemptAnswers, setQuizAttemptAnswers] = useState<UserAnswers | null>(null);
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);


  useEffect(() => {
    const fetchData = async () => {
      if (!workspaceId) {
        setError("Workspace ID is not available.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          setError("User not authenticated.");
          setIsLoading(false);
          return;
        }
        setUser(authUser);

        const ws = await getWorkspaceById(workspaceId); 
        if (!ws) {
          setError("Workspace not found or access denied.");
          setWorkspace(null);
        } else {
          setWorkspace(ws);
          const fetchedQuizzes = await getQuizzesForWorkspace(workspaceId); 
          setQuizzes(fetchedQuizzes);
          const pdfs = new Set(fetchedQuizzes.map(q => q.pdf_name).filter(name => name !== null) as string[]);
          setUniquePdfNames(Array.from(pdfs));
        }
      } catch (e) {
        setError((e as Error).message);
        console.error("Error fetching workspace data:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [workspaceId, supabase]); 

  const handleQuizSelect = (quizId: string) => {
    const quiz = quizzes.find(q => q.id === quizId);
    if (quiz) {
      setSelectedQuizForDisplay(quiz);
      setShowQuizResults(false); 
      setQuizAttemptAnswers(null); 
    }
  };

  const handleQuizSubmit = async (answers: UserAnswers) => {
    setIsSubmittingQuiz(true);
    await new Promise(resolve => setTimeout(resolve, 500)); 
    setQuizAttemptAnswers(answers);
    setShowQuizResults(true);
    setIsSubmittingQuiz(false);
  };

  const handleUploadDialogClose = (refresh?: boolean) => {
    setShowUploadDialog(false);
    if (refresh) {
      const fetchQuizzesAndPdfs = async () => {
        if (!workspaceId) return;
        try {
          const fetchedQuizzes = await getQuizzesForWorkspace(workspaceId); 
          setQuizzes(fetchedQuizzes);
          const pdfs = new Set(fetchedQuizzes.map(q => q.pdf_name).filter(name => name !== null) as string[]);
          setUniquePdfNames(Array.from(pdfs));
        } catch (e) {
          console.error("Error refetching quizzes:", e);
        }
      };
      fetchQuizzesAndPdfs();
    }
  }
  
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]"> {/* Adjusted header height */}
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading workspace...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 animate-fade-in h-[calc(100vh-4rem)] flex flex-col justify-center items-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold font-headline">Error Loading Workspace</h2>
        <p className="text-muted-foreground max-w-md mx-auto">{error}</p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="text-center py-10 h-[calc(100vh-4rem)] flex flex-col justify-center items-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold">Workspace Not Found</h2>
        <Button asChild className="mt-4">
            <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const parsedQuizDataForTaking = selectedQuizForDisplay?.generated_quiz_data 
    ? (selectedQuizForDisplay.generated_quiz_data as StoredQuizData).quiz 
    : [];

  return (
    <div className="flex h-[calc(100vh-4rem)]"> {/* Main container with fixed height */}
      {/* Left Navigation Pane */}
      <div className={cn(
        "transition-all duration-300 ease-in-out bg-card border-r flex flex-col h-full", // Ensure h-full for independent scroll
        isSidebarOpen ? "w-80 p-4" : "w-12 p-2 pt-4 items-center" 
      )}>
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mb-1 hidden md:flex self-start">
            <ChevronsLeftRight className={cn("h-5 w-5", !isSidebarOpen && "rotate-180")} />
        </Button>
         <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mb-1 md:hidden absolute top-20 left-2 z-50 bg-card">
            <ChevronsLeftRight className={cn("h-5 w-5", !isSidebarOpen && "rotate-180")} />
        </Button>

        {isSidebarOpen && (
          <div className="flex flex-col flex-1 min-h-0 h-full overflow-y-auto"> {/* Scrollable content within sidebar */}
            <div className="mb-2">
                <Link href="/dashboard" className="text-sm text-primary hover:underline">
                    &larr; All Workspaces
                </Link>
            </div>
            <h1 className="text-2xl font-bold font-headline tracking-tight mb-3 truncate" title={workspace.name}>
                {workspace.name}
            </h1>
            
            {/* Knowledge Base Section */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-lg font-semibold font-headline flex items-center">
                  <BookCopy className="mr-2 h-5 w-5 text-primary" />
                  Knowledge Base
                </h2>
                <UploadQuizDialog
                  workspaceId={workspace.id}
                  onOpenChange={setShowUploadDialog}
                  open={showUploadDialog}
                  onDialogClose={handleUploadDialogClose}
                >
                  <Button variant="outline" size="sm" className="px-2 py-1 h-auto">
                    <PlusSquare className="mr-1.5 h-4 w-4" /> Add
                  </Button>
                </UploadQuizDialog>
              </div>
              <ScrollArea className="max-h-60"> {/* Limit height if needed, or let flex handle it */}
                <SourceFileList pdfNames={uniquePdfNames} />
              </ScrollArea>
            </div>

            <Separator className="my-3" />

            {/* Generated Quizzes Section */}
            <div className="flex flex-col flex-1 min-h-0">
              <h2 className="text-lg font-semibold font-headline flex items-center mb-1">
                <CheckSquare className="mr-2 h-5 w-5 text-primary" />
                Generated Quizzes
              </h2>
              <ScrollArea className="flex-1">
                <QuizList
                    initialQuizzes={quizzes}
                    workspaceId={workspace.id}
                    onQuizSelect={handleQuizSelect}
                    selectedQuizId={selectedQuizForDisplay?.id}
                />
              </ScrollArea>
            </div>
          </div>
        )}
         {!isSidebarOpen && quizzes.length > 0 && ( // Icon-only view (quick access)
           <div className="mt-10 space-y-2 flex flex-col items-center overflow-y-auto h-full">
            {quizzes.slice(0,10).map(q => ( // Show some quizzes
              <Button key={q.id} variant="ghost" size="icon" title={q.pdf_name || "Quiz"} onClick={() => handleQuizSelect(q.id)}
                className={cn("w-9 h-9",selectedQuizForDisplay?.id === q.id && "bg-primary/20")}>
                <FileText className="h-5 w-5" />
              </Button>
            ))}
           </div>
         )}
      </div>

      {/* Right Content Pane */}
      <div className="flex-1 p-6 overflow-y-auto h-full bg-background"> {/* Scrollable content area */}
        {!selectedQuizForDisplay && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Info className="h-16 w-16 text-primary mb-6" data-ai-hint="information lightbulb" />
            <h2 className="text-2xl font-bold font-headline">Welcome to {workspace.name}</h2>
            <p className="text-muted-foreground max-w-md">
              Select a quiz from "Generated Quizzes" on the left to start,
              or click "+ Add" in "Knowledge Base" to upload a PDF and generate a new quiz.
            </p>
          </div>
        )}

        {selectedQuizForDisplay && (
          <div className="animate-fade-in space-y-6 max-w-3xl mx-auto"> {/* Centered content */}
            <div>
                <div className="flex items-center mb-1">
                    <FileText className="mr-3 h-7 w-7 text-primary" />
                    <h2 className="font-headline text-2xl font-bold">
                    {selectedQuizForDisplay.pdf_name || "Untitled Quiz"}
                    </h2>
                </div>
                <p className="text-muted-foreground text-sm ml-10">
                    {selectedQuizForDisplay.num_questions} questions &bull; Status: {selectedQuizForDisplay.status}
                    {selectedQuizForDisplay.status === 'failed' && selectedQuizForDisplay.error_message && (
                        <span className="text-destructive ml-2">Error: {selectedQuizForDisplay.error_message}</span>
                    )}
                </p>
            </div>
            
            <Separator />

            <div>
                {selectedQuizForDisplay.status === 'processing' && (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p>This quiz is currently being processed. Please check back shortly.</p>
                  </div>
                )}
                {selectedQuizForDisplay.status === 'failed' && (
                  <div className="flex flex-col items-center justify-center py-10 text-destructive">
                    <AlertCircle className="h-12 w-12 mb-4" />
                    <p>Quiz generation failed. You may try again or check the error message.</p>
                    {/* Consider adding a retry button here that re-triggers generation */}
                  </div>
                )}
                {selectedQuizForDisplay.status === 'completed' && parsedQuizDataForTaking && parsedQuizDataForTaking.length > 0 && !showQuizResults && (
                  <QuizTakerForm
                    quiz={selectedQuizForDisplay}
                    quizData={parsedQuizDataForTaking}
                    onSubmit={handleQuizSubmit}
                    isSubmitting={isSubmittingQuiz}
                  />
                )}
                {selectedQuizForDisplay.status === 'completed' && showQuizResults && quizAttemptAnswers && parsedQuizDataForTaking.length > 0 && (
                  <QuizResultsDisplay
                    quiz={selectedQuizForDisplay}
                    quizData={parsedQuizDataForTaking}
                    userAnswers={quizAttemptAnswers}
                  />
                )}
                 {selectedQuizForDisplay.status === 'completed' && (!parsedQuizDataForTaking || parsedQuizDataForTaking.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                        <AlertCircle className="h-12 w-12 text-orange-500 mb-4" />
                        <p>This quiz is marked as completed, but no questions were found.</p>
                        <p className="text-sm">It might have been generated incorrectly or the data is missing.</p>
                    </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
