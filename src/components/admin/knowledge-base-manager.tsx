
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { uploadKnowledgeBaseFile, deleteKnowledgeBaseDocument } from "@/lib/actions/knowledge.actions";
import type { KnowledgeBaseDocument } from "@/types/supabase";
import { FileUp, Loader2, FileText, Trash2, PlusCircle, AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RenameKnowledgeFileDialog } from "../dashboard/rename-knowledge-file-dialog";

export function KnowledgeBaseManager({ initialDocuments }: { initialDocuments: KnowledgeBaseDocument[] }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();
  const [docToRename, setDocToRename] = useState<KnowledgeBaseDocument | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        toast({ title: "Invalid File Type", description: "Only PDF files are allowed.", variant: "destructive" });
        return;
      }
      setFileToUpload(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload) {
      toast({ title: "No File", description: "Please select a file to upload.", variant: "destructive" });
      return;
    }
     if (!fileName.trim()) {
      toast({ title: "File Name Required", description: "Please provide a name for the file.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", fileToUpload);
    formData.append("fileName", fileName);
    formData.append("description", description);

    try {
      const newDoc = await uploadKnowledgeBaseFile(formData);
      setDocuments((prev) => [newDoc, ...prev]);
      toast({ title: "Success", description: `"${newDoc.file_name}" uploaded successfully.` });
      setIsUploadDialogOpen(false);
      setFileToUpload(null);
      setFileName("");
      setDescription("");
    } catch (error) {
      toast({ title: "Upload Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string, docName: string) => {
    try {
      await deleteKnowledgeBaseDocument(docId);
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
      toast({ title: "File Deleted", description: `"${docName}" has been removed from the knowledge base.` });
    } catch (error) {
      toast({ title: "Deletion Failed", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleRename = (doc: KnowledgeBaseDocument) => {
    setDocToRename(doc);
    setIsRenameDialogOpen(true);
  };

  const handleFileRenamed = () => {
    // Refresh the list from the server to get the latest data
    const refreshDocs = async () => {
        const { listKnowledgeBaseDocuments } = await import('@/lib/actions/knowledge.actions');
        const updatedDocs = await listKnowledgeBaseDocuments();
        setDocuments(updatedDocs);
    };
    refreshDocs();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Global Knowledge Base</CardTitle>
              <CardDescription>
                These files are available to all users for quiz generation.
              </CardDescription>
            </div>
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add File
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload New Knowledge File</DialogTitle>
                  <DialogDescription>Select a PDF and provide details to add it to the global knowledge base.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUploadSubmit}>
                  <div className="grid gap-4 py-4">
                    <div>
                      <Label htmlFor="file-upload">PDF Document</Label>
                      <Input id="file-upload" type="file" accept="application/pdf" onChange={handleFileChange} />
                    </div>
                     <div>
                      <Label htmlFor="file-name">File Name</Label>
                      <Input id="file-name" type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="User-friendly name for the document"/>
                    </div>
                     <div>
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A brief summary of the document content"/>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsUploadDialogOpen(false)} disabled={isUploading}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isUploading || !fileToUpload}>
                      {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Upload
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            {documents.length > 0 ? (
              <ul className="divide-y">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="truncate">
                        <span className="font-medium truncate block">{doc.file_name}</span>
                        {doc.description && <span className="text-xs text-muted-foreground truncate block">{doc.description}</span>}
                      </div>
                    </div>
                     <div className="flex items-center flex-shrink-0 ml-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRename(doc)}>
                          <FileUp className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center">
                                <AlertTriangle className="mr-2 h-5 w-5 text-destructive" /> Are you sure?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the file &quot;{doc.file_name}&quot; from the knowledge base. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(doc.id, doc.file_name)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                     </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-4 text-center text-muted-foreground">No files in the knowledge base.</p>
            )}
          </div>
        </CardContent>
      </Card>
      <RenameKnowledgeFileDialog 
        doc={docToRename} 
        open={isRenameDialogOpen} 
        onOpenChange={setIsRenameDialogOpen}
        onFileRenamed={handleFileRenamed}
      />
    </>
  );
}
