import { createClient } from "@/lib/supabase/server"; // Updated import
import { cookies } from 'next/headers'; // Required for server client
import { getWorkspaceById } from "@/lib/actions/workspace.actions";
import { UploadQuizForm } from "@/components/dashboard/upload-quiz-form";
import { QuizList } from "@/components/dashboard/quiz-list";
import { getQuizzesForWorkspace } from "@/lib/actions/quiz.actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, FileText, ListChecks } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function WorkspacePage({ params }: { params: { workspaceId: string } }) {
  const supabase = createClient(); // Updated client creation

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <p className="text-destructive">You must be logged in to view this page.</p>;
  }

  const workspace = await getWorkspaceById(params.workspaceId);

  if (!workspace) {
    return (
      <div className="text-center py-10">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold">Workspace Not Found</h2>
        <p className="text-muted-foreground">The workspace you are looking for does not exist or you do not have permission to access it.</p>
        <Button asChild className="mt-4">
            <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const quizzes = await getQuizzesForWorkspace(params.workspaceId);

  return (
    <div className="space-y-8">
      <div className="animate-fade-in">
        <div className="mb-2">
          <Link href="/dashboard" className="text-sm text-primary hover:underline">
            &larr; Back to Workspaces
          </Link>
        </div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">{workspace.name}</h1>
        <p className="text-muted-foreground">Manage quizzes for this workspace.</p>
      </div>

      <Card className="shadow-lg animate-slide-in-up" style={{animationDelay: '0.2s'}}>
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><FileText className="mr-2 h-6 w-6 text-primary" />Generate New Quiz</CardTitle>
          <CardDescription>Upload a PDF document and specify the number of questions to generate a new quiz.</CardDescription>
        </CardHeader>
        <CardContent>
          <UploadQuizForm workspaceId={workspace.id} />
        </CardContent>
      </Card>
      
      <Separator />

      <div className="animate-slide-in-up" style={{animationDelay: '0.4s'}}>
        <h2 className="text-2xl font-bold font-headline mb-4 flex items-center"><ListChecks className="mr-2 h-6 w-6 text-primary"/>Generated Quizzes</h2>
        <QuizList initialQuizzes={quizzes} workspaceId={workspace.id}/>
      </div>
    </div>
  );
}
