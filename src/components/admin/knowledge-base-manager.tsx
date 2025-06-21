
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { uploadKnowledgeBaseFile, deleteKnowledgeBaseFile } from "@/lib/actions/knowledge.actions";
import type { KnowledgeBaseFile } from "@/types/supabase";
import { FileUp, Loader2, FileText, Trash2, PlusCircle, AlertTriangle } from "lucide-react";
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

export function KnowledgeBaseManager({ initialFiles }: { initialFiles: KnowledgeBaseFile[] }) {
  const [files, setFiles] = useState(initialFiles);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        toast({ title: "Invalid File Type", description: "Only PDF files are allowed.", variant: "destructive" });
        return;
      }
      setFileToUpload(selectedFile);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload) {
      toast({ title: "No File", description: "Please select a file to upload.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", fileToUpload);

    try {
      const newFile = await uploadKnowledgeBaseFile(formData);
      setFiles((prev) => [newFile, ...prev]);
      toast({ title: "Success", description: `"${newFile.file_name}" uploaded successfully.` });
      setIsUploadDialogOpen(false);
      setFileToUpload(null);
    } catch (error) {
      toast({ title: "Upload Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    try {
      await deleteKnowledgeBaseFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      toast({ title: "File Deleted", description: `"${fileName}" has been removed from the knowledge base.` });
    } catch (error) {
      toast({ title: "Deletion Failed", description: (error as Error).message, variant: "destructive" });
    }
  };

  return (
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
                <DialogDescription>Select a PDF to add to the global knowledge base.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUploadSubmit}>
                <div className="grid gap-4 py-4">
                  <Label htmlFor="file-upload">PDF Document</Label>
                  <Input id="file-upload" type="file" accept="application/pdf" onChange={handleFileChange} />
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
          {files.length > 0 ? (
            <ul className="divide-y">
              {files.map((file) => (
                <li key={file.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{file.file_name}</span>
                  </div>
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
                          This will permanently delete the file &quot;{file.file_name}&quot; from the knowledge base. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(file.id, file.file_name)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-center text-muted-foreground">No files in the knowledge base.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
