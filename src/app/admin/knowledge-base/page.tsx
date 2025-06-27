
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { KnowledgeBaseManager } from "@/components/admin/knowledge-base-manager";
import { listKnowledgeBaseDocuments } from "@/lib/actions/knowledge.actions";
import type { KnowledgeBaseDocument } from "@/types/supabase";
import { useRouter } from "next/navigation";

export default function AdminKnowledgeBasePage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialDocuments, setInitialDocuments] = useState<KnowledgeBaseDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const checkUserAndPermissions = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      try {
        const { data: isAdminResult, error: rpcError } = await supabase.rpc('is_admin');
        if (rpcError) throw rpcError;

        setIsAdmin(isAdminResult);

        if (isAdminResult) {
          const docs = await listKnowledgeBaseDocuments();
          setInitialDocuments(docs);
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserAndPermissions();
  }, [supabase, router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full p-8 text-center">
        <div className="flex items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-4 text-lg text-muted-foreground">Loading Knowledge Base...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-lg">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Data</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (!isAdmin) {
     return (
        <Alert variant="destructive" className="max-w-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to view this page.
          </AlertDescription>
        </Alert>
    );
  }

  return (
    <div className="w-full">
      <KnowledgeBaseManager initialDocuments={initialDocuments} />
    </div>
  );
}
