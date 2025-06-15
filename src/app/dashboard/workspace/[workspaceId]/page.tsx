
"use client";

import { createClient } from "@/lib/supabase/client";
import { getWorkspaceById } from "@/lib/actions/workspace.actions";
import type { Workspace } from "@/types/supabase";
import { use, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, FileText, Wand2, ListChecks, PlayCircle, SettingsIcon as Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface DashboardActionCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  onClick?: () => void; // Placeholder for future actions
}

const DashboardActionCard = ({ title, description, icon, onClick }: DashboardActionCardProps) => (
  <Card className="hover:shadow-lg transition-shadow duration-200 flex flex-col">
    <CardHeader className="items-center text-center">
      {icon}
      <CardTitle className="font-headline text-xl mt-2">{title}</CardTitle>
    </CardHeader>
    <CardContent className="text-center flex-grow">
      <p className="text-sm text-muted-foreground">{description}</p>
    </CardContent>
    <CardFooter className="justify-center pt-4">
      <Button variant="outline" onClick={onClick} className="w-full sm:w-auto">
        Go
      </Button>
    </CardFooter>
  </Card>
);

export default function WorkspacePage({ params: paramsProp }: { params: { workspaceId: string } }) {
  const resolvedParams = use(paramsProp as any); 
  const { workspaceId } = resolvedParams;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast(); // if needed for card actions later

  useEffect(() => {
    const fetchWorkspaceData = async () => {
      if (!workspaceId) {
        setError("Workspace ID is not available.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const ws = await getWorkspaceById(workspaceId);
        if (!ws) {
          setError("Workspace not found or access denied.");
          setWorkspace(null);
        } else {
          setWorkspace(ws);
        }
      } catch (e) {
        setError((e as Error).message);
        console.error("Error fetching workspace data:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchWorkspaceData();
  }, [workspaceId]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading workspace dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 animate-fade-in">
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

  // Placeholder actions for cards
  const handleCardClick = (action: string) => {
    toast({ title: "Action Clicked", description: `${action} card was clicked. Implement action.` });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10 text-foreground bg-background">
      <div className="w-full max-w-5xl text-center">
        <Button asChild variant="link" className="mb-4 text-sm text-primary self-start ml-[-0.5rem] md:ml-0">
            <Link href="/dashboard">← All Workspaces</Link>
        </Button>
        <h1 className="text-3xl md:text-4xl font-bold font-headline mb-8 md:mb-12">
          {workspace.name} Dashboard
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          <DashboardActionCard 
            title="View Source PDF" 
            description="Review the original document for this workspace." 
            icon={<FileText className="h-8 w-8 mb-2 text-primary" />} 
            onClick={() => handleCardClick("View Source PDF")}
          />
          <DashboardActionCard 
            title="Generate New Quiz" 
            description="Create a fresh set of questions from a PDF." 
            icon={<Wand2 className="h-8 w-8 mb-2 text-primary" />} 
            onClick={() => handleCardClick("Generate New Quiz")}
          />
          <DashboardActionCard 
            title="Review Quizzes" 
            description="Look over and manage previously generated quizzes." 
            icon={<ListChecks className="h-8 w-8 mb-2 text-primary" />} 
            onClick={() => handleCardClick("Review Quizzes")}
          />
          <DashboardActionCard 
            title="Practice Quiz" 
            description="Test your knowledge with an existing quiz." 
            icon={<PlayCircle className="h-8 w-8 mb-2 text-primary" />} 
            onClick={() => handleCardClick("Practice Quiz")}
          />
           <DashboardActionCard 
            title="Flashcards" 
            description="Study with AI-generated flashcards." 
            icon={<div className="text-primary h-8 w-8 mb-2 flex items-center justify-center text-2xl font-bold">F</div>}  // Simple F for flashcards
            onClick={() => handleCardClick("Flashcards")}
          />
          <DashboardActionCard 
            title="Workspace Settings" 
            description="Manage settings and options for this workspace." 
            icon={<Settings className="h-8 w-8 mb-2 text-primary" />} 
            onClick={() => handleCardClick("Workspace Settings")}
          />
        </div>
      </div>
    </div>
  );
}
