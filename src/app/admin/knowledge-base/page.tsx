
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { KnowledgeBaseManager } from "@/components/admin/knowledge-base-manager";
import { listKnowledgeBaseDocuments } from "@/lib/actions/knowledge.actions";
import { cookies } from "next/headers";

export default async function AdminKnowledgeBasePage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin');
  
  if (rpcError || !isAdmin) {
     return (
        <Alert variant="destructive" className="max-w-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to view this page.
            {rpcError && ` (Error: ${rpcError.message})`}
          </AlertDescription>
        </Alert>
    );
  }

  const initialDocuments = await listKnowledgeBaseDocuments();

  return (
    <div className="w-full">
      <KnowledgeBaseManager initialDocuments={initialDocuments} />
    </div>
  );
}
