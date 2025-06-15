
"use client";

import { createClient } from "@/lib/supabase/client";
import { getWorkspaceById } from "@/lib/actions/workspace.actions";
import type { Workspace, Quiz, StoredQuizData, UserAnswers, GeneratedQuizQuestion } from "@/types/supabase";
import { use, useEffect, useState, type ReactNode, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, FileText, Wand2, ListChecks, Settings, BookOpen, RefreshCw, Send, Newspaper } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UploadQuizDialog } from "@/components/dashboard/upload-quiz-dialog";
import { QuizReviewDisplay } from "@/components/dashboard/quiz-review-display";
import { QuizTakerForm } from "@/components/dashboard/quiz-taker-form";
import { QuizResultsDisplay } from "@/components/dashboard/quiz-results-display";
import { getQuizzesForWorkspace } from "@/lib/actions/quiz.actions";


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

type ViewMode = "dashboard_cards" | "quiz_review" | "quiz_taking" | "quiz_results" | "loading_quiz";

export default function WorkspacePage({ params: paramsProp }: { params: { workspaceId: string } }) {
  const resolvedParams = use(paramsProp as any); 
  const { workspaceId } = resolvedParams;

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

  const handleOpenUploadDialog = (existingQuiz?: Quiz) => {
    if (existingQuiz) {
      setActiveQuizDBEntry(existingQuiz); 
      setQuizForDisplay(existingQuiz.generated_quiz_data as StoredQuizData);
    } else {
      setActiveQuizDBEntry(null); 
      setQuizForDisplay(null);
    }
    setIsUploadDialogOpen(true);
  };
  

  const handleQuizGenerationComplete = async (quizId: string) => {
    setIsUploadDialogOpen(false); 
    setViewMode("loading_quiz"); 
    setIsGeneratingQuiz(false); 
  
    try {
      const quizzes = await getQuizzesForWorkspace(workspaceId);
      const generatedQuiz = quizzes.find(q => q.id === quizId);
  
      if (generatedQuiz && generatedQuiz.generated_quiz_data && generatedQuiz.status === 'completed') {
        setActiveQuizDBEntry(generatedQuiz);
        setQuizForDisplay(generatedQuiz.generated_quiz_data as StoredQuizData);
        setViewMode("quiz_review");
        contentAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (generatedQuiz && generatedQuiz.status === 'failed') {
        toast({ title: "Quiz Generation Failed", description: generatedQuiz.error_message || "The AI failed to generate the quiz.", variant: "destructive" });
        setActiveQuizDBEntry(generatedQuiz); 
        setQuizForDisplay(null); 
        setViewMode("dashboard_cards"); 
      } else if (generatedQuiz && (generatedQuiz.status === 'processing' || generatedQuiz.status === 'pending')) {
         toast({ title: "Quiz is still processing", description: "Please wait a moment. The view will update when ready.", variant: "default" });
         setViewMode("dashboard_cards");
      }
      else {
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
      // Might re-fetch all quizzes or workspace data if needed
    }
  };


  const handleTakeQuiz = () => {
    if (quizForDisplay && activeQuizDBEntry?.status === 'completed') {
      setUserAnswers(null); 
      setViewMode("quiz_taking");
      contentAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
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
    contentAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToDashboardCards = () => {
    setViewMode('dashboard_cards');
    // Optionally reset active quiz context
    // setActiveQuizDBEntry(null); 
    // setQuizForDisplay(null);
  };

  if (isLoadingPage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading workspace dashboard...</p>
      </div>
    );
  }

  if (errorPage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 animate-fade-in">
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
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
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
      case "quiz_review":
        if (!quizForDisplay || !activeQuizDBEntry) return <p>Error: Quiz data not available for review.</p>;
        return (
          <>
            <QuizReviewDisplay 
              quizData={quizForDisplay.quiz} 
              quizName={activeQuizDBEntry.pdf_name || "Untitled Quiz"}
            />
            <div className="mt-8 flex justify-end space-x-4"> {/* Actions for review mode */}
              <Button variant="outline" onClick={handleRegenerateQuiz}>
                <RefreshCw className="mr-2 h-4 w-4" /> Regenerate Quiz
              </Button>
              <Button onClick={handleTakeQuiz}>
                <BookOpen className="mr-2 h-4 w-4" /> Take the Quiz
              </Button>
            </div>
          </>
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
          <>
             <QuizResultsDisplay
              quiz={activeQuizDBEntry}
              quizData={quizForDisplay.quiz}
              userAnswers={userAnswers}
              onRetake={() => {
                setUserAnswers(null);
                setViewMode("quiz_taking");
                contentAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onReviewAll={() => {
                setUserAnswers(null); 
                setViewMode("quiz_review");
                contentAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </>
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
              onClick={() => toast({ title: "Feature Coming Soon", description: "Managing past quizzes will be available soon."})}
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
    if (activeQuizDBEntry?.pdf_name) return activeQuizDBEntry.pdf_name;
    return workspace.name; // Fallback
  };

  const getPageDescription = () => {
    if (viewMode === 'dashboard_cards') return "Choose an action to get started.";
    if (viewMode === 'quiz_review' && activeQuizDBEntry) return `Review the generated questions for "${activeQuizDBEntry.pdf_name || 'your quiz'}". You can then take the quiz or regenerate it.`;
    if (viewMode === 'quiz_taking') return `Taking quiz: ${activeQuizDBEntry?.pdf_name || 'Untitled Quiz'}`;
    if (viewMode === 'quiz_results') return `Results for quiz: ${activeQuizDBEntry?.pdf_name || 'Untitled Quiz'}`;
    if (viewMode === 'loading_quiz') return `Loading quiz...`;
    return "";
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
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
      
      {/* Header for the right pane content */}
      <div className="p-6 md:p-8 border-b">
         {viewMode !== 'dashboard_cards' && (
           <Button variant="link" className="text-sm text-primary self-start ml-[-0.75rem] mb-2 px-1" onClick={handleBackToDashboardCards}>
             ← Back to {workspace.name} Dashboard
           </Button>
         )}
        <h1 className="text-2xl md:text-3xl font-bold font-headline">
          {getPageTitle()}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
            {getPageDescription()}
        </p>
      </div>

      {/* Scrollable content area for the right pane */}
      <div ref={contentAreaRef} className="flex-1 overflow-y-auto min-h-0 p-6 md:p-8">
         <div className="w-full max-w-4xl mx-auto"> {/* Max width for content inside scrollable area */}
            {renderContent()}
         </div>
      </div>

      {/* Fixed Action Bar at the bottom of the right pane - may be conditionally rendered or have content changed */}
      {/* Example: only show if in review mode */}
      {/* This section might be better integrated directly into renderContent for more complex conditional logic */}
    </div>
  );
}
    

    