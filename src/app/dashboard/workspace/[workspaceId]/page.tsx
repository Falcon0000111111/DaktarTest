
"use client";

import { createClient } from "@/lib/supabase/client";
import { getWorkspaceById } from "@/lib/actions/workspace.actions";
import { getQuizzesForWorkspace } from "@/lib/actions/quiz.actions";
import type { Quiz, Workspace, GeneratedQuizQuestion, StoredQuizData, UserAnswers } from "@/types/supabase";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, FileText, ListChecks, PlusSquare, Loader2, ChevronsLeftRight, Info } from "lucide-react";
import { QuizList } from "@/components/dashboard/quiz-list";
import { UploadQuizDialog } from "@/components/dashboard/upload-quiz-dialog";
import { QuizTakerForm } from "@/components/dashboard/quiz-taker-form";
import { QuizResultsDisplay } from "@/components/dashboard/quiz-results-display";
import { ScrollArea } from "@/components/ui/scroll-area";


export default function WorkspacePage({ params }: { params: { workspaceId: string } }) {
  const supabase = createClient();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null); // Consider using Supabase User type

  const [selectedQuizForDisplay, setSelectedQuizForDisplay] = useState<Quiz | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [quizAttemptAnswers, setQuizAttemptAnswers] = useState<UserAnswers | null>(null);
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);


  useEffect(() => {
    const fetchData = async () => {
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

        const ws = await getWorkspaceById(params.workspaceId);
        if (!ws) {
          setError("Workspace not found or access denied.");
          setWorkspace(null);
        } else {
          setWorkspace(ws);
          const fetchedQuizzes = await getQuizzesForWorkspace(params.workspaceId);
          setQuizzes(fetchedQuizzes);
        }
      } catch (e) {
        setError((e as Error).message);
        console.error("Error fetching workspace data:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [params.workspaceId, supabase]);

  const handleQuizSelect = (quizId: string) => {
    const quiz = quizzes.find(q => q.id === quizId);
    if (quiz && quiz.status === 'completed' && quiz.generated_quiz_data) {
      setSelectedQuizForDisplay(quiz);
      setShowQuizResults(false); // Reset results view
      setQuizAttemptAnswers(null); // Reset previous attempt
    } else if (quiz) {
      setSelectedQuizForDisplay(quiz); // Show it even if not completable, e.g. processing/failed
      setShowQuizResults(false);
      setQuizAttemptAnswers(null);
    }
  };

  const handleQuizSubmit = async (answers: UserAnswers) => {
    setIsSubmittingQuiz(true);
    // In a real app, you might want to save the attempt to the backend
    // For now, we'll just process it client-side for display
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    setQuizAttemptAnswers(answers);
    setShowQuizResults(true);
    setIsSubmittingQuiz(false);
  };

  const handleUploadDialogClose = (refresh?: boolean) => {
    setShowUploadDialog(false);
    if (refresh) {
      // Re-fetch quizzes
      const fetchQuizzes = async () => {
        try {
          const fetchedQuizzes = await getQuizzesForWorkspace(params.workspaceId);
          setQuizzes(fetchedQuizzes);
        } catch (e) {
          console.error("Error refetching quizzes:", e);
          // Optionally set an error state for quiz list
        }
      };
      fetchQuizzes();
    }
  }
  
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading workspace...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 animate-fade-in">
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
     // This case should ideally be covered by the error state, but as a fallback
    return (
      <div className="text-center py-10">
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
    <div className="flex h-[calc(100vh-var(--header-height,4rem))]"> {/* Adjust header height if necessary */}
      {/* Collapsible Left Sidebar for Quizzes */}
      <div className={cn(
        "transition-all duration-300 ease-in-out bg-card border-r",
        isSidebarOpen ? "w-80 p-4" : "w-12 p-2 pt-4 items-center justify-center"
      )}>
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mb-4 hidden md:flex">
            <ChevronsLeftRight className={cn("h-5 w-5", !isSidebarOpen && "rotate-180")} />
        </Button>
         <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mb-4 md:hidden absolute top-20 left-2 z-50 bg-card">
            <ChevronsLeftRight className={cn("h-5 w-5", !isSidebarOpen && "rotate-180")} />
        </Button>


        {isSidebarOpen && (
          <>
            <div className="mb-2">
                <Link href="/dashboard" className="text-sm text-primary hover:underline">
                    &larr; All Workspaces
                </Link>
            </div>
            <h1 className="text-2xl font-bold font-headline tracking-tight mb-1 truncate" title={workspace.name}>
                {workspace.name}
            </h1>
            <p className="text-sm text-muted-foreground mb-4">Manage your quizzes and knowledge.</p>
            
            <Separator className="my-4" />

            <div>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold font-headline flex items-center">
                  <ListChecks className="mr-2 h-5 w-5 text-primary" />
                  Knowledge Base
                </h2>
                <UploadQuizDialog
                  workspaceId={workspace.id}
                  onOpenChange={setShowUploadDialog}
                  open={showUploadDialog}
                  onDialogClose={handleUploadDialogClose}
                >
                  <Button variant="outline" size="sm">
                    <PlusSquare className="mr-2 h-4 w-4" /> Add
                  </Button>
                </UploadQuizDialog>
              </div>
              <ScrollArea className="h-[calc(100vh-var(--header-height,4rem)-220px)]"> {/* Adjust height as needed */}
                <QuizList
                    initialQuizzes={quizzes}
                    workspaceId={workspace.id}
                    onQuizSelect={handleQuizSelect}
                    selectedQuizId={selectedQuizForDisplay?.id}
                />
              </ScrollArea>
            </div>
          </>
        )}
         {!isSidebarOpen && quizzes.length > 0 && (
           <div className="mt-10 space-y-2">
            {quizzes.slice(0,5).map(q => (
              <Button key={q.id} variant="ghost" size="icon" title={q.pdf_name || "Quiz"} onClick={() => handleQuizSelect(q.id)}
                className={cn(selectedQuizForDisplay?.id === q.id && "bg-primary/20")}>
                <FileText className="h-5 w-5" />
              </Button>
            ))}
           </div>
         )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto bg-background">
        {!selectedQuizForDisplay && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Info className="h-16 w-16 text-primary mb-6" data-ai-hint="information lightbulb" />
            <h2 className="text-2xl font-bold font-headline">Welcome to {workspace.name}</h2>
            <p className="text-muted-foreground max-w-md">
              Select a quiz from the "Knowledge Base" on the left to start,
              or click "+ Add" to upload a PDF and generate a new quiz.
            </p>
          </div>
        )}

        {selectedQuizForDisplay && (
          <div className="animate-fade-in">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-2xl flex items-center">
                  <FileText className="mr-3 h-7 w-7 text-primary" />
                  {selectedQuizForDisplay.pdf_name || "Untitled Quiz"}
                </CardTitle>
                <CardDescription>
                  {selectedQuizForDisplay.num_questions} questions &bull; Status: {selectedQuizForDisplay.status}
                  {selectedQuizForDisplay.status === 'failed' && selectedQuizForDisplay.error_message && (
                    <span className="text-destructive ml-2">Error: {selectedQuizForDisplay.error_message}</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                     {/* TODO: Add a retry button here if desired, linking to generateQuizFromPdfAction with existingQuizIdToUpdate */}
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
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
