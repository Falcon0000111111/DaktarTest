
"use client";

import { getWorkspaceById } from "@/lib/actions/workspace.actions";
import type { Workspace, Quiz, StoredQuizData, UserAnswers, KnowledgeBaseDocument } from "@/types/supabase";
import { useEffect, useState, type ReactNode, useRef, useCallback, memo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Loader2, AlertCircle, FileText, Wand2, ListChecks, BookOpen,
  RefreshCw, Inbox, FolderOpen, PlusCircle, LayoutDashboard,
  Cpu, PanelLeftClose, PanelRightOpen, CheckCircle, MoreVertical, Trash2, Edit3,
  Award, AlertTriangleIcon, AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UploadQuizDialog } from "@/components/dashboard/upload-quiz-dialog";
import { QuizReviewDisplay } from "@/components/dashboard/quiz-review-display";
import { QuizTakerForm } from "@/components/dashboard/quiz-taker-form";
import { QuizResultsDisplay } from "@/components/dashboard/quiz-results-display";
import { getQuizzesForWorkspace, deleteQuizAction, renameQuizAction, updateQuizAttemptResultAction, getQuizById, renameQuizzesBySourcePdfAction } from "@/lib/actions/quiz.actions";
import { listKnowledgeBaseDocuments } from "@/lib/actions/knowledge.actions";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
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
import { useParams } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { useAdminStatus } from "@/hooks/use-admin-status";
import { Header } from "@/components/layout/header";

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
            "text-sidebar-foreground hover:bg-accent hover:text-sidebar-accent-foreground",
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

const MemoizedQuizList: React.FC<QuizListProps> = memo(({
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

    if (quiz.status === 'failed') { 
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
    if (quiz.status === 'completed') {
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
            <AlertTriangleIcon className={iconClass} /> Failed Attempt
            </div>
        );
        }
        return (
        <div className={cn(baseBadgeClass, "border-transparent bg-green-500/20 text-green-400 hover:bg-green-500/30")}>
            <CheckCircle className={iconClass} /> Complete
        </div>
        );
    }
    return null; 
  };


  return (
    <div className="flex flex-col space-y-1">
      {sortedQuizzes.map((quiz) => (
        <div 
            key={quiz.id} 
            className={cn(
                "group relative flex items-center justify-between p-2 rounded-md",
                selectedQuizId === quiz.id ? "bg-accent text-foreground" : "hover:bg-muted/50"
            )}
        >
            <button
                onClick={() => onQuizSelect(quiz.id)}
                className="flex-grow text-left flex flex-col overflow-hidden pr-2"
                disabled={quiz.status === 'processing' || quiz.status === 'pending'}
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
                     {quiz.status === 'failed' && quiz.error_message && ( 
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
                        disabled={quiz.status === 'processing'}
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
});
MemoizedQuizList.displayName = 'QuizList';

interface UsedKnowledgeDocumentsListProps {
  documents: { name: string }[];
  onRename: (name: string) => void;
}

const UsedKnowledgeDocumentsList: React.FC<UsedKnowledgeDocumentsListProps> = memo(({ documents, onRename }) => {
  const [dropdownOpenItemId, setDropdownOpenItemId] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      {documents.map(doc => (
        <div key={doc.name} className="group flex items-center p-2 rounded-md justify-between">
          <div className="flex items-center flex-1 overflow-hidden pr-2">
            <FileText className="h-4 w-4 mr-3 flex-shrink-0 text-muted-foreground" />
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate" title={doc.name}>{doc.name}</p>
            </div>
          </div>
          <DropdownMenu onOpenChange={(open) => setDropdownOpenItemId(open ? doc.name : null)}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "h-7 w-7 flex-shrink-0",
                  dropdownOpenItemId === doc.name ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100"
                )}
                onClick={(e) => e.stopPropagation()} 
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Source file options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onRename(doc.name)}>
                <Edit3 className="mr-2 h-4 w-4" /> Rename
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  );
});
UsedKnowledgeDocumentsList.displayName = 'UsedKnowledgeDocumentsList';


interface WorkspaceSidebarInternalsProps {
  workspaceId: string;
  handleOpenUploadDialog: (existingQuiz?: Quiz) => void;
  isLoadingSidebarData: boolean;
  allQuizzesForWorkspace: Quiz[];
  usedWorkspaceSourceNames: { name: string }[];
  handleQuizSelectionFromHistory: (quizId: string) => void;
  activeQuizDBEntryId?: string | null;
  toast: ReturnType<typeof useToast>['toast'];
  onRenameQuiz: (quiz: Quiz) => void;
  onDeleteQuizConfirmation: (quizId: string) => void;
  onRenameSourceFile: (name: string) => void;
}

const WorkspaceSidebarInternals: React.FC<WorkspaceSidebarInternalsProps> = ({
  workspaceId,
  handleOpenUploadDialog,
  isLoadingSidebarData,
  allQuizzesForWorkspace,
  usedWorkspaceSourceNames,
  handleQuizSelectionFromHistory,
  activeQuizDBEntryId,
  toast,
  onRenameQuiz,
  onDeleteQuizConfirmation,
  onRenameSourceFile,
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
        )}
        style={{ height: 'var(--header-height)' }}
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
                        <BookOpen className={cn("text-primary/80", sidebarState === 'collapsed' ? "h-5 w-5" : "mr-2 h-5 w-5")} />
                        {sidebarState === 'expanded' && <span className="ml-2">Knowledge Base</span>}
                    </div>
                </AccordionTrigger>
                {sidebarState === 'expanded' && (
                    <AccordionContent className="pl-1 pt-1 pb-0">
                        <div className="space-y-2">
                            <Button variant="ghost" size="sm" className="w-full justify-start text-primary" onClick={() => handleOpenUploadDialog()}>
                                <Wand2 className="mr-2 h-4 w-4"/>
                                Generate New Quiz
                            </Button>
                            {usedWorkspaceSourceNames.length > 0 && <Separator className="my-1" />}
                            {usedWorkspaceSourceNames.length > 0 ? (
                              <>
                                <p className="text-xs font-semibold text-muted-foreground px-2 pt-2">Workspace Sources</p>
                                <UsedKnowledgeDocumentsList 
                                  documents={usedWorkspaceSourceNames} 
                                  onRename={onRenameSourceFile}
                                />
                              </>
                            ) : (
                              <p className="text-xs text-muted-foreground px-2 py-1">No sources used yet.</p>
                            )}
                        </div>
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
                            <MemoizedQuizList
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
    </>
  );
};


interface WorkspacePageContentProps {
  initialWorkspace: Workspace;
  initialQuizzes: Quiz[];
  initialKnowledgeDocuments: KnowledgeBaseDocument[];
}

const WorkspacePageContent: React.FC<WorkspacePageContentProps> = ({ initialWorkspace, initialQuizzes, initialKnowledgeDocuments }) => {
  const { open: isSidebarOpen } = useSidebar();
  const workspaceId = initialWorkspace.id;
  const { isAdmin } = useAdminStatus();
  const [workspace, setWorkspace] = useState<Workspace | null>(initialWorkspace);
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("empty_state");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [activeQuizDBEntry, setActiveQuizDBEntry] = useState<Quiz | null>(null);
  const [activeQuizDisplayData, setActiveQuizDisplayData] = useState<StoredQuizData | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswers | null>(null);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [allQuizzesForWorkspace, setAllQuizzesForWorkspace] = useState<Quiz[]>(initialQuizzes);
  const [allKnowledgeDocuments, setAllKnowledgeDocuments] = useState<KnowledgeBaseDocument[]>(initialKnowledgeDocuments);
  const [isLoadingSidebarData, setIsLoadingSidebarData] = useState(false);
  const [isLoadingActiveQuiz, setIsLoadingActiveQuiz] = useState(false);
  const [showRegenerateButtonInMain, setShowRegenerateButtonInMain] = useState(false);
  const [canShowAnswers, setCanShowAnswers] = useState(false);
  const [isQuizFromHistory, setIsQuizFromHistory] = useState(false);
  const [quizToRename, setQuizToRename] = useState<Quiz | null>(null);
  const [isRenameQuizDialogOpen, setIsRenameQuizDialogOpen] = useState(false);
  const [quizToDeleteId, setQuizToDeleteId] = useState<string | null>(null);
  const [isDeletingQuiz, setIsDeletingQuiz] = useState(false);
  const rightPaneContentRef = useRef<HTMLDivElement>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  
  const [sourceToRename, setSourceToRename] = useState<string | null>(null);
  const [isRenameSourceDialogOpen, setIsRenameSourceDialogOpen] = useState(false);


  const refreshAllData = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoadingSidebarData(true);
    try {
      const [quizzes, docs] = await Promise.all([
        getQuizzesForWorkspace(workspaceId),
        listKnowledgeBaseDocuments()
      ]);
      setAllQuizzesForWorkspace(quizzes);
      setAllKnowledgeDocuments(docs);
    } catch (error) {
      console.error("Error refreshing workspace data:", error);
      toast({ title: "Error refreshing workspace data", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoadingSidebarData(false);
    }
  }, [workspaceId, toast]);

  useEffect(() => {
    setWorkspace(initialWorkspace);
    setAllQuizzesForWorkspace(initialQuizzes);
    setAllKnowledgeDocuments(initialKnowledgeDocuments);
    setViewMode("empty_state");
    setActiveQuizDBEntry(null);
    setActiveQuizDisplayData(null);
    setUserAnswers(null);
    setCanShowAnswers(false);
    setIsQuizFromHistory(false);
  }, [initialWorkspace, initialQuizzes, initialKnowledgeDocuments]);


  useEffect(() => {
    rightPaneContentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [viewMode, activeQuizDisplayData, userAnswers]);

  const handleOpenUploadDialog = useCallback((existingQuiz?: Quiz) => {
    setActiveQuizDBEntry(existingQuiz || null); 
    setIsUploadDialogOpen(true);
  }, []);

  const handleQuizGenerationComplete = useCallback(async (generatedQuizId: string) => {
    setIsUploadDialogOpen(false);
    setViewMode("loading_quiz_data");
    setIsGeneratingQuiz(false); 
    setIsLoadingActiveQuiz(true);
    try {
      const fetchedQuiz = await getQuizById(generatedQuizId);
      
      if (fetchedQuiz && fetchedQuiz.generated_quiz_data && fetchedQuiz.status === 'completed') {
        setActiveQuizDBEntry(fetchedQuiz);
        setActiveQuizDisplayData(fetchedQuiz.generated_quiz_data as StoredQuizData);
        setShowRegenerateButtonInMain(true); 
        setCanShowAnswers(false); 
        setIsQuizFromHistory(false); 
        setViewMode("quiz_review");
      } else if (fetchedQuiz && fetchedQuiz.status === 'failed') {
        toast({ title: "Quiz Generation Failed", description: fetchedQuiz.error_message || "The AI failed to generate the quiz.", variant: "destructive" });
        setActiveQuizDBEntry(fetchedQuiz);
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
    } finally {
      setIsLoadingActiveQuiz(false);
      refreshAllData();
    }
  }, [toast, refreshAllData]);
  
  const handleUploadDialogClose = useCallback((refresh?: boolean) => {
    setIsUploadDialogOpen(false);
    setIsGeneratingQuiz(false);
    if (refresh) { 
      refreshAllData(); 
    }
  }, [refreshAllData]);

  const handleQuizSelectionFromHistory = useCallback(async (quizId: string) => {
    if (activeQuizDBEntry?.id === quizId) return;
    setViewMode("loading_quiz_data");
    setIsLoadingActiveQuiz(true);
    setShowRegenerateButtonInMain(false); 
    setCanShowAnswers(false);
    setIsQuizFromHistory(true);
    try {
        const selectedQuizFull = await getQuizById(quizId); 
        if (selectedQuizFull) {
            if (selectedQuizFull.status === 'completed' && selectedQuizFull.generated_quiz_data) {
                setActiveQuizDBEntry(selectedQuizFull);
                setActiveQuizDisplayData(selectedQuizFull.generated_quiz_data as StoredQuizData);
                setViewMode('quiz_review');
            } else if (selectedQuizFull.status === 'failed') {
                setActiveQuizDBEntry(selectedQuizFull);
                setActiveQuizDisplayData(null);
                setViewMode('quiz_review');
            } else {
                toast({ title: "Still Processing", description: `Quiz (${selectedQuizFull.pdf_name || 'Untitled'}) is processing. Please wait.`, variant: "default" });
                setViewMode("empty_state");
            }
        } else {
            toast({ title: "Error", description: "Selected quiz not found.", variant: "destructive"});
            setViewMode("empty_state");
        }
    } catch (error) {
        toast({ title: "Error loading quiz from history", description: (error as Error).message, variant: "destructive" });
        setViewMode("empty_state");
    } finally {
        setIsLoadingActiveQuiz(false);
    }
  }, [toast, activeQuizDBEntry]);

  const handleTakeQuiz = useCallback(() => {
    if (activeQuizDisplayData && activeQuizDBEntry?.status === 'completed') {
      setUserAnswers({}); 
      setCanShowAnswers(false); 
      setViewMode("quiz_taking");
    } else {
      toast({title: "Cannot take quiz", description: "The quiz is not available or has an issue.", variant: "destructive"});
    }
  }, [activeQuizDBEntry, activeQuizDisplayData, toast]);
  
  const handleRegenerateActiveQuiz = useCallback(() => {
    if (activeQuizDBEntry) {
        handleOpenUploadDialog(activeQuizDBEntry);
    } else {
        toast({title: "Error", description: "No active quiz to regenerate.", variant: "destructive"});
    }
  }, [activeQuizDBEntry, handleOpenUploadDialog, toast]);

  const handleSubmitQuiz = useCallback(async (answers: UserAnswers) => {
    setIsSubmittingQuiz(true);
    setUserAnswers(answers);
    
    let score = 0;
    let passedStatus: boolean | null = null;

    if (activeQuizDBEntry && activeQuizDBEntry.generated_quiz_data) {
        const quizData = activeQuizDBEntry.generated_quiz_data as StoredQuizData;
        if (quizData && quizData.quiz) {
            quizData.quiz.forEach((q, index) => {
                if (answers[index] === q.answer) {
                score++;
                }
            });
            const percentage = quizData.quiz.length > 0 ? Math.round((score / quizData.quiz.length) * 100) : 0;
            
            if (activeQuizDBEntry.passing_score_percentage !== null && activeQuizDBEntry.passing_score_percentage !== undefined) {
                passedStatus = percentage >= activeQuizDBEntry.passing_score_percentage;
            }

            try {
                const updatedQuizEntry = await updateQuizAttemptResultAction(
                    activeQuizDBEntry.id,
                    percentage,
                    passedStatus
                );
                setActiveQuizDBEntry(updatedQuizEntry); 
                
                if (!isQuizFromHistory) {
                    refreshAllData();
                } else {
                    setAllQuizzesForWorkspace(prevQuizzes => 
                        prevQuizzes.map(q => q.id === updatedQuizEntry.id ? updatedQuizEntry : q)
                    );
                }
            } catch (error) {
                toast({ title: "Error Saving Attempt", description: (error as Error).message, variant: "destructive"});
            }
        }
    }
    setCanShowAnswers(true);
    setViewMode("quiz_results");
    setIsSubmittingQuiz(false);
  }, [activeQuizDBEntry, isQuizFromHistory, refreshAllData, toast]);

  const handleOpenRenameQuizDialog = useCallback((quiz: Quiz) => {
    setQuizToRename(quiz);
    setIsRenameQuizDialogOpen(true);
  }, []);

  const handleQuizRenamed = useCallback(() => {
    refreshAllData(); 
    if (activeQuizDBEntry && quizToRename && activeQuizDBEntry.id === quizToRename.id) {
       const newName = (document.getElementById('quiz-name') as HTMLInputElement)?.value || quizToRename.pdf_name;
       setActiveQuizDBEntry(prev => prev ? {...prev, pdf_name: newName, updated_at: new Date().toISOString() } : null);
    }
    setQuizToRename(null);
  }, [activeQuizDBEntry, quizToRename, refreshAllData]);

  const handleDeleteQuizConfirmation = useCallback((quizId: string) => {
    setQuizToDeleteId(quizId);
  }, []);

  const confirmDeleteQuiz = useCallback(async () => {
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
      setQuizToDeleteId(null); 
      refreshAllData(); 
    } catch (error) {
      toast({ title: "Error Deleting Quiz", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsDeletingQuiz(false);
    }
  }, [quizToDeleteId, activeQuizDBEntry, refreshAllData, toast]);

  const handleRenameSourceFile = useCallback((name: string) => {
    setSourceToRename(name);
    setIsRenameSourceDialogOpen(true);
  }, []);

  const handleSourceFileRenamed = useCallback(() => {
    refreshAllData();
    setIsRenameSourceDialogOpen(false);
    setSourceToRename(null);
  }, [refreshAllData]);

  const renderRightPaneContent = () => {
    if (isLoadingActiveQuiz || (viewMode === "loading_quiz_data" && !activeQuizDBEntry)) {
        return (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Loading quiz data...</p>
          </div>
        );
    }
    switch (viewMode) {
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
              showAnswers={canShowAnswers} 
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
                  setCanShowAnswers(false);
                  setIsQuizFromHistory(true); 
                  setViewMode("quiz_taking");
                }}
              />
        );
      case "empty_state":
      default:
        const { state: sidebarState } = useSidebar();
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <LayoutDashboard className="h-20 w-20 text-muted-foreground/50 mb-6" data-ai-hint="dashboard illustration" />
            <h2 className="text-2xl mb-2">Welcome to {workspace?.name}</h2>
            <p className="text-muted-foreground max-w-md">
              { sidebarState === 'collapsed'
                ? "Open the sidebar to navigate or generate quizzes."
                : "Select an item from the sidebar to get started. You can generate new quizzes from the global Knowledge Base or review past quizzes under \"History\"."
              }
            </p>
          </div>
        );
    }
  };

  const showActionButtonsFooterRightPane =
    (viewMode === 'quiz_review' && activeQuizDBEntry && (activeQuizDBEntry.status === 'completed' || activeQuizDBEntry.status === 'failed')) ||
    (viewMode === 'quiz_results' && activeQuizDBEntry);

  const usedWorkspaceSourceNames = Array.from(new Set(allQuizzesForWorkspace
      .map(q => q.pdf_name)
      .filter((name): name is string => !!name)
  )).map(name => ({ name }));

  return (
    <div className="flex h-full bg-background">
      <Sidebar className="h-full border-r" collapsible="icon">
        <WorkspaceSidebarInternals
          workspaceId={workspaceId}
          handleOpenUploadDialog={handleOpenUploadDialog}
          isLoadingSidebarData={isLoadingSidebarData}
          allQuizzesForWorkspace={allQuizzesForWorkspace}
          usedWorkspaceSourceNames={usedWorkspaceSourceNames}
          handleQuizSelectionFromHistory={handleQuizSelectionFromHistory}
          activeQuizDBEntryId={activeQuizDBEntry?.id}
          toast={toast}
          onRenameQuiz={handleOpenRenameQuizDialog}
          onDeleteQuizConfirmation={handleDeleteQuizConfirmation}
          onRenameSourceFile={handleRenameSourceFile}
        />
      </Sidebar>

      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <Header workspaceName={workspace?.name} isSidebarOpen={isSidebarOpen} />
        <main className="flex-1 flex flex-col">
            <ScrollArea 
                ref={rightPaneContentRef} 
                className="flex-1 min-h-0"
            >
                <div className="p-4 md:p-6">
                {renderRightPaneContent()}
                </div>
            </ScrollArea>
             {showActionButtonsFooterRightPane && activeQuizDBEntry && (
                <div className="p-4 flex justify-end space-x-3 flex-shrink-0 bg-transparent">
                {viewMode === 'quiz_review' && activeQuizDBEntry.status === 'completed' && (
                    <>
                    {showRegenerateButtonInMain && (
                        <Button variant="outline" onClick={handleRegenerateActiveQuiz} disabled={isLoadingActiveQuiz}>
                            <RefreshCw className="mr-2 h-4 w-4" /> Re-Generate
                        </Button>
                    )}
                    <Button onClick={handleTakeQuiz} disabled={isLoadingActiveQuiz}>
                            <BookOpen className="mr-2 h-4 w-4" /> 
                            {isQuizFromHistory ? "Retake Quiz" : "Take Quiz"}
                    </Button>
                    </>
                )}
                {viewMode === 'quiz_review' && activeQuizDBEntry.status === 'failed' && showRegenerateButtonInMain && (
                    <Button onClick={handleRegenerateActiveQuiz} disabled={isLoadingActiveQuiz}>
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
        </main>
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
        knowledgeFiles={allKnowledgeDocuments}
      />
      <RenameQuizDialog
        quiz={quizToRename}
        open={isRenameQuizDialogOpen}
        onOpenChange={setIsRenameQuizDialogOpen}
        onQuizRenamed={handleQuizRenamed}
      />
       <RenameSourceFileDialog
        workspaceId={workspaceId}
        oldName={sourceToRename}
        open={isRenameSourceDialogOpen}
        onOpenChange={setIsRenameSourceDialogOpen}
        onSourceFileRenamed={handleSourceFileRenamed}
      />
      <AlertDialog open={!!quizToDeleteId} onOpenChange={(open) => !open && setQuizToDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the quiz &quot;{allQuizzesForWorkspace.find(q => q.id === quizToDeleteId)?.pdf_name || 'Selected Quiz'}&quot;.
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
    </div>
  );
}

type ViewMode = "empty_state" | "quiz_review" | "quiz_taking" | "quiz_results" | "loading_quiz_data";

export default function WorkspacePageWrapper() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [initialQuizzes, setInitialQuizzes] = useState<Quiz[]>([]);
  const [initialKnowledgeDocuments, setInitialKnowledgeDocuments] = useState<KnowledgeBaseDocument[]>([]);
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
        const [ws, quizzes, docs] = await Promise.all([
            getWorkspaceById(workspaceId),
            getQuizzesForWorkspace(workspaceId),
            listKnowledgeBaseDocuments() // Now global
        ]);
        
        if (!ws) {
          setErrorPage("Workspace not found or access denied.");
          setWorkspace(null);
        } else {
          setWorkspace(ws);
          setInitialQuizzes(quizzes);
          setInitialKnowledgeDocuments(docs);
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
      <WorkspacePageContent initialWorkspace={workspace} initialQuizzes={initialQuizzes} initialKnowledgeDocuments={initialKnowledgeDocuments} />
    </SidebarProvider>
  );
}
