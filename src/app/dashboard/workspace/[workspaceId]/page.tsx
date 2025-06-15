
"use client";

import { createClient } from "@/lib/supabase/client";
import { getWorkspaceById } from "@/lib/actions/workspace.actions";
import type { Workspace, Quiz, StoredQuizData, UserAnswers } from "@/types/supabase";
import { useEffect, useState, type ReactNode, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, FileText, Wand2, ListChecks, Settings, BookOpen, RefreshCw, Send, Newspaper, ChevronLeft, PackageSearch, Inbox } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UploadQuizDialog } from "@/components/dashboard/upload-quiz-dialog";
import { QuizReviewDisplay } from "@/components/dashboard/quiz-review-display";
import { QuizTakerForm } from "@/components/dashboard/quiz-taker-form";
import { QuizResultsDisplay } from "@/components/dashboard/quiz-results-display";
import { getQuizzesForWorkspace } from "@/lib/actions/quiz.actions";
import { QuizList } from "@/components/dashboard/quiz-list";
import { useParams } from "next/navigation"; // Import useParams

interface DashboardActionCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

const DashboardActionCard = ({ title, description, icon, onClick, disabled }: DashboardActionCardProps) => (
  <Card className="hover:shadow-lg transition-shadow duration-200 flex flex-col">
    <CardHeader className="items-center text-center">
      {icon}
      <CardTitle className="font-headline text-xl mt-2">{title}</CardTitle>
    </CardHeader>
    <CardContent className="text-center flex-grow">
      <p className="text-sm text-muted-foreground">{description}</p>
    </CardContent>
    <CardFooter className="justify-center pt-4">
      <Button variant="outline" onClick={onClick} className="w-full sm:w-auto" disabled={disabled}>
        Go
      </Button>
    </CardFooter>
  </Card>
);

type ViewMode = "dashboard_cards" | "quiz_review" | "quiz_taking" | "quiz_results" | "loading_quiz" | "quiz_list_selection";

export default function WorkspacePage() {
  const routeParams = useParams(); // Use the hook
  const workspaceId = routeParams.workspaceId as string; // Get workspaceId from hook

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [errorPage, setErrorPage] = useState<string | null>(null);
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>("dashboard_cards");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [quizForDisplay, setQuizForDisplay] = useState<StoredQuizData | null>(null);
  const [activeQuizDBEntry, setActiveQuizDBEntry] = useState<Quiz | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswers | null>(null);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  
  const [allQuizzes, setAllQuizzes] = useState<Quiz[]>([]);
  const [isLoadingQuizzesList, setIsLoadingQuizzesList] = useState(false);
  
  const contentAreaRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const fetchWorkspaceData = async () => {
      if (!workspaceId) {
        setErrorPage("Workspace ID is not available.");
        setIsLoadingPage(false);
        return;
      }
      setIsLoadingPage(true);
      setErrorPage(null);
      try {
        const ws = await getWorkspaceById(workspaceId);
        if (!ws) {
          setErrorPage("Workspace not found or access denied.");
          setWorkspace(null);
        } else {
          setWorkspace(ws);
        }
      } catch (e) {
        setErrorPage((e as Error).message);
        console.error("Error fetching workspace data:", e);
      } finally {
        setIsLoadingPage(false);
      }
    };
    fetchWorkspaceData();
  }, [workspaceId]);

  useEffect(() => {
    if (
      viewMode === "quiz_review" ||
      viewMode === "quiz_taking" ||
      viewMode === "quiz_results" ||
      viewMode === "quiz_list_selection"
    ) {
      contentAreaRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [viewMode, quizForDisplay, userAnswers, allQuizzes]); // Dependencies for scrolling effect

  const handleOpenUploadDialog = (existingQuiz?: Quiz) => {
    if (existingQuiz) {
      setActiveQuizDBEntry(existingQuiz); 
    } else {
      setActiveQuizDBEntry(null); 
    }
    setIsUploadDialogOpen(true);
  };
  

  const handleQuizGenerationComplete = async (quizId: string) => {
    setIsUploadDialogOpen(false); 
    setViewMode("loading_quiz"); 
    setIsGeneratingQuiz(false); 
    setAllQuizzes([]); 
  
    try {
      const quizzesInWs = await getQuizzesForWorkspace(workspaceId);
      const generatedQuiz = quizzesInWs.find(q => q.id === quizId);
  
      if (generatedQuiz && generatedQuiz.generated_quiz_data && generatedQuiz.status === 'completed') {
        setActiveQuizDBEntry(generatedQuiz);
        setQuizForDisplay(generatedQuiz.generated_quiz_data as StoredQuizData);
        setViewMode("quiz_review");
      } else if (generatedQuiz && generatedQuiz.status === 'failed') {
        toast({ title: "Quiz Generation Failed", description: generatedQuiz.error_message || "The AI failed to generate the quiz.", variant: "destructive" });
        setActiveQuizDBEntry(generatedQuiz);
        setQuizForDisplay(null);
        setViewMode("quiz_review"); 
      } else if (generatedQuiz && (generatedQuiz.status === 'processing' || generatedQuiz.status === 'pending')) {
         toast({ title: "Quiz is still processing", description: "Please wait a moment. The view will update when ready.", variant: "default" });
         setViewMode("dashboard_cards"); 
      } else {
        toast({ title: "Error", description: "Could not load the generated quiz data. It might still be processing or an error occurred.", variant: "destructive" });
        setViewMode("dashboard_cards");
      }
    } catch (error) {
      toast({ title: "Error loading generated quiz", description: (error as Error).message, variant: "destructive" });
      setViewMode("dashboard_cards");
    }
  };
  
  const handleUploadDialogClose = (refresh?: boolean) => {
    setIsUploadDialogOpen(false);
    setIsGeneratingQuiz(false); 
    if (refresh) {
      // Optionally re-fetch workspace data or quizzes
    }
  };


  const handleTakeQuiz = () => {
    if (quizForDisplay && activeQuizDBEntry?.status === 'completed') {
      setUserAnswers({}); 
      setViewMode("quiz_taking");
    } else {
      toast({title: "Cannot take quiz", description: "The quiz is not available or has not been completed successfully.", variant: "destructive"});
    }
  };

  const handleRegenerateQuiz = () => {
    if (activeQuizDBEntry) {
        handleOpenUploadDialog(activeQuizDBEntry);
    } else {
        toast({title: "Error", description: "No quiz context for regeneration.", variant: "destructive"});
        handleOpenUploadDialog(); 
    }
  };

  const handleSubmitQuiz = (answers: UserAnswers) => {
    setUserAnswers(answers);
    setViewMode("quiz_results");
  };

  const handleReviewRetakeQuizzes = async () => {
    setIsLoadingQuizzesList(true);
    setActiveQuizDBEntry(null);
    setQuizForDisplay(null);
    try {
      const quizzes = await getQuizzesForWorkspace(workspaceId);
      setAllQuizzes(quizzes);
      setViewMode("quiz_list_selection");
    } catch (error) {
      toast({ title: "Error fetching quizzes", description: (error as Error).message, variant: "destructive" });
      setViewMode("dashboard_cards"); 
    } finally {
      setIsLoadingQuizzesList(false);
    }
  };

  const handleQuizSelectionFromList = (quizId: string) => {
    const selectedQuiz = allQuizzes.find(q => q.id === quizId);
    if (selectedQuiz) {
      if (selectedQuiz.status === 'completed' && selectedQuiz.generated_quiz_data) {
        setActiveQuizDBEntry(selectedQuiz);
        setQuizForDisplay(selectedQuiz.generated_quiz_data as StoredQuizData);
        setViewMode('quiz_review');
      } else if (selectedQuiz.status === 'failed') {
        toast({ title: "Cannot Review", description: `This quiz (${selectedQuiz.pdf_name || 'Untitled'}) failed during generation. You can try regenerating it.`, variant: "destructive" });
        setActiveQuizDBEntry(selectedQuiz); 
        setQuizForDisplay(null);
        setViewMode('quiz_review'); 
      } else if (selectedQuiz.status === 'processing' || selectedQuiz.status === 'pending') {
         toast({ title: "Still Processing", description: `This quiz (${selectedQuiz.pdf_name || 'Untitled'}) is still being generated. Please wait.`, variant: "default" });
      } else {
        toast({ title: "Not Ready", description: `This quiz (${selectedQuiz.pdf_name || 'Untitled'}) is not ready for review.`, variant: "destructive"});
      }
    } else {
      toast({ title: "Error", description: "Selected quiz not found.", variant: "destructive"});
    }
  };

  const handleBackNavigation = () => {
    if (
      (viewMode === "quiz_review" || viewMode === "quiz_taking" || viewMode === "quiz_results") &&
      allQuizzes.length > 0 && 
      activeQuizDBEntry 
    ) {
      const isActiveQuizInList = allQuizzes.some(q => q.id === activeQuizDBEntry.id);

      if (isActiveQuizInList) {
        setViewMode('quiz_list_selection');
        setActiveQuizDBEntry(null);
        setQuizForDisplay(null);
        return;
      }
    }
    
    setViewMode('dashboard_cards');
    setActiveQuizDBEntry(null);
    setQuizForDisplay(null);
    setAllQuizzes([]); 
    setIsLoadingQuizzesList(false);
  };

  const getBackButtonText = () => {
    if (
      (viewMode === "quiz_review" || viewMode === "quiz_taking" || viewMode === "quiz_results") &&
      allQuizzes.length > 0 &&
      activeQuizDBEntry &&
      allQuizzes.some(q => q.id === activeQuizDBEntry.id)
    ) {
      return "Back to Quiz List";
    }
    return `Back to ${workspace?.name || 'Workspace'} Dashboard`;
  };


  if (isLoadingPage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading workspace dashboard...</p>
      </div>
    );
  }

  if (errorPage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 animate-fade-in h-full">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold font-headline">Error Loading Workspace</h2>
        <p className="text-muted-foreground max-w-md mx-auto">{errorPage}</p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 h-full">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold">Workspace Not Found</h2>
        <p className="text-muted-foreground">The workspace you are looking for does not exist or you do not have permission to access it.</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }


  const renderContent = () => {
    switch (viewMode) {
      case "loading_quiz":
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Preparing your quiz...</p>
          </div>
        );
      case "quiz_list_selection":
        if (isLoadingQuizzesList) {
          return (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg text-muted-foreground">Fetching your quizzes...</p>
            </div>
          );
        }
        if (allQuizzes.length === 0) {
          return (
            <div className="text-center py-10">
              <Inbox className="mx-auto h-16 w-16 text-muted-foreground mb-4" data-ai-hint="empty box" />
              <h3 className="text-xl font-semibold">No Quizzes Found</h3>
              <p className="text-muted-foreground mt-2">
                There are no quizzes in this workspace yet. Try generating one!
              </p>
            </div>
          );
        }
        return (
          <QuizList 
            initialQuizzes={allQuizzes} 
            workspaceId={workspaceId}
            onQuizSelect={handleQuizSelectionFromList}
          />
        );
      case "quiz_review":
        if (!activeQuizDBEntry) return <p>Error: No active quiz selected for review.</p>;
        if (activeQuizDBEntry.status === 'failed') {
           return (
             <div className="text-center py-10">
               <AlertCircle className="mx-auto h-16 w-16 text-destructive mb-4" />
               <h3 className="text-xl font-semibold">Quiz Generation Failed</h3>
               <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                 This quiz ({activeQuizDBEntry.pdf_name || 'Untitled'}) encountered an error during generation:
               </p>
               <p className="text-sm text-destructive mt-1 mb-4">{activeQuizDBEntry.error_message || "Unknown error."}</p>
               <Button onClick={handleRegenerateQuiz}>
                   <RefreshCw className="mr-2 h-4 w-4" /> Re-Generate Quiz
               </Button>
             </div>
           );
        }
        if (!quizForDisplay) return <p>Error: Quiz data not available for review. It might still be processing or failed.</p>;
        return (
            <QuizReviewDisplay 
              quizData={quizForDisplay.quiz} 
              quizName={activeQuizDBEntry.pdf_name || "Untitled Quiz"}
            />
        );
      case "quiz_taking":
        if (!quizForDisplay || !activeQuizDBEntry) return <p>Error: Quiz data not available for taking.</p>;
        return (
          <>
            <p className="text-sm text-muted-foreground mb-6 text-center">
                Select the best answer for each question.
            </p>
            <QuizTakerForm
              quiz={activeQuizDBEntry} 
              quizData={quizForDisplay.quiz}
              onSubmit={handleSubmitQuiz}
              isSubmitting={isSubmittingQuiz}
            />
          </>
        );
      case "quiz_results":
        if (!quizForDisplay || !userAnswers || !activeQuizDBEntry) return <p>Error: Quiz results not available.</p>;
        return (
             <QuizResultsDisplay
              quiz={activeQuizDBEntry}
              quizData={quizForDisplay.quiz}
              userAnswers={userAnswers}
              onRetake={() => {
                setUserAnswers(null);
                setViewMode("quiz_taking");
              }}
              onReviewAll={() => {
                setViewMode("quiz_review"); 
              }}
            />
        );
      case "dashboard_cards":
      default:
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 text-left">
             <DashboardActionCard 
              title="Generate New Quiz" 
              description="Create a fresh set of questions from a PDF." 
              icon={<Wand2 className="h-8 w-8 mb-2 text-primary" />} 
              onClick={() => handleOpenUploadDialog()}
              disabled={isGeneratingQuiz}
            />
            <DashboardActionCard 
              title="View Source PDF" 
              description="Review the original document for this workspace." 
              icon={<FileText className="h-8 w-8 mb-2 text-primary" />} 
              onClick={() => toast({ title: "Feature Coming Soon", description: "Viewing source PDFs will be enabled shortly."})}
            />
            <DashboardActionCard 
              title="Review/Retake Quizzes" 
              description="Look over and manage previously generated quizzes." 
              icon={<ListChecks className="h-8 w-8 mb-2 text-primary" />} 
              onClick={handleReviewRetakeQuizzes}
              disabled={isLoadingQuizzesList}
            />
            <DashboardActionCard 
              title="Workspace Settings" 
              description="Manage settings and options for this workspace." 
              icon={<Settings className="h-8 w-8 mb-2 text-primary" />} 
              onClick={() => toast({ title: "Feature Coming Soon", description: "Workspace settings are on the way."})}
            />
          </div>
        );
    }
  };

  const getPageTitle = () => {
    if (viewMode === 'dashboard_cards') return `${workspace.name} Dashboard`;
    if (viewMode === 'quiz_list_selection') return `Select Quiz in ${workspace.name}`;
    if (activeQuizDBEntry?.pdf_name) {
        if (viewMode === 'quiz_review') return `Review: ${activeQuizDBEntry.pdf_name}`;
        if (viewMode === 'quiz_taking') return `Taking Quiz: ${activeQuizDBEntry.pdf_name}`;
        if (viewMode === 'quiz_results') return `Results: ${activeQuizDBEntry.pdf_name}`;
    }
    if (viewMode === 'loading_quiz') return 'Loading Quiz...';
    return workspace.name; 
  };

  const getPageDescription = () => {
    if (viewMode === 'dashboard_cards') return "Choose an action to get started with your study materials.";
    if (viewMode === 'quiz_list_selection') return "Choose a quiz from the list below to review its questions or retake it.";
     if (activeQuizDBEntry) {
        if (viewMode === 'quiz_review' && activeQuizDBEntry.status === 'completed') return `Review the generated questions. You can then take the quiz or regenerate it.`;
        if (viewMode === 'quiz_review' && activeQuizDBEntry.status === 'failed') return `This quiz generation failed. You can try regenerating it.`;
        if (viewMode === 'quiz_taking') return `Select the best answer for each question.`;
        if (viewMode === 'quiz_results') return `Here's how you performed. Review your answers and explanations.`;
     }
    if (viewMode === 'loading_quiz') return `Loading your quiz...`;
    return "Manage your study materials and quizzes.";
  }
  
  const sortedAllQuizzes = allQuizzes.length > 0 ? [...allQuizzes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : [];
  const isLatestQuizSelected = activeQuizDBEntry && sortedAllQuizzes.length > 0 && sortedAllQuizzes[0].id === activeQuizDBEntry.id;
  const isNewlyGeneratedQuizActive = activeQuizDBEntry && allQuizzes.length === 0 && !isLoadingQuizzesList;


  const showActionButtonsFooter = 
    (viewMode === 'quiz_review' && activeQuizDBEntry && activeQuizDBEntry.status === 'completed') ||
    (viewMode === 'quiz_review' && activeQuizDBEntry && activeQuizDBEntry.status === 'failed') ||
    (viewMode === 'quiz_results' && activeQuizDBEntry);


  return (
    <div className="flex flex-col h-full"> {/* Ensure this takes full height from parent */}
      <UploadQuizDialog
        workspaceId={workspaceId}
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        onDialogClose={handleUploadDialogClose}
        onQuizGenerationStart={() => setIsGeneratingQuiz(true)}
        onQuizGenerated={handleQuizGenerationComplete}
        initialNumQuestions={activeQuizDBEntry?.num_questions}
        existingQuizIdToUpdate={activeQuizDBEntry?.id}
        initialPdfNameHint={activeQuizDBEntry?.pdf_name || undefined}
      />
      
      {/* Static Header Part of Right Pane */}
      <div className="p-6 md:p-8 border-b bg-card"> 
         {(viewMode !== 'dashboard_cards') && (
           <Button variant="link" className="text-sm text-primary self-start ml-[-0.75rem] mb-2 px-1 h-auto py-0 flex items-center" onClick={handleBackNavigation}>
             <ChevronLeft className="h-4 w-4 mr-1" /> {getBackButtonText()}
           </Button>
         )}
        <h1 className="text-2xl md:text-3xl font-bold font-headline">
          {getPageTitle()}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
            {getPageDescription()}
        </p>
      </div>

      {/* Scrollable Content Area Part of Right Pane */}
      <div ref={contentAreaRef} className="flex-1 overflow-y-auto p-6 md:p-8 min-h-0">
         <div className="w-full max-w-4xl mx-auto"> 
            {renderContent()}
         </div>
      </div>

      {/* Fixed Action Bar (Footer) Part of Right Pane */}
      {showActionButtonsFooter && (
        <div className="p-4 md:p-6 border-t bg-card flex justify-end space-x-4">
          {viewMode === 'quiz_review' && activeQuizDBEntry?.status === 'completed' && (
            <>
              <Button variant="outline" onClick={handleRegenerateQuiz}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Re-Generate Quiz
              </Button>
              <Button onClick={handleTakeQuiz}>
                  <BookOpen className="mr-2 h-4 w-4" /> Take the Quiz
              </Button>
            </>
          )}
           {viewMode === 'quiz_review' && activeQuizDBEntry?.status === 'failed' && (
             <Button onClick={handleRegenerateQuiz}>
                <RefreshCw className="mr-2 h-4 w-4" /> Re-Generate Quiz
             </Button>
           )}
          {viewMode === 'quiz_results' && (
            <>
              <Button variant="outline" onClick={() => {
                  setViewMode("quiz_review");
              }}>
                  <ListChecks className="mr-2 h-4 w-4" /> Review All Questions
              </Button>
              <Button onClick={() => {
                  setUserAnswers(null);
                  setViewMode("quiz_taking");
              }}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Retake Quiz
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
    
    

    


