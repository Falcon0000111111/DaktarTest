"use client";

import { getWorkspaceById } from "@/lib/actions/workspace.actions";
import type { Workspace, Quiz, StoredQuizData, UserAnswers } from "@/types/supabase";
import { useEffect, useState, type ReactNode, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Loader2, AlertCircle, FileText, Wand2, ListChecks, Settings, BookOpen,
  RefreshCw, Send, Newspaper, ChevronLeft, PackageSearch, Inbox, FolderOpen,
  PlusCircle, Settings2, ChevronRight, LayoutDashboard, FileQuestion,
  Cpu, PanelLeftClose, PanelRightOpen, FileArchive, CheckCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UploadQuizDialog } from "@/components/dashboard/upload-quiz-dialog";
import { QuizReviewDisplay } from "@/components/dashboard/quiz-review-display";
import { QuizTakerForm } from "@/components/dashboard/quiz-taker-form";
import { QuizResultsDisplay } from "@/components/dashboard/quiz-results-display";
import { getQuizzesForWorkspace } from "@/lib/actions/quiz.actions";
import { useParams } from "next/navigation";
import { SourceFileList } from "@/components/dashboard/source-file-list";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns';

// Sidebar Trigger Component (Used inside SidebarHeader)
const CustomSidebarTrigger = () => {
  const { toggleSidebar, open, state } = useSidebar();
  const IconToRender = open ? PanelLeftClose : PanelRightOpen;
  const tooltipText = open ? "Close sidebar" : "Open sidebar";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            state === 'expanded' ? "h-8 w-8" : "h-7 w-7"
          )}
          onClick={toggleSidebar}
          aria-label={tooltipText}
        >
          <IconToRender className="h-5 w-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" align="center" sideOffset={8}>
        <p>{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  );
};

// --- Inlined QuizList component with requested changes ---
interface QuizListProps {
  initialQuizzes: Quiz[];
  onQuizSelect: (quizId: string) => void;
  selectedQuizId?: string | null;
}

const truncateError = (message: string | null, length = 45): string => {
  if (!message) return "Error: Unknown issue.";
  const prefix = "Error: ";
  let cleanMessage = message.startsWith(prefix) ? message.slice(prefix.length) : message;
  if (cleanMessage.length <= length) return prefix + cleanMessage;
  return prefix + cleanMessage.substring(0, length) + '...';
};

const QuizList: React.FC<QuizListProps> = ({
  initialQuizzes,
  onQuizSelect,
  selectedQuizId
}) => {
  const sortedQuizzes = [...initialQuizzes].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="flex flex-col space-y-1">
      {sortedQuizzes.map((quiz) => (
        <button
          key={quiz.id}
          onClick={() => onQuizSelect(quiz.id)}
          className={cn(
            "w-full text-left p-2 rounded-md hover:bg-accent flex flex-col",
            selectedQuizId === quiz.id && "bg-accent text-accent-foreground"
          )}
        >
          {/* Main content: icon + title/details */}
          <div className="flex items-start w-full">
            <FileText className="h-4 w-4 mt-0.5 mr-3 flex-shrink-0 text-muted-foreground" />
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{quiz.pdf_name || "Untitled Quiz"}</p>
              <p className="text-xs text-muted-foreground">
                {quiz.num_questions || 'N/A'} questions • {formatDistanceToNow(new Date(quiz.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          {/* Status line below, indented */}
          <div className="pl-[28px] mt-1.5">
            {quiz.status === 'completed' && (
               <div className="inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-green-500/20 text-green-400 hover:bg-green-500/30">
                 <CheckCircle className="mr-1 h-3 w-3" />
                 Complete
               </div>
            )}
            {quiz.status === 'failed' && (
              <div className="flex items-start text-destructive text-xs">
                <AlertCircle className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                <p className="leading-tight">{truncateError(quiz.error_message)}</p>
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};

// --- End of Inlined QuizList component ---

interface WorkspaceSidebarInternalsProps {
  workspaceId: string;
  handleOpenUploadDialog: (existingQuiz?: Quiz) => void;
  isLoadingSidebarData: boolean;
  sourcePdfsForWorkspace: string[];
  allQuizzesForWorkspace: Quiz[];
  handleQuizSelectionFromHistory: (quizId: string) => void;
  activeQuizDBEntryId?: string | null;
  toast: ReturnType<typeof useToast>['toast'];
}

const WorkspaceSidebarInternals: React.FC<WorkspaceSidebarInternalsProps> = ({
  workspaceId,
  handleOpenUploadDialog,
  isLoadingSidebarData,
  sourcePdfsForWorkspace,
  allQuizzesForWorkspace,
  handleQuizSelectionFromHistory,
  activeQuizDBEntryId,
  toast
}) => {
  const { state: sidebarState } = useSidebar();

  return (
    <>
      <SidebarHeader
        className={cn(
          "border-b flex items-center bg-sidebar text-sidebar-foreground",
          sidebarState === 'expanded'
            ? "p-3 justify-between flex-row"
            : "p-2 justify-center flex-col items-center gap-1",
          "transition-all duration-200"
        )}
        style={{ height: 'var(--app-header-height)' }}
      >
        <Cpu className={cn(
          "transition-all duration-200 text-sidebar-foreground",
            sidebarState === 'expanded' ? "h-6 w-6" : "hidden"
        )} />
        <CustomSidebarTrigger />
      </SidebarHeader>

      <SidebarContent className="p-0">
        <ScrollArea className="h-full">
            <Accordion type="multiple" defaultValue={["knowledge", "history"]} className="w-full px-3 py-2">

            <AccordionItem value="knowledge">
                <AccordionTrigger
                  className={cn(
                    "text-base hover:no-underline w-full",
                    sidebarState === 'collapsed' && "justify-center py-2 px-1.5 [&>svg.lucide-chevron-down]:hidden"
                  )}
                >
                    <div className={cn("flex items-center w-full", sidebarState === 'collapsed' && "justify-center")}>
                        <FolderOpen className={cn("text-primary/80", sidebarState === 'collapsed' ? "h-5 w-5" : "mr-2 h-5 w-5")} />
                        {sidebarState === 'expanded' && <span className="ml-2">Knowledge</span>}
                    </div>
                </AccordionTrigger>

                {sidebarState === 'expanded' && (
                    <AccordionContent className="pl-1 pt-1 pb-0">
                        <Button variant="ghost" size="sm" className="w-full justify-start mb-2 text-primary" onClick={() => handleOpenUploadDialog()}>
                            <PlusCircle className="mr-2 h-4 w-4"/>
                            Generate New Quiz
                        </Button>
                        {isLoadingSidebarData ? <Loader2 className="mx-auto my-4 h-6 w-6 animate-spin text-muted-foreground" /> :
                        sourcePdfsForWorkspace.length > 0 ?
                        <SourceFileList pdfNames={sourcePdfsForWorkspace} isCollapsed={false} /> :
                        <p className="text-xs text-muted-foreground px-2 py-1">No PDFs uploaded yet.</p>
                        }
                    </AccordionContent>
                 )}
            </AccordionItem>

            <AccordionItem value="history" className="border-b-0">
                <AccordionTrigger
                  className={cn(
                    "text-base hover:no-underline w-full",
                    sidebarState === 'collapsed' && "justify-center py-2 px-1.5 [&>svg.lucide-chevron-down]:hidden"
                  )}
                >
                     <div className={cn("flex items-center w-full", sidebarState === 'collapsed' && "justify-center")}>
                        <ListChecks className={cn("text-primary/80", sidebarState === 'collapsed' ? "h-5 w-5" : "mr-2 h-5 w-5")} />
                        {sidebarState === 'expanded' && <span className="ml-2">History</span>}
                    </div>
                </AccordionTrigger>
                {sidebarState === 'expanded' && (
                    <AccordionContent className="pl-1 pt-1 pb-0">
                        {isLoadingSidebarData ? <Loader2 className="mx-auto my-4 h-6 w-6 animate-spin text-muted-foreground" /> :
                        allQuizzesForWorkspace.length > 0 ? (
                            <QuizList
                                initialQuizzes={allQuizzesForWorkspace}
                                onQuizSelect={handleQuizSelectionFromHistory}
                                selectedQuizId={activeQuizDBEntryId}
                            />
                        ) : <p className="text-xs text-muted-foreground px-2 py-1">No quizzes generated yet.</p>
                        }
                    </AccordionContent>
                )}
            </AccordionItem>
            </Accordion>
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t">
        <Button
            variant="ghost"
            asChild
            className={cn("w-full", sidebarState === 'collapsed' ? "justify-center p-1.5 h-auto" : "justify-start")}
        >
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`/dashboard/workspace/${workspaceId}/settings`} onClick={(e) => { e.preventDefault(); toast({title: "Coming Soon", description: "Workspace settings are not yet implemented."})}}>
                    <Settings className={cn(sidebarState === 'collapsed' ? "h-5 w-5" : "mr-2 h-4 w-4")} />
                    {sidebarState === 'expanded' && <span>Settings</span>}
                </Link>
              </TooltipTrigger>
              {sidebarState === 'collapsed' && (
                <TooltipContent side="right" align="center">
                  <p>Settings</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </Button>
      </SidebarFooter>
    </>
  );
};


interface WorkspacePageContentProps {
  initialWorkspace: Workspace;
}

const WorkspacePageContent: React.FC<WorkspacePageContentProps> = ({ initialWorkspace }) => {
  const { open: sidebarOpen, state: sidebarState } = useSidebar();
  const workspaceId = initialWorkspace.id;
  const [workspace, setWorkspace] = useState<Workspace | null>(initialWorkspace);

  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("empty_state");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [activeQuizDBEntry, setActiveQuizDBEntry] = useState<Quiz | null>(null);
  const [activeQuizDisplayData, setActiveQuizDisplayData] = useState<StoredQuizData | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswers | null>(null);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [allQuizzesForWorkspace, setAllQuizzesForWorkspace] = useState<Quiz[]>([]);
  const [sourcePdfsForWorkspace, setSourcePdfsForWorkspace] = useState<string[]>([]);
  const [isLoadingSidebarData, setIsLoadingSidebarData] = useState(false);
  const [showRegenerateButtonInMain, setShowRegenerateButtonInMain] = useState(false);
  const [canShowAnswers, setCanShowAnswers] = useState(false); // <-- New state for answer visibility
  const rightPaneContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWorkspace(initialWorkspace);
    setViewMode("empty_state");
    setActiveQuizDBEntry(null);
    setActiveQuizDisplayData(null);
  }, [initialWorkspace]);


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
    if (workspace) {
        fetchSidebarQuizzes();
    }
  }, [workspaceId, workspace, toast]);


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
    setActiveQuizDBEntry(existingQuiz || null);
    setIsUploadDialogOpen(true);
  };

  const handleQuizGenerationComplete = async (quizId: string) => {
    setIsUploadDialogOpen(false);
    setViewMode("loading_quiz_data");
    setIsGeneratingQuiz(false);

    try {
      // Logic changed: Don't refresh the whole sidebar.
      // Fetch just the new quiz to set it as active.
      const allQuizzes = await getQuizzesForWorkspace(workspaceId);
      const generatedQuiz = allQuizzes.find(q => q.id === quizId);
      
      // Also update the source file list in the "Knowledge" tab
      const pdfNames = Array.from(new Set(allQuizzes.map(q => q.pdf_name).filter(Boolean as (value: string | null) => value is string)));
      setSourcePdfsForWorkspace(pdfNames);

      if (generatedQuiz && generatedQuiz.generated_quiz_data && generatedQuiz.status === 'completed') {
        setActiveQuizDBEntry(generatedQuiz);
        setActiveQuizDisplayData(generatedQuiz.generated_quiz_data as StoredQuizData);
        setShowRegenerateButtonInMain(true);
        setCanShowAnswers(false); // <-- Hide answers for new quiz review
        setViewMode("quiz_review");
      } else if (generatedQuiz && generatedQuiz.status === 'failed') {
        toast({ title: "Quiz Generation Failed", description: generatedQuiz.error_message || "The AI failed to generate the quiz.", variant: "destructive" });
        setActiveQuizDBEntry(generatedQuiz);
        setActiveQuizDisplayData(null);
        setShowRegenerateButtonInMain(true);
        setCanShowAnswers(false);
        setViewMode("quiz_review");
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
    if (refresh) {
      refreshSidebarData();
    }
  };

  const handleQuizSelectionFromHistory = (quizId: string) => {
    const selectedQuiz = allQuizzesForWorkspace.find(q => q.id === quizId);

    if (selectedQuiz) {
      if (selectedQuiz.status === 'completed' && selectedQuiz.generated_quiz_data) {
        setActiveQuizDBEntry(selectedQuiz);
        setActiveQuizDisplayData(selectedQuiz.generated_quiz_data as StoredQuizData);
        setCanShowAnswers(true); // <-- Show answers for historical quizzes
        const sortedQuizzes = [...allQuizzesForWorkspace].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setShowRegenerateButtonInMain(sortedQuizzes.length > 0 && sortedQuizzes[0].id === selectedQuiz.id);
        setViewMode('quiz_review');
      } else if (selectedQuiz.status === 'failed') {
        setActiveQuizDBEntry(selectedQuiz);
        setActiveQuizDisplayData(null);
        setCanShowAnswers(true); // <-- Can also review failed quizzes with answers if needed
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
    if (activeQuizDBEntry) {
        handleOpenUploadDialog(activeQuizDBEntry);
    } else {
        toast({title: "Error", description: "No active quiz context for regeneration.", variant: "destructive"});
    }
  };

  const handleSubmitQuiz = (answers: UserAnswers) => {
    setIsSubmittingQuiz(true);
    setUserAnswers(answers);
    setCanShowAnswers(true); // <-- Show answers after submission
    setViewMode("quiz_results");
    refreshSidebarData(); // <-- Refresh history list AFTER submission
    setIsSubmittingQuiz(false);
  };

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
            <div className="mx-auto w-[85%]">
              <QuizReviewDisplay
                quizData={activeQuizDisplayData.quiz}
                quizName={activeQuizDBEntry.pdf_name || "Untitled Quiz"}
                showAnswers={canShowAnswers} 
              />
            </div>
        );
      case "quiz_taking":
        if (!activeQuizDisplayData || !activeQuizDBEntry) return <div className="p-8 text-center"><p>Quiz data not available for taking.</p></div>;
        return (
          <div className="mx-auto w-[85%]">
            <p className="text-sm text-muted-foreground mb-6 text-center">
                Select the best answer for each question.
            </p>
            <QuizTakerForm
              quiz={activeQuizDBEntry}
              quizData={activeQuizDisplayData.quiz}
              onSubmit={handleSubmitQuiz}
              isSubmitting={isSubmittingQuiz}
            />
          </div>
        );
      case "quiz_results":
        if (!activeQuizDisplayData || !userAnswers || !activeQuizDBEntry) return <div className="p-8 text-center"><p>Quiz results not available.</p></div>;
        return (
            <div className="mx-auto w-[85%]">
              <QuizResultsDisplay
                quiz={activeQuizDBEntry}
                quizData={activeQuizDisplayData.quiz}
                userAnswers={userAnswers}
                onRetake={() => {
                  setUserAnswers(null);
                  setCanShowAnswers(false); // Hide answers for retake
                  setViewMode("quiz_taking");
                }}
                onReviewAll={() => {
                  setCanShowAnswers(true); // Ensure answers are shown for review
                  setViewMode("quiz_review");
                }}
              />
            </div>
        );
      case "empty_state":
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <LayoutDashboard className="h-20 w-20 text-muted-foreground/50 mb-6" data-ai-hint="dashboard illustration" />
            <h2 className="text-2xl mb-2">Welcome to {workspace?.name}</h2>
            <p className="text-muted-foreground max-w-md">
              { sidebarState === 'collapsed'
                ? "Open the sidebar to navigate or generate quizzes."
                : "Select an item from the sidebar to get started. You can generate new quizzes from PDFs under \"Knowledge\" or review past quizzes under \"History\"."
              }
            </p>
          </div>
        );
    }
  };

  const showActionButtonsFooterRightPane =
    (viewMode === 'quiz_review' && activeQuizDBEntry && (activeQuizDBEntry.status === 'completed' || activeQuizDBEntry.status === 'failed')) ||
    (viewMode === 'quiz_results' && activeQuizDBEntry);

  const dynamicHeaderLeftOffset = sidebarState === 'expanded' ? 'var(--sidebar-width-expanded)' : 'var(--sidebar-width-collapsed)';

  return (
    <div className="flex flex-col h-screen bg-background">
      <header
        className="fixed top-0 z-40 flex items-center justify-end px-4 border-b bg-background border-border transition-all duration-200"
        style={{
          height: 'var(--app-header-height)',
          left: dynamicHeaderLeftOffset,
          right: 0
        }}
      >
        <div className="bg-muted text-muted-foreground rounded-full h-8 w-8 flex items-center justify-center text-sm font-medium">
          FE
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar className="fixed top-0 left-0 h-full z-50 border-r" collapsible="icon">
          <WorkspaceSidebarInternals
            workspaceId={workspaceId}
            handleOpenUploadDialog={handleOpenUploadDialog}
            isLoadingSidebarData={isLoadingSidebarData}
            sourcePdfsForWorkspace={sourcePdfsForWorkspace}
            allQuizzesForWorkspace={allQuizzesForWorkspace}
            handleQuizSelectionFromHistory={handleQuizSelectionFromHistory}
            activeQuizDBEntryId={activeQuizDBEntry?.id}
            toast={toast}
          />
        </Sidebar>

        <SidebarInset
          className="flex flex-col flex-1 bg-background overflow-hidden transition-all duration-200"
          style={{
            marginLeft: dynamicHeaderLeftOffset,
            paddingTop: 'var(--app-header-height)'
          }}
        >
          <ScrollArea ref={rightPaneContentRef} className="flex-1 min-h-0">
            <div className="p-4 md:p-6">
              {viewMode !== 'empty_state' && (
                <div className="mb-6">
                  <h1 className="text-3xl font-bold font-headline mb-1">
                    {workspace?.name}
                  </h1>
                  {(viewMode === 'quiz_review' || viewMode === 'quiz_taking' || viewMode === 'quiz_results') && activeQuizDBEntry && (
                    <p className="text-md text-muted-foreground mt-1">
                      {viewMode === 'quiz_review' && `Reviewing: ${activeQuizDBEntry.pdf_name || 'Untitled Quiz'}`}
                      {viewMode === 'quiz_taking' && `Taking Quiz: ${activeQuizDBEntry.pdf_name || 'Untitled Quiz'}`}
                      {viewMode === 'quiz_results' && `Results for: ${activeQuizDBEntry.pdf_name || 'Untitled Quiz'}`}
                    </p>
                  )}
                </div>
              )}
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
                  <Button variant="outline" onClick={() => { setCanShowAnswers(true); setViewMode("quiz_review"); }}>
                      <ListChecks className="mr-2 h-4 w-4" /> Review All
                  </Button>
                  <Button onClick={() => {setUserAnswers(null); setCanShowAnswers(false); setViewMode("quiz_taking"); }}>
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
        existingQuizIdToUpdate={activeQuizDBEntry?.id}
        initialPdfNameHint={activeQuizDBEntry?.pdf_name || undefined}
      />
    </div>
  );
}


type ViewMode = "empty_state" | "quiz_review" | "quiz_taking" | "quiz_results" | "loading_quiz_data";

// Wrapper for initial data fetching and SidebarProvider
export default function WorkspacePageWrapper() {
  const routeParams = useParams();
  const workspaceId = routeParams.workspaceId as string;
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [errorPage, setErrorPage] = useState<string | null>(null);

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

  return (
    <SidebarProvider defaultOpen={true}>
      <WorkspacePageContent initialWorkspace={workspace} />
    </SidebarProvider>
  );
}
