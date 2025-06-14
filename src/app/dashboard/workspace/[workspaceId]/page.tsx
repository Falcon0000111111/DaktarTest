
"use client";

import { createClient } from "@/lib/supabase/client";
import { getWorkspaceById } from "@/lib/actions/workspace.actions";
import { getQuizzesForWorkspace } from "@/lib/actions/quiz.actions";
import type { Quiz, Workspace, StoredQuizData, UserAnswers } from "@/types/supabase";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, FileText, PlusSquare, Loader2, ChevronsLeftRight, Info, BookCopy, CheckSquare, RefreshCcw, PlayCircle, ListChecks } from "lucide-react";
import { QuizList } from "@/components/dashboard/quiz-list";
import { SourceFileList } from "@/components/dashboard/source-file-list";
import { UploadQuizDialog } from "@/components/dashboard/upload-quiz-dialog";
import { QuizTakerForm } from "@/components/dashboard/quiz-taker-form";
import { QuizResultsDisplay } from "@/components/dashboard/quiz-results-display";
import { QuestionReviewCard } from "@/components/dashboard/question-review-card";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type ViewMode = "placeholder" | "review" | "take_quiz" | "show_results";

export default function WorkspacePage({ params: paramsProp }: { params: { workspaceId: string } }) {
  const resolvedParams = use(paramsProp as any);
  const { workspaceId } = resolvedParams;

  const supabase = createClient();
  const { toast } = useToast();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [uniquePdfNames, setUniquePdfNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const [selectedQuizForDisplay, setSelectedQuizForDisplay] = useState<Quiz | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [quizAttemptAnswers, setQuizAttemptAnswers] = useState<UserAnswers | null>(null);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("placeholder");

  const [initialNumQuestionsForUpload, setInitialNumQuestionsForUpload] = useState<number | undefined>(undefined);
  const [initialPdfNameForUpload, setInitialPdfNameForUpload] = useState<string | undefined>(undefined);
  const [existingQuizIdToUpdate, setExistingQuizIdToUpdate] = useState<string | undefined>(undefined);

  const [isLatestQuizSelected, setIsLatestQuizSelected] = useState(false);


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

          if (selectedQuizForDisplay && fetchedQuizzes.some(q => q.id === selectedQuizForDisplay.id)) {
            const updatedSelectedQuiz = fetchedQuizzes.find(q => q.id === selectedQuizForDisplay.id);
            if (updatedSelectedQuiz) {
                setSelectedQuizForDisplay(updatedSelectedQuiz);
                 if (updatedSelectedQuiz.status === 'completed' && viewMode !== 'take_quiz' && viewMode !== 'show_results') {
                    setViewMode('review');
                } else if (updatedSelectedQuiz.status === 'processing' || updatedSelectedQuiz.status === 'pending' || updatedSelectedQuiz.status === 'failed') {
                    setViewMode('placeholder');
                }
            } else {
                setSelectedQuizForDisplay(null);
                setViewMode('placeholder');
            }
          } else if (!selectedQuizForDisplay && fetchedQuizzes.length > 0) {
            setViewMode('placeholder'); 
          } else if (!selectedQuizForDisplay) {
            setViewMode('placeholder');
          }
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

  useEffect(() => {
    if (selectedQuizForDisplay && quizzes.length > 0) {
      setIsLatestQuizSelected(selectedQuizForDisplay.id === quizzes[0]?.id);
    } else {
      setIsLatestQuizSelected(false);
    }
  }, [selectedQuizForDisplay, quizzes]);


  const handleQuizSelect = (quizId: string) => {
    const quiz = quizzes.find(q => q.id === quizId);
    if (quiz) {
      setSelectedQuizForDisplay(quiz);
      if (quiz.status === 'completed') {
        setViewMode('review');
      } else if (quiz.status === 'processing' || quiz.status === 'pending' || quiz.status === 'failed') {
        setViewMode('placeholder'); 
      }
      setQuizAttemptAnswers(null); 
    }
  };

  const handleQuizSubmit = async (answers: UserAnswers) => {
    setIsSubmittingQuiz(true);
    await new Promise(resolve => setTimeout(resolve, 500)); 
    setQuizAttemptAnswers(answers);
    setViewMode('show_results');
    setIsSubmittingQuiz(false);
  };

  const handleUploadDialogClose = (refresh?: boolean) => {
    setShowUploadDialog(false);
    setInitialNumQuestionsForUpload(undefined);
    setInitialPdfNameForUpload(undefined);
    setExistingQuizIdToUpdate(undefined);
    if (refresh) {
      const fetchQuizzesAndPdfs = async () => {
        if (!workspaceId) return;
        try {
          setIsLoading(true);
          const fetchedQuizzes = await getQuizzesForWorkspace(workspaceId);
          setQuizzes(fetchedQuizzes);
          const pdfs = new Set(fetchedQuizzes.map(q => q.pdf_name).filter(name => name !== null) as string[]);
          setUniquePdfNames(Array.from(pdfs));
          
          const reGeneratedQuizId = existingQuizIdToUpdate || selectedQuizForDisplay?.id;
          if (reGeneratedQuizId) {
            const reSelectedQuiz = fetchedQuizzes.find(q => q.id === reGeneratedQuizId);
            if (reSelectedQuiz) {
              setSelectedQuizForDisplay(reSelectedQuiz);
              if (reSelectedQuiz.status === 'completed') setViewMode('review');
              else setViewMode('placeholder'); 
            }
          }
          setIsLoading(false);
        } catch (e) {
          console.error("Error refetching quizzes:", e);
          toast({ title: "Error", description: "Failed to refresh quiz list.", variant: "destructive"});
          setIsLoading(false);
        }
      };
      fetchQuizzesAndPdfs();
    }
  }

  const handleRegenerateQuiz = () => {
    if (selectedQuizForDisplay) {
      setInitialPdfNameForUpload(selectedQuizForDisplay.pdf_name || undefined);
      setInitialNumQuestionsForUpload(selectedQuizForDisplay.num_questions);
      setExistingQuizIdToUpdate(selectedQuizForDisplay.id);
      setShowUploadDialog(true);
    } else {
      toast({ title: "Error", description: "No quiz selected to re-generate.", variant: "destructive"});
    }
  };
  
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  if (isLoading && !workspace) { 
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading workspace...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 animate-fade-in h-full flex flex-col justify-center items-center">
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
      <div className="text-center py-10 h-full flex flex-col justify-center items-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold">Workspace Not Found</h2>
        <Button asChild className="mt-4">
            <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const parsedQuizDataForTakingOrReview = selectedQuizForDisplay?.generated_quiz_data
    ? (selectedQuizForDisplay.generated_quiz_data as StoredQuizData).quiz
    : [];

  return (
    <div className="flex h-full"> 
      {/* Left Navigation Pane */}
      <div className={cn(
        "transition-all duration-300 ease-in-out border-r border-border flex flex-col h-full overflow-y-auto bg-transparent", 
        isSidebarOpen ? "w-80 p-4" : "w-12 p-2 pt-4 items-center"
      )}>
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mb-1 hidden md:flex self-start sticky top-0 bg-background z-10"> 
            <ChevronsLeftRight className={cn("h-5 w-5", !isSidebarOpen && "rotate-180")} />
        </Button>
         <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mb-1 md:hidden absolute top-4 left-2 z-50 bg-background"> 
            <ChevronsLeftRight className={cn("h-5 w-5", !isSidebarOpen && "rotate-180")} />
        </Button>

        {isSidebarOpen && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4"> 
            <div className="mb-2"> 
                <Link href="/dashboard" className="text-sm text-primary hover:underline">
                    &larr; All Workspaces
                </Link>
                <h1 className="text-2xl font-bold font-headline tracking-tight mt-1 mb-1 truncate" title={workspace.name}>
                    {workspace.name}
                </h1>
            </div>
            
            <div className="space-y-1"> 
              <div className="flex justify-between items-center mb-1"> 
                <h2 className="text-lg font-semibold font-headline flex items-center">
                  <BookCopy className="mr-2 h-5 w-5 text-primary" />
                  Knowledge Base
                </h2>
                <UploadQuizDialog
                  workspaceId={workspace.id}
                  open={showUploadDialog}
                  onOpenChange={setShowUploadDialog}
                  onDialogClose={handleUploadDialogClose}
                  initialPdfName={initialPdfNameForUpload}
                  initialNumQuestions={initialNumQuestionsForUpload}
                  existingQuizIdToUpdate={existingQuizIdToUpdate}
                >
                  <Button variant="outline" size="sm" className="px-2 py-1 h-auto">
                    <PlusSquare className="mr-1.5 h-4 w-4" /> Add
                  </Button>
                </UploadQuizDialog>
              </div>
              <SourceFileList pdfNames={uniquePdfNames} />
            </div>

            <Separator className="my-2" /> 

            <div className="space-y-1 flex-1 flex flex-col min-h-0"> 
              <h2 className="text-lg font-semibold font-headline flex items-center mb-1"> 
                <CheckSquare className="mr-2 h-5 w-5 text-primary" />
                Generated Quizzes
              </h2>
              <div className="flex-1 overflow-y-auto"> 
                <QuizList
                    initialQuizzes={quizzes}
                    workspaceId={workspace.id}
                    onQuizSelect={handleQuizSelect}
                    selectedQuizId={selectedQuizForDisplay?.id}
                />
              </div>
            </div>
          </div>
        )}
         {!isSidebarOpen && quizzes.length > 0 && (
           <div className="mt-10 space-y-2 flex flex-col items-center overflow-y-auto h-full">
            {quizzes.slice(0,10).map(q => (
              <Button key={q.id} variant="ghost" size="icon" title={q.pdf_name || "Quiz"} onClick={() => handleQuizSelect(q.id)}
                className={cn("w-9 h-9",selectedQuizForDisplay?.id === q.id && "bg-primary/20")}>
                <FileText className="h-5 w-5" />
              </Button>
            ))}
           </div>
         )}
      </div>

      {/* Right Content Pane: Three-Part Structure */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-background"> 
        {/* 1. Header (Static) */}
        {selectedQuizForDisplay && workspace && (
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-semibold font-headline text-foreground">
              {workspace.name} <span className="text-muted-foreground mx-1">&gt;</span> {selectedQuizForDisplay.pdf_name || "Untitled Quiz"}
            </h2>
            {viewMode === 'review' && selectedQuizForDisplay.status === 'completed' && (
              <p className="text-sm text-muted-foreground">
                {selectedQuizForDisplay.num_questions} questions &bull; Review the questions or take the quiz.
              </p>
            )}
             {viewMode === 'take_quiz' && (
                <p className="text-sm text-muted-foreground">
                    Answer the questions below to test your knowledge.
                </p>
            )}
            {viewMode === 'show_results' && (
                <p className="text-sm text-muted-foreground">
                    Here are your results for the quiz.
                </p>
            )}
          </div>
        )}

        {/* 2. Scrolling Content Area */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
            {isLoading && selectedQuizForDisplay && <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}

            {!selectedQuizForDisplay && viewMode === 'placeholder' && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-3xl mx-auto">
                <Info className="h-16 w-16 text-primary mb-6" data-ai-hint="information lightbulb" />
                <h2 className="text-2xl font-bold font-headline">Welcome to {workspace.name}</h2>
                <p className="text-muted-foreground max-w-md">
                Select a quiz from "Generated Quizzes" on the left to start,
                or click "+ Add" in "Knowledge Base" to upload a PDF and generate a new quiz.
                </p>
            </div>
            )}
            
            {selectedQuizForDisplay && selectedQuizForDisplay.status === 'processing' && viewMode === 'placeholder' && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground max-w-3xl mx-auto">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-lg">Quiz <span className="font-medium">{selectedQuizForDisplay.pdf_name}</span> is processing...</p>
                    <p className="text-sm">Please check back shortly. Content will appear once generation is complete.</p>
                </div>
            )}

            {selectedQuizForDisplay && selectedQuizForDisplay.status === 'failed' && viewMode === 'placeholder' && (
                <div className="flex flex-col items-center justify-center h-full text-destructive max-w-3xl mx-auto">
                    <AlertCircle className="h-12 w-12 mb-4" />
                    <p className="text-lg">Quiz generation for <span className="font-medium">{selectedQuizForDisplay.pdf_name}</span> failed.</p>
                    {selectedQuizForDisplay.error_message && <p className="text-sm mt-1">Error: {selectedQuizForDisplay.error_message}</p>}
                    <Button onClick={handleRegenerateQuiz} className="mt-6">
                        <RefreshCcw className="mr-2 h-4 w-4" /> Re-Generate Questions
                    </Button>
                </div>
            )}

            {selectedQuizForDisplay && selectedQuizForDisplay.status === 'completed' && viewMode === 'review' && (
                <div className="space-y-4 max-w-3xl mx-auto">
                    {parsedQuizDataForTakingOrReview.map((question, index) => (
                    <QuestionReviewCard key={index} question={question} questionNumber={index + 1} />
                    ))}
                    {parsedQuizDataForTakingOrReview.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                        <AlertCircle className="h-12 w-12 text-orange-400 mb-4" />
                        <p>This quiz is marked as completed, but no questions were found.</p>
                        <p className="text-sm">It might have been generated incorrectly or the data is missing.</p>
                    </div>
                    )}
                </div>
            )}

            {viewMode === 'take_quiz' && parsedQuizDataForTakingOrReview.length > 0 && (
            <div className="max-w-3xl mx-auto">
                <QuizTakerForm
                    quiz={selectedQuizForDisplay!} 
                    quizData={parsedQuizDataForTakingOrReview}
                    onSubmit={handleQuizSubmit}
                    isSubmitting={isSubmittingQuiz}
                />
            </div>
            )}

            {viewMode === 'show_results' && quizAttemptAnswers && parsedQuizDataForTakingOrReview.length > 0 && (
            <div className="max-w-3xl mx-auto">
                <QuizResultsDisplay
                    quiz={selectedQuizForDisplay!}
                    quizData={parsedQuizDataForTakingOrReview}
                    userAnswers={quizAttemptAnswers}
                    onRetake={() => {
                    setViewMode('take_quiz');
                    setQuizAttemptAnswers(null);
                    }}
                    onReviewAll={() => setViewMode('review')}
                />
            </div>
            )}
        </div>

        {/* 3. Fixed Action Bar (Footer) */}
        {selectedQuizForDisplay && selectedQuizForDisplay.status !== 'processing' && viewMode !== 'placeholder' && viewMode !== 'take_quiz' && (
          <div className="p-4 border-t border-border bg-background flex justify-end space-x-3">
            {viewMode === 'review' && selectedQuizForDisplay.status === 'completed' && (
              isLatestQuizSelected ? (
                <>
                  <Button variant="outline" onClick={handleRegenerateQuiz}>
                    <RefreshCcw className="mr-2 h-4 w-4" /> Re-Generate Questions
                  </Button>
                  <Button onClick={() => setViewMode('take_quiz')} size="lg">
                    <PlayCircle className="mr-2 h-5 w-5" /> Take Quiz
                  </Button>
                </>
              ) : (
                <Button onClick={() => {
                  setViewMode('take_quiz');
                  setQuizAttemptAnswers(null);
                }} size="lg">
                  <RefreshCcw className="mr-2 h-4 w-4" /> Retake Quiz
                </Button>
              )
            )}
            {viewMode === 'review' && selectedQuizForDisplay.status === 'failed' && (
                <Button onClick={handleRegenerateQuiz}>
                    <RefreshCcw className="mr-2 h-4 w-4" /> Re-Generate Questions
                </Button>
            )}
             {viewMode === 'show_results' && (
                <>
                    <Button variant="outline" onClick={() => setViewMode('review')}>
                        <ListChecks className="mr-2 h-4 w-4" /> Review All Questions
                    </Button>
                    <Button onClick={() => {
                        setViewMode('take_quiz');
                        setQuizAttemptAnswers(null);
                    }} size="lg">
                        <RefreshCcw className="mr-2 h-5 w-5" /> Retake Quiz
                    </Button>
                </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

