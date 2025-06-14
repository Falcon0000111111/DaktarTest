
import { createClient } from "@/lib/supabase/server";
import { FileText } from "lucide-react";

export default async function DashboardPage() {
  const supabase = createClient(); 

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // This should ideally be handled by middleware, but as a fallback:
    return <p>You need to be logged in to view this page.</p>;
  }

  // The main content for the dashboard when no workspace is selected
  return (
    <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in p-8">
      <FileText className="h-24 w-24 text-primary mb-6" data-ai-hint="document file" />
      <h1 className="text-3xl font-bold font-headline mb-2">Select a Workspace</h1>
      <p className="text-muted-foreground max-w-md">
        Choose a workspace from the sidebar to view your documents and quizzes, 
        or create a new workspace to get started.
      </p>
    </div>
  );
}
