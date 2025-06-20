
"use client";

import { getWorkspaceById } from "@/lib/actions/workspace.actions";
import type { Workspace, Quiz, StoredQuizData, UserAnswers } from "@/types/supabase";
import { useEffect, useState, type ReactNode, useRef, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Loader2, AlertCircle, FileText, Wand2, ListChecks, Settings, BookOpen,
  RefreshCw, Send, Inbox, FolderOpen, PlusCircle, LayoutDashboard,
  Cpu, PanelLeftClose, PanelRightOpen, CheckCircle, MoreVertical, Trash2, Edit3,
  Award, AlertTriangleIcon, ChevronDown, ChevronUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UploadQuizDialog } from "@/components/dashboard/upload-quiz-dialog";
import { QuizReviewDisplay } from "@/components/dashboard/quiz-review-display";
import { QuizTakerForm } from "@/components/dashboard/quiz-taker-form";
import { QuizResultsDisplay } from "@/components/dashboard/quiz-results-display";
import { getQuizzesForWorkspace, deleteQuizAction, renameQuizAction, deleteQuizzesBySourcePdfAction, renameSourcePdfInQuizzesAction, updateQuizAttemptResultAction } from "@/lib/actions/quiz.actions";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RenameQuizDialog } from "@/components/dashboard/rename-quiz-dialog";
import { RenameSourceFileDialog } from "@/components/dashboard/rename-source-file-dialog";


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

interface QuizListProps {
  initialQuizzes: Quiz[];
  onQuizSelect: (quizId: string) => void;
  selectedQuizId?: string | null;
  onRenameQuiz: (quiz: Quiz) => void;
  onDeleteQuiz: (quizId: string) => void;
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
  selectedQuizId,
  onRenameQuiz,
  onDeleteQuiz,
}) => {
  const sortedQuizzes = [...initialQuizzes].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const [dropdownOpenItemId, setDropdownOpenItemId] = useState<string | null>(null);

  const getStatusBadge = (quiz: Quiz) => {
    const baseBadgeClass = "inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
    const iconClass = "mr-1 h-3 w-3";

    if (quiz.status === 'failed') { // Generation failed
      return (
        <div className={cn(baseBadgeClass, "border-transparent bg-red-500/20 text-red-400 hover:bg-red-500/30")}>
          <AlertCircle className={iconClass} /> Failed
        </div>
      );
    }
    if (quiz.status === 'processing' || quiz.status === 'pending') {
       return (
        <div className={cn(baseBadgeClass, "border-transparent bg-blue-500/20 text-blue-400 hover:bg-blue-500/30")}>
          <Loader2 className={cn(iconClass, "animate-spin")} /> {quiz.status.charAt(0).toUpperCase() + quiz.status.slice(1)}
        </div>
      );
    }
    // Status is 'completed' (generation succeeded)
    if (quiz.last_attempt_passed === true) {
      return (
        <div className={cn(baseBadgeClass, "border-transparent bg-green-500/20 text-green-400 hover:bg-green-500/30")}>
          <Award className={iconClass} /> Passed
        </div>
      );
    }
    if (quiz.last_attempt_passed === false) {
      return (
         <div className={cn(baseBadgeClass, "border-transparent bg-destructive/20 text-destructive hover:bg-destructive/30")}>
          <AlertTriangleIcon className={iconClass} /> Failed
        </div>
      );
    }
    // If completed but not taken or no passing score set for a conclusive Pass/Fail attempt status
    return (
      <div className={cn(baseBadgeClass, "border-transparent bg-green-500/20 text-green-400 hover:bg-green-500/30")}>
        <CheckCircle className={iconClass} /> Complete
      </div>
    );
  };


  return (
    <div className="flex flex-col space-y-1">
      {sortedQuizzes.map((quiz) => (
        <div 
            key={quiz.id} 
            className={cn(
                "group relative flex items-center justify-between p-2 rounded-md",
                selectedQuizId === quiz.id ? "bg-muted text-foreground" : "hover:bg-muted/50"
            )}
        >
            <button
                onClick={() => onQuizSelect(quiz.id)}
                className="flex-grow text-left flex flex-col overflow-hidden pr-2"
            >
                <div className="flex items-start w-full">
                    <FileText className="h-4 w-4 mt-0.5 mr-3 flex-shrink-0 text-muted-foreground" />
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium truncate">{quiz.pdf_name || "Untitled Quiz"}</p>
                        <p className="text-xs text-muted-foreground">
                        {quiz.num_questions || 'N/A'} questions • {formatDistanceToNow(new Date(quiz.created_at), { addSuffix: true })}
                        </p>
                    </div>
                </div>
                <div className="pl-[28px] mt-1.5">
                    {getStatusBadge(quiz)}
                     {quiz.status === 'failed' && quiz.error_message && ( // For generation errors specifically
                       <p className="text-xs text-destructive mt-0.5">{truncateError(quiz.error_message)}</p>
                     )}
                </div>
            </button>
            <DropdownMenu onOpenChange={(open) => setDropdownOpenItemId(open ? quiz.id : null)}>
                <DropdownMenuTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn(
                            "h-7 w-7 flex-shrink-0",
                            dropdownOpenItemId === quiz.id ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100"
                        )}
                        onClick={(e) => e.stopPropagation()} 
                    >
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Quiz options</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => onRenameQuiz(quiz)} disabled={quiz.status === 'processing'}>
                        <Edit3 className="mr-2 h-4 w-4" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onDeleteQuiz(quiz.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled={quiz.status === 'processing'}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      ))}
    </div>
  );
};


interface WorkspaceSidebarInternalsProps {
  workspaceId: string;
  handleOpenUploadDialog: (existingQuiz?: Quiz) => void;
  isLoadingSidebarData: boolean;
  sourcePdfsForWorkspace: string[];
  allQuizzesForWorkspace: Quiz[];
  handleQuizSelectionFromHistory: (quizId: string) => void;
  activeQuizDBEntryId?: string | null;
  toast: ReturnType<typeof useToast>['toast'];
  headerBorderVisible: boolean;
  onRenameQuiz: (quiz: Quiz) => void;
  onDeleteQuizConfirmation: (quizId: string) => void;
  onRenameSourceFile: (sourceFileName: string) => void;
  onDeleteSourceFileConfirmation: (sourceFileName: string) => void;
}

const WorkspaceSidebarInternals: React.FC<WorkspaceSidebarInternalsProps> = ({
  workspaceId,
  handleOpenUploadDialog,
  isLoadingSidebarData,
  sourcePdfsForWorkspace,
  allQuizzesForWorkspace,
  handleQuizSelectionFromHistory,
  activeQuizDBEntryId,
  toast,
  headerBorderVisible,
  onRenameQuiz,
  onDeleteQuizConfirmation,
  onRenameSourceFile,
  onDeleteSourceFileConfirmation,
}) => {
  const { state: sidebarState } = useSidebar();

  return (
    <>
      <SidebarHeader
        className={cn(
          "flex items-center bg-sidebar text-sidebar-foreground transition-colors duration-200",
          sidebarState === 'expanded'
            ? "p-3 justify-between flex-row"
            : "p-2 justify-center flex-col items-center gap-1",
          headerBorderVisible && "border-b border-border"
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
                        <SourceFileList 
                            pdfNames={sourcePdfsForWorkspace}
                            onRenameSourceFile={onRenameSourceFile}
                            onDeleteSourceFile={onDeleteSourceFileConfirmation}
                        /> :
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
                                onRenameQuiz={onRenameQuiz}
                                onDeleteQuiz={onDeleteQuizConfirmation}
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
  const { state: sidebarState } = useSidebar();
  const workspaceId = initialWorkspace.id;
  const [workspace, setWorkspace] = useState<Workspace | null>(initialWorkspace);
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("empty_state");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [activeQuizDBEntry, setActiveQuizDBEntry] = useState<Quiz | null>(null);
  const [activeQuizDisplayData, setActiveQuizDisplayData] = useState<StoredQuizData | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswers | null>(null);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [allQuizzesForWorkspace, setAllQuizzesForWorkspace] = useState<Quiz[]>([]);
  const [sourcePdfsForWorkspace, setSourcePdfsForWorkspace] = useState<string[]>([]);
  const [isLoadingSidebarData, setIsLoadingSidebarData] = useState(false);
  const [showRegenerateButtonInMain, setShowRegenerateButtonInMain] = useState(false);
  const [canShowAnswers, setCanShowAnswers] = useState(false);
  const [isQuizFromHistory, setIsQuizFromHistory] = useState(false);
  const [headerBorderVisible, setHeaderBorderVisible] = useState(false);
  const [quizToRename, setQuizToRename] = useState<Quiz | null>(null);
  const [isRenameQuizDialogOpen, setIsRenameQuizDialogOpen] = useState(false);
  const [quizToDeleteId, setQuizToDeleteId] = useState<string | null>(null);
  const [isDeletingQuiz, setIsDeletingQuiz] = useState(false);
  const rightPaneContentRef = useRef<HTMLDivElement>(null);

  const [sourceFileToRename, setSourceFileToRename] = useState<string | null>(null);
  const [isRenameSourceFileDialogOpen, setIsRenameSourceFileDialogOpen] = useState(false);
  const [sourceFileToDeleteName, setSourceFileToDeleteName] = useState<string | null>(null);
  const [isDeletingSourceFile, setIsDeletingSourceFile] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);


  const refreshSidebarData = useCallback(async () => {
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
  }, [workspaceId, toast]);

  useEffect(() => {
    setWorkspace(initialWorkspace);
    setViewMode("empty_state");
    setActiveQuizDBEntry(null);
    setActiveQuizDisplayData(null);
    setUserAnswers(null);
    setCanShowAnswers(false);
    setIsQuizFromHistory(false);
  }, [initialWorkspace]);

  useEffect(() => {
    if (workspace) {
        refreshSidebarData();
    }
  }, [workspace, refreshSidebarData]);

  useEffect(() => {
    rightPaneContentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [viewMode, activeQuizDisplayData, userAnswers]);

  const handleOpenUploadDialog = (existingQuiz?: Quiz) => {
    setActiveQuizDBEntry(existingQuiz || null); 
    setIsUploadDialogOpen(true);
  };

  const handleQuizGenerationComplete = async (quizId: string) => {
    setIsUploadDialogOpen(false);
    setViewMode("loading_quiz_data");
    setIsGeneratingQuiz(false); 
    try {
      // Fetch only the newly generated/updated quiz instead of all quizzes
      const allQuizzes = await getQuizzesForWorkspace(workspaceId); // still needed to get the single quiz
      const generatedQuiz = allQuizzes.find(q => q.id === quizId);
      
      const pdfNames = Array.from(new Set(allQuizzes.map(q => q.pdf_name).filter(Boolean as (value: string | null) => value is string)));
      setSourcePdfsForWorkspace(pdfNames); 

      if (generatedQuiz && generatedQuiz.generated_quiz_data && generatedQuiz.status === 'completed') {
        setActiveQuizDBEntry(generatedQuiz);
        setActiveQuizDisplayData(generatedQuiz.generated_quiz_data as StoredQuizData);
        setShowRegenerateButtonInMain(true); 
        setCanShowAnswers(false); 
        setIsQuizFromHistory(false); 
        setViewMode("quiz_review");
      } else if (generatedQuiz && generatedQuiz.status === 'failed') {
        toast({ title: "Quiz Generation Failed", description: generatedQuiz.error_message || "The AI failed to generate the quiz.", variant: "destructive" });
        setActiveQuizDBEntry(generatedQuiz);
        setActiveQuizDisplayData(null);
        setShowRegenerateButtonInMain(true); 
        setCanShowAnswers(false); 
        setIsQuizFromHistory(false);
        setViewMode("quiz_review"); 
      } else {
        toast({ title: "Error", description: "Could not load the generated quiz data.", variant: "destructive" });
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
        setCanShowAnswers(false);  
        setIsQuizFromHistory(true);
        setShowRegenerateButtonInMain(false); 
        setViewMode('quiz_review');
      } else if (selectedQuiz.status === 'failed') {
        setActiveQuizDBEntry(selectedQuiz);
        setActiveQuizDisplayData(null);
        setCanShowAnswers(false); 
        setIsQuizFromHistory(true);
        setShowRegenerateButtonInMain(false); 
        setViewMode('quiz_review');
      } else {
         toast({ title: "Still Processing", description: `Quiz (${selectedQuiz.pdf_name || 'Untitled'}) is processing. Please wait.`, variant: "default" });
      }
    } else {
      toast({ title: "Error", description: "Selected quiz not found.", variant: "destructive"});
    }
  };

  const handleTakeQuiz = () => {
    if (activeQuizDisplayData && activeQuizDBEntry?.status === 'completed') {
      setUserAnswers({}); 
      setCanShowAnswers(false); 
      setViewMode("quiz_taking");
    } else {
      toast({title: "Cannot take quiz", description: "The quiz is not available or has an issue.", variant: "destructive"});
    }
  };
  
  const handleRegenerateActiveQuiz = () => {
    if (activeQuizDBEntry) {
        handleOpenUploadDialog(activeQuizDBEntry);
    } else {
        toast({title: "Error", description: "No active quiz to regenerate.", variant: "destructive"});
    }
  };

  const handleSubmitQuiz = async (answers: UserAnswers) => {
    setIsSubmittingQuiz(true);
    setUserAnswers(answers);
    setCanShowAnswers(true);
    
    if (activeQuizDBEntry) {
        let score = 0;
        const quizData = activeQuizDBEntry.generated_quiz_data as StoredQuizData | null;
        if (quizData) {
            quizData.quiz.forEach((q, index) => {
                if (answers[index] === q.answer) {
                score++;
                }
            });
            const percentage = quizData.quiz.length > 0 ? Math.round((score / quizData.quiz.length) * 100) : 0;
            
            let passed = null;
            if (activeQuizDBEntry.passing_score_percentage !== null && activeQuizDBEntry.passing_score_percentage !== undefined) {
                passed = percentage >= activeQuizDBEntry.passing_score_percentage;
            }

            try {
                const updatedQuiz = await updateQuizAttemptResultAction(
                    activeQuizDBEntry.id,
                    percentage,
                    passed, 
                    activeQuizDBEntry.num_questions,
                    activeQuizDBEntry.passing_score_percentage
                );
                setActiveQuizDBEntry(updatedQuiz);
                if (!isQuizFromHistory) {
                    refreshSidebarData(); 
                } else {
                    // If it was from history, update just that item in the local state for immediate badge update
                    setAllQuizzesForWorkspace(prevQuizzes => 
                        prevQuizzes.map(q => q.id === updatedQuiz.id ? updatedQuiz : q)
                    );
                }
            } catch (error) {
                toast({ title: "Error Saving Attempt", description: (error as Error).message, variant: "destructive"});
            }
        }
    }
    
    setViewMode("quiz_results");
    setIsSubmittingQuiz(false);
  };

  const handleOpenRenameQuizDialog = (quiz: Quiz) => {
    setQuizToRename(quiz);
    setIsRenameQuizDialogOpen(true);
  };

  const handleQuizRenamed = () => {
    refreshSidebarData(); 
    if (activeQuizDBEntry && quizToRename && activeQuizDBEntry.id === quizToRename.id) {
      setActiveQuizDBEntry(prev => prev ? {...prev, pdf_name: quizToRename.pdf_name } : null);
    }
    setQuizToRename(null);
  };

  const handleDeleteQuizConfirmation = (quizId: string) => {
    setQuizToDeleteId(quizId);
  };

  const confirmDeleteQuiz = async () => {
    if (!quizToDeleteId) return;
    setIsDeletingQuiz(true);
    try {
      await deleteQuizAction(quizToDeleteId);
      toast({ title: "Quiz Deleted", description: "The quiz has been successfully deleted." });
      
      if (activeQuizDBEntry && activeQuizDBEntry.id === quizToDeleteId) {
        setActiveQuizDBEntry(null);
        setActiveQuizDisplayData(null);
        setViewMode("empty_state");
      }
      setQuizToDeleteId(null); // Reset after operations
      refreshSidebarData(); // Refresh sidebar after deletion
    } catch (error) {
      toast({ title: "Error Deleting Quiz", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsDeletingQuiz(false);
    }
  };

  const handleOpenRenameSourceFileDialog = (sourceFileName: string) => {
    setSourceFileToRename(sourceFileName);
    setIsRenameSourceFileDialogOpen(true);
  };

  const handleSourceFileRenamed = async (oldName: string, newName: string) => {
    if (!workspaceId) return;
    try {
        await renameSourcePdfInQuizzesAction(workspaceId, oldName, newName);
        toast({ title: "Source File Renamed", description: `All quizzes associated with "${oldName}" are now associated with "${newName}".` });
        
        if (activeQuizDBEntry && activeQuizDBEntry.pdf_name === oldName) {
            setActiveQuizDBEntry(prev => prev ? { ...prev, pdf_name: newName } : null);
        }
        refreshSidebarData(); // Refresh sidebar after rename
    } catch (error) {
        toast({ title: "Error Renaming Source File", description: (error as Error).message, variant: "destructive" });
    }
    setSourceFileToRename(null); // Reset after operations
  };
  
  const handleDeleteSourceFileConfirmation = (sourceFileName: string) => {
    setSourceFileToDeleteName(sourceFileName);
  };

  const confirmDeleteSourceFile = async () => {
    if (!sourceFileToDeleteName || !workspaceId) return;
    setIsDeletingSourceFile(true);
    try {
      await deleteQuizzesBySourcePdfAction(workspaceId, sourceFileToDeleteName);
      toast({ title: "Source File Quizzes Deleted", description: `All quizzes associated with "${sourceFileToDeleteName}" have been deleted.` });
      
      if (activeQuizDBEntry && activeQuizDBEntry.pdf_name === sourceFileToDeleteName) {
        setActiveQuizDBEntry(null);
        setActiveQuizDisplayData(null);
        setViewMode("empty_state");
      }
      setSourceFileToDeleteName(null); // Reset after operations
      refreshSidebarData(); // Refresh sidebar after deletion
    } catch (error) {
      toast({ title: "Error Deleting Source File Quizzes", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsDeletingSourceFile(false);
    }
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
            <div className="mx-auto w-[80%]">
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
          <div className="mx-auto w-[80%]">
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
            <div className="mx-auto w-[80%]">
              <QuizResultsDisplay
                quiz={activeQuizDBEntry}
                quizData={activeQuizDisplayData.quiz}
                userAnswers={userAnswers}
                onRetake={() => {
                  setUserAnswers(null); 
                  setCanShowAnswers(false);
                  setIsQuizFromHistory(true); 
                  setViewMode("quiz_taking");
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
        className="fixed top-0 z-40 flex items-center justify-end px-4 bg-background transition-all duration-200"
        style={{
          height: 'var(--app-header-height)',
          left: dynamicHeaderLeftOffset,
          right: 0,
        }}
      >
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
            headerBorderVisible={headerBorderVisible}
            onRenameQuiz={handleOpenRenameQuizDialog}
            onDeleteQuizConfirmation={handleDeleteQuizConfirmation}
            onRenameSourceFile={handleOpenRenameSourceFileDialog}
            onDeleteSourceFileConfirmation={handleDeleteSourceFileConfirmation}
          />
        </Sidebar>

        <SidebarInset
          className="flex flex-col flex-1 bg-background overflow-hidden transition-all duration-200"
          style={{
            marginLeft: dynamicHeaderLeftOffset,
            paddingTop: 'var(--app-header-height)'
          }}
        >
          <ScrollArea 
            ref={rightPaneContentRef} 
            className="flex-1 min-h-0"
            onScroll={(event) => {
                setHeaderBorderVisible(event.currentTarget.scrollTop > 0);
            }}
          >
            <div className="p-4 md:p-6">
              {viewMode !== 'empty_state' && (
                <div className="mb-6 text-center">
                  <h1 className="text-3xl font-bold font-headline">
                    {workspace?.name} Quiz
                  </h1>
                </div>
              )}
              {renderRightPaneContent()}
            </div>
          </ScrollArea>

          {showActionButtonsFooterRightPane && activeQuizDBEntry && (
            <div className="p-4 flex justify-end space-x-3 flex-shrink-0">
              {viewMode === 'quiz_review' && activeQuizDBEntry.status === 'completed' && (
                <>
                  {showRegenerateButtonInMain && (
                    <Button variant="outline" onClick={handleRegenerateActiveQuiz}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Re-Generate
                    </Button>
                  )}
                  <Button onClick={handleTakeQuiz}>
                        <BookOpen className="mr-2 h-4 w-4" /> 
                        {isQuizFromHistory ? "Retake Quiz" : "Take Quiz"}
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
                  <Button onClick={() => {setUserAnswers(null); setCanShowAnswers(false); setIsQuizFromHistory(true); setViewMode("quiz_taking"); }}>
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
        initialPassingScore={activeQuizDBEntry?.passing_score_percentage}
        existingQuizIdToUpdate={activeQuizDBEntry?.id}
        initialPdfNameHint={activeQuizDBEntry?.pdf_name || undefined}
      />
      <RenameQuizDialog
        quiz={quizToRename}
        open={isRenameQuizDialogOpen}
        onOpenChange={setIsRenameQuizDialogOpen}
        onQuizRenamed={handleQuizRenamed}
      />
      <AlertDialog open={!!quizToDeleteId} onOpenChange={(open) => !open && setQuizToDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The quiz &quot;{allQuizzesForWorkspace.find(q => q.id === quizToDeleteId)?.pdf_name || 'Selected Quiz'}&quot; will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setQuizToDeleteId(null)} disabled={isDeletingQuiz}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteQuiz} disabled={isDeletingQuiz} className="bg-destructive hover:bg-destructive/90">
              {isDeletingQuiz ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isDeletingQuiz ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <RenameSourceFileDialog
        oldName={sourceFileToRename}
        open={isRenameSourceFileDialogOpen}
        onOpenChange={setIsRenameSourceFileDialogOpen}
        onSourceFileRenamed={handleSourceFileRenamed}
      />
       <AlertDialog open={!!sourceFileToDeleteName} onOpenChange={(open) => !open && setSourceFileToDeleteName(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete all quizzes related to this source file?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All quizzes associated with the source file &quot;{sourceFileToDeleteName}&quot; will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSourceFileToDeleteName(null)} disabled={isDeletingSourceFile}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSourceFile} disabled={isDeletingSourceFile} className="bg-destructive hover:bg-destructive/90">
              {isDeletingSourceFile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isDeletingSourceFile ? "Deleting..." : "Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type ViewMode = "empty_state" | "quiz_review" | "quiz_taking" | "quiz_results" | "loading_quiz_data";

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


    