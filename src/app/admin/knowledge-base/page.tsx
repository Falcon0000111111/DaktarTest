
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { KnowledgeBaseManager } from "@/components/admin/knowledge-base-manager";
import { listKnowledgeBaseDocuments } from "@/lib/actions/knowledge.actions";
import { Header } from "@/components/layout/header";

export default async function AdminKnowledgeBasePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin');
  
  if (rpcError || !isAdmin) {
     return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center p-4">
          <Alert variant="destructive" className="max-w-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You do not have permission to view this page.
              {rpcError && ` (Error: ${rpcError.message})`}
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  const initialDocuments = await listKnowledgeBaseDocuments();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 p-4 md:p-8">
        <KnowledgeBaseManager initialDocuments={initialDocuments} />
      </main>
    </div>
  );
}
