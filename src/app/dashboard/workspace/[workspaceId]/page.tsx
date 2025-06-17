
"use client";

import { createClient } from "@/lib/supabase/client";
import { getWorkspaceById } from "@/lib/actions/workspace.actions";
import type { Workspace, Quiz, StoredQuizData, UserAnswers } from "@/types/supabase";
import { useEffect, useState, type ReactNode, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, FileText, Wand2, ListChecks, Settings, BookOpen, RefreshCw, Send, Newspaper, ChevronLeft, PackageSearch, Inbox, FolderOpen, BookOpenCheck, PlusCircle, Settings2, ChevronRight, LayoutDashboard, FileQuestion } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UploadQuizDialog } from "@/components/dashboard/upload-quiz-dialog";
import { QuizReviewDisplay } from "@/components/dashboard/quiz-review-display";
import { QuizTakerForm } from "@/components/dashboard/quiz-taker-form";
import { QuizResultsDisplay } from "@/components/dashboard/quiz-results-display";
import { getQuizzesForWorkspace } from "@/lib/actions/quiz.actions";
import { QuizList } from "@/components/dashboard/quiz-list";
import { useParams } from "next/navigation";
import { SourceFileList } from "@/components/dashboard/source-file-list";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";


type ViewMode = "empty_state" | "quiz_review" | "quiz_taking" | "quiz_results" | "loading_quiz_data";

export default function WorkspacePage() {
  const routeParams = useParams(); 
  const workspaceId = routeParams.workspaceId as string; 

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [errorPage, setErrorPage] = useState<string | null>(null);
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>("empty_state");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  
  const [activeQuizDBEntry, setActiveQuizDBEntry] = useState<Quiz | null>(null);
  const [activeQuizDisplayData, setActiveQuizDisplayData] = useState<StoredQuizData | null>(null);
  
  const [userAnswers, setUserAnswers] = useState<UserAnswers | null>(null);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false); // For QuizTakerForm loading state
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false); // For UploadQuizDialog loading state
  
  const [allQuizzesForWorkspace, setAllQuizzesForWorkspace] = useState<Quiz[]>([]);
  const [sourcePdfsForWorkspace, setSourcePdfsForWorkspace] = useState<string[]>([]);
  const [isLoadingSidebarData, setIsLoadingSidebarData] = useState(false);

  const [showRegenerateButtonInMain, setShowRegenerateButtonInMain] = useState(false);
  
  const rightPaneContentRef = useRef<HTMLDivElement>(null);

  // Fetch initial workspace details
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

  // Fetch quizzes for the sidebar (Knowledge source PDFs, History quizzes)
  useEffect(() => {
    const fetchSidebarQuizzes = async () => {
      if (!workspaceId) return;
      setIsLoadingSidebarData(true);
      try {
        const quizzes = await getQuizzesForWorkspace(workspaceId);
        setAllQuizzesForWorkspace(quizzes);
        const pdfNames = Array.from(new Set(quizzes.map(q => q.pdf_name).filter(Boolean as (value: string | null) => value is string)));
        setSourcePdfsForWorkspace(pdfNames);
      } catch (error) {
        toast({ title: "Error fetching sidebar data", description: (error as Error).message, variant: "destructive" });
      } finally {
        setIsLoadingSidebarData(false);
      }
    };
    if (workspace) { // Only fetch if workspace is loaded
        fetchSidebarQuizzes();
    }
  }, [workspaceId, workspace, toast]);


  // Scroll right pane to top on view change
  useEffect(() => {
    rightPaneContentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [viewMode, activeQuizDisplayData, userAnswers]);

  const refreshSidebarData = async () => {
    if (!workspaceId) return;
    setIsLoadingSidebarData(true);
    try {
      const quizzes = await getQuizzesForWorkspace(workspaceId);
      setAllQuizzesForWorkspace(quizzes);
      const pdfNames = Array.from(new Set(quizzes.map(q => q.pdf_name).filter(Boolean as (value: string | null) => value is string)));
      setSourcePdfsForWorkspace(pdfNames);
    } catch (error) {
      console.error("Error refreshing sidebar data:", error);
      toast({ title: "Error refreshing workspace data", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoadingSidebarData(false);
    }
  };


  const handleOpenUploadDialog = (existingQuiz?: Quiz) => {
    setActiveQuizDBEntry(existingQuiz || null); // For pre-filling or regeneration context
    setIsUploadDialogOpen(true);
  };
  
  const handleQuizGenerationComplete = async (quizId: string) => {
    setIsUploadDialogOpen(false); 
    setViewMode("loading_quiz_data"); 
    setIsGeneratingQuiz(false); 
  
    try {
      await refreshSidebarData(); // Refresh sidebar lists
      const quizzesInWs = await getQuizzesForWorkspace(workspaceId); // Re-fetch all to ensure we have the latest
      setAllQuizzesForWorkspace(quizzesInWs);

      const generatedQuiz = quizzesInWs.find(q => q.id === quizId);
  
      if (generatedQuiz && generatedQuiz.generated_quiz_data && generatedQuiz.status === 'completed') {
        setActiveQuizDBEntry(generatedQuiz);
        setActiveQuizDisplayData(generatedQuiz.generated_quiz_data as StoredQuizData);
        setShowRegenerateButtonInMain(true); // Newly generated quiz can be regenerated
        setViewMode("quiz_review");
      } else if (generatedQuiz && generatedQuiz.status === 'failed') {
        toast({ title: "Quiz Generation Failed", description: generatedQuiz.error_message || "The AI failed to generate the quiz.", variant: "destructive" });
        setActiveQuizDBEntry(generatedQuiz);
        setActiveQuizDisplayData(null);
        setShowRegenerateButtonInMain(true); // Failed quiz can be regenerated
        setViewMode("quiz_review"); // Show failure message in review view
      } else if (generatedQuiz && (generatedQuiz.status === 'processing' || generatedQuiz.status === 'pending')) {
         toast({ title: "Quiz is still processing", description: "Please wait a moment. The history list will update.", variant: "default" });
         setViewMode("empty_state"); 
      } else {
        toast({ title: "Error", description: "Could not load the generated quiz data. It might still be processing or an error occurred.", variant: "destructive" });
        setViewMode("empty_state");
      }
    } catch (error) {
      toast({ title: "Error loading generated quiz", description: (error as Error).message, variant: "destructive" });
      setViewMode("empty_state");
    }
  };
  
  const handleUploadDialogClose = (refresh?: boolean) => {
    setIsUploadDialogOpen(false);
    setIsGeneratingQuiz(false); 
    if (refresh) { // This 'refresh' usually implies data changed, so sidebar needs update
      refreshSidebarData();
    }
  };

  const handleQuizSelectionFromHistory = (quizId: string) => {
    const selectedQuiz = allQuizzesForWorkspace.find(q => q.id === quizId);
    
    if (selectedQuiz) {
      if (selectedQuiz.status === 'completed' && selectedQuiz.generated_quiz_data) {
        setActiveQuizDBEntry(selectedQuiz);
        setActiveQuizDisplayData(selectedQuiz.generated_quiz_data as StoredQuizData);
        // Only latest quiz from a given PDF source might be considered "regeneratable" in a simple model
        // For simplicity, allow retake, but regenerate only if it's the MOST recent overall.
        const sortedQuizzes = [...allQuizzesForWorkspace].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setShowRegenerateButtonInMain(sortedQuizzes.length > 0 && sortedQuizzes[0].id === selectedQuiz.id);
        setViewMode('quiz_review');
      } else if (selectedQuiz.status === 'failed') {
        setActiveQuizDBEntry(selectedQuiz);
        setActiveQuizDisplayData(null);
        const sortedQuizzes = [...allQuizzesForWorkspace].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setShowRegenerateButtonInMain(sortedQuizzes.length > 0 && sortedQuizzes[0].id === selectedQuiz.id);
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

  const handleTakeQuiz = () => {
    if (activeQuizDisplayData && activeQuizDBEntry?.status === 'completed') {
      setUserAnswers({}); 
      setViewMode("quiz_taking");
    } else {
      toast({title: "Cannot take quiz", description: "The quiz is not available or has not been completed successfully.", variant: "destructive"});
    }
  };

  const handleRegenerateActiveQuiz = () => {
    if (activeQuizDBEntry) { // The quiz currently shown in the right pane
        handleOpenUploadDialog(activeQuizDBEntry); // Pass it for regeneration context
    } else {
        toast({title: "Error", description: "No active quiz context for regeneration.", variant: "destructive"});
    }
  };

  const handleSubmitQuiz = (answers: UserAnswers) => {
    setIsSubmittingQuiz(true); // Potentially for future async submission
    setUserAnswers(answers);
    setViewMode("quiz_results");
    setIsSubmittingQuiz(false);
  };
  
  // Main loading state for the page (workspace details)
  if (isLoadingPage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading workspace...</p>
      </div>
    );
  }

  if (errorPage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 animate-fade-in h-full">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold">Error Loading Workspace</h2>
        <p className="text-muted-foreground max-w-md mx-auto">{errorPage}</p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Back to All Workspaces</Link>
        </Button>
      </div>
    );
  }

  if (!workspace) {
     return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 h-full">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold">Workspace Not Found</h2>
        <p className="text-muted-foreground">The workspace does not exist or you do not have permission.</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard">Back to All Workspaces</Link>
        </Button>
      </div>
    );
  }

  const renderRightPaneContent = () => {
    switch (viewMode) {
      case "loading_quiz_data":
        return (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Preparing your quiz...</p>
          </div>
        );
      case "quiz_review":
        if (!activeQuizDBEntry) return <div className="p-8 text-center"><p>No quiz selected for review.</p></div>;
        if (activeQuizDBEntry.status === 'failed') {
           return (
             <div className="text-center py-10 p-8">
               <AlertCircle className="mx-auto h-16 w-16 text-destructive mb-4" />
               <h3 className="text-xl font-semibold">Quiz Generation Failed</h3>
               <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                 This quiz ({activeQuizDBEntry.pdf_name || 'Untitled'}) encountered an error:
               </p>
               <p className="text-sm text-destructive mt-1 mb-4">{activeQuizDBEntry.error_message || "Unknown error."}</p>
             </div>
           );
        }
        if (!activeQuizDisplayData) return <div className="p-8 text-center"><p>Quiz data not available. It might be processing or failed.</p></div>;
        return (
            <QuizReviewDisplay 
              quizData={activeQuizDisplayData.quiz} 
              quizName={activeQuizDBEntry.pdf_name || "Untitled Quiz"}
            />
        );
      case "quiz_taking":
        if (!activeQuizDisplayData || !activeQuizDBEntry) return <div className="p-8 text-center"><p>Quiz data not available for taking.</p></div>;
        return (
          <>
            <p className="text-sm text-muted-foreground mb-6 text-center">
                Select the best answer for each question.
            </p>
            <QuizTakerForm
              quiz={activeQuizDBEntry} 
              quizData={activeQuizDisplayData.quiz}
              onSubmit={handleSubmitQuiz}
              isSubmitting={isSubmittingQuiz}
            />
          </>
        );
      case "quiz_results":
        if (!activeQuizDisplayData || !userAnswers || !activeQuizDBEntry) return <div className="p-8 text-center"><p>Quiz results not available.</p></div>;
        return (
             <QuizResultsDisplay
              quiz={activeQuizDBEntry}
              quizData={activeQuizDisplayData.quiz}
              userAnswers={userAnswers}
              onRetake={() => {
                setUserAnswers(null);
                setViewMode("quiz_taking");
              }}
              onReviewAll={() => {
                // setShowRegenerateButtonInMain(false); // Decide if regenerate should be available after retake review
                setViewMode("quiz_review"); 
              }}
            />
        );
      case "empty_state":
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <LayoutDashboard className="h-20 w-20 text-muted-foreground/50 mb-6" data-ai-hint="dashboard illustration" />
            <h2 className="text-2xl font-semibold mb-2">Welcome to {workspace.name}</h2>
            <p className="text-muted-foreground max-w-md">
              Select an item from the sidebar to get started. You can generate new quizzes from PDFs under "Knowledge" or review past quizzes under "History".
            </p>
          </div>
        );
    }
  };

  const showActionButtonsFooterRightPane = 
    (viewMode === 'quiz_review' && activeQuizDBEntry && (activeQuizDBEntry.status === 'completed' || activeQuizDBEntry.status === 'failed')) ||
    (viewMode === 'quiz_results' && activeQuizDBEntry);


  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-[calc(100vh-var(--header-height)-var(--footer-height))] border-t">
        <Sidebar className="border-r">
          <SidebarHeader className="p-3 border-b">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BookOpenCheck className="h-6 w-6 text-primary" />
                    <span className="font-semibold text-lg">FinalQuiz</span>
                </div>
                <SidebarTrigger />
            </div>
          </SidebarHeader>
          <SidebarContent className="p-0">
            <ScrollArea className="h-full">
                <Accordion type="multiple" defaultValue={["knowledge", "history"]} className="w-full px-3 py-2">
                <AccordionItem value="knowledge">
                    <AccordionTrigger className="text-base hover:no-underline">
                        <div className="flex items-center">
                            <FolderOpen className="mr-2 h-5 w-5 text-primary/80" />
                            Knowledge
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-1 pt-1 pb-0">
                         <Button variant="ghost" size="sm" className="w-full justify-start mb-2 text-primary" onClick={() => handleOpenUploadDialog()}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Generate New Quiz
                        </Button>
                        {isLoadingSidebarData ? <Loader2 className="mx-auto my-4 h-6 w-6 animate-spin text-muted-foreground" /> :
                         sourcePdfsForWorkspace.length > 0 ? <SourceFileList pdfNames={sourcePdfsForWorkspace} /> : <p className="text-xs text-muted-foreground px-2 py-1">No PDFs uploaded yet.</p>
                        }
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="history" className="border-b-0">
                    <AccordionTrigger className="text-base hover:no-underline">
                         <div className="flex items-center">
                            <ListChecks className="mr-2 h-5 w-5 text-primary/80" />
                            History
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-1 pt-1 pb-0">
                        {isLoadingSidebarData ? <Loader2 className="mx-auto my-4 h-6 w-6 animate-spin text-muted-foreground" /> :
                         allQuizzesForWorkspace.length > 0 ? (
                            <QuizList 
                                initialQuizzes={allQuizzesForWorkspace} 
                                workspaceId={workspaceId} 
                                onQuizSelect={handleQuizSelectionFromHistory}
                                selectedQuizId={activeQuizDBEntry?.id}
                            />
                         ) : <p className="text-xs text-muted-foreground px-2 py-1">No quizzes generated yet.</p>
                        }
                    </AccordionContent>
                </AccordionItem>
                </Accordion>
            </ScrollArea>
          </SidebarContent>
          <SidebarFooter className="p-3 border-t">
            <Button variant="ghost" asChild className="w-full justify-start">
                <Link href={`/dashboard/workspace/${workspaceId}/settings`} onClick={(e) => { e.preventDefault(); toast({title: "Coming Soon", description: "Workspace settings are not yet implemented."})}}>
                    <Settings2 className="mr-2 h-4 w-4" /> Workspace Settings
                </Link>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex flex-col bg-background overflow-hidden">
          <div className="p-4 md:p-6 border-b bg-card flex-shrink-0">
            <h1 className="text-xl md:text-2xl font-semibold font-headline">
              {workspace.name} Dashboard
            </h1>
            <p className="text-muted-foreground mt-1 text-xs md:text-sm">
              {viewMode === 'quiz_review' && activeQuizDBEntry ? `Reviewing: ${activeQuizDBEntry.pdf_name || 'Untitled Quiz'}` :
               viewMode === 'quiz_taking' && activeQuizDBEntry ? `Taking Quiz: ${activeQuizDBEntry.pdf_name || 'Untitled Quiz'}` :
               viewMode === 'quiz_results' && activeQuizDBEntry ? `Results for: ${activeQuizDBEntry.pdf_name || 'Untitled Quiz'}` :
               'Manage your quizzes and study materials for this workspace.'
              }
            </p>
          </div>
          
          <ScrollArea ref={rightPaneContentRef} className="flex-1 min-h-0">
            <div className="p-4 md:p-6">
              {renderRightPaneContent()}
            </div>
          </ScrollArea>

          {showActionButtonsFooterRightPane && activeQuizDBEntry && (
            <div className="p-4 border-t bg-card flex justify-end space-x-3 flex-shrink-0">
              {viewMode === 'quiz_review' && activeQuizDBEntry.status === 'completed' && (
                <>
                  {showRegenerateButtonInMain && (
                    <Button variant="outline" onClick={handleRegenerateActiveQuiz}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Re-Generate
                    </Button>
                  )}
                  <Button onClick={handleTakeQuiz}>
                        <BookOpen className="mr-2 h-4 w-4" /> Take Quiz
                  </Button>
                </>
              )}
              {viewMode === 'quiz_review' && activeQuizDBEntry.status === 'failed' && showRegenerateButtonInMain && (
                 <Button onClick={handleRegenerateActiveQuiz}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Re-Generate
                 </Button>
              )}
              {viewMode === 'quiz_results' && (
                <>
                  <Button variant="outline" onClick={() => setViewMode("quiz_review")}>
                      <ListChecks className="mr-2 h-4 w-4" /> Review All
                  </Button>
                  <Button onClick={() => {setUserAnswers(null); setViewMode("quiz_taking"); }}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Retake Quiz
                  </Button>
                </>
              )}
            </div>
          )}
        </SidebarInset>
      </div>

      <UploadQuizDialog
        workspaceId={workspaceId}
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        onDialogClose={handleUploadDialogClose}
        onQuizGenerationStart={() => setIsGeneratingQuiz(true)}
        onQuizGenerated={handleQuizGenerationComplete}
        initialNumQuestions={activeQuizDBEntry?.num_questions}
        existingQuizIdToUpdate={activeQuizDBEntry?.id} // if regenerating active quiz
        initialPdfNameHint={activeQuizDBEntry?.pdf_name || undefined}
      />
    </SidebarProvider>
  );
}
    
    

    




    


