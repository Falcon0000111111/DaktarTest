
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
import { FileUp, Loader2, FileText, Trash2, PlusCircle, AlertTriangle, X, Edit } from "lucide-react";
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

const readFileAsDataURI = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

type FileToUpload = {
  file: File;
  customName: string;
};

export function KnowledgeBaseManager({ initialDocuments }: { initialDocuments: KnowledgeBaseDocument[] }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<FileToUpload[]>([]);
  const { toast } = useToast();
  const [docToRename, setDocToRename] = useState<KnowledgeBaseDocument | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      const newFiles = Array.from(selectedFiles)
        .filter(file => {
          if (file.type !== "application/pdf") {
            toast({ title: "Invalid File Type", description: `${file.name} is not a PDF. Only PDF files are allowed.`, variant: "destructive" });
            return false;
          }
          return true;
        })
        .map(file => ({ file, customName: file.name }));
      setFilesToUpload(prev => [...prev, ...newFiles]);
    }
     if (e.target) {
      e.target.value = "";
    }
  };

  const handleNameChange = (index: number, newName: string) => {
    setFilesToUpload(prev => {
        const updatedFiles = [...prev];
        updatedFiles[index].customName = newName;
        return updatedFiles;
    });
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setFilesToUpload(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const resetUploadDialog = () => {
    setFilesToUpload([]);
    setIsUploading(false);
  }

  const handleDialogStateChange = (open: boolean) => {
    if (!open) {
      resetUploadDialog();
    }
    setIsUploadDialogOpen(open);
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (filesToUpload.length === 0) {
      toast({ title: "No Files Selected", description: "Please select one or more files to upload.", variant: "destructive" });
      return;
    }

    const hasEmptyName = filesToUpload.some(f => !f.customName.trim());
    if (hasEmptyName) {
      toast({ title: "File Name Required", description: "All files must have a name before uploading.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    
    const uploadPromises = filesToUpload.map(async (fileData) => {
      try {
        const fileDataUri = await readFileAsDataURI(fileData.file);
        return uploadKnowledgeBaseFile({
          fileDataUri,
          fileName: fileData.customName,
          description: `Original filename: ${fileData.file.name}`
        });
      } catch (error) {
        throw new Error(`Could not read file ${fileData.file.name}: ${(error as Error).message}`);
      }
    });

    try {
      const results = await Promise.allSettled(uploadPromises);
      const newDocs = results
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<KnowledgeBaseDocument>).value);
      
      const failedUploads = results.filter(result => result.status === 'rejected');

      if (newDocs.length > 0) {
        setDocuments((prev) => [...newDocs, ...prev].sort((a,b) => a.file_name.localeCompare(b.file_name)));
        toast({ title: "Upload Complete", description: `${newDocs.length} file(s) have been added to the knowledge base.` });
      }

      if (failedUploads.length > 0) {
          failedUploads.forEach(fail => {
            console.error("Upload failed with reason:", (fail as PromiseRejectedResult).reason);
          });
          const errorMessage = (failedUploads[0] as PromiseRejectedResult).reason?.message || "An unknown error occurred.";
          toast({ 
            title: `Upload Failed for ${failedUploads.length} file(s)`, 
            description: `Error: ${errorMessage}`, 
            variant: "destructive",
            duration: 9000,
          });
      }
      
      if (failedUploads.length === 0) {
        handleDialogStateChange(false);
      } else {
        const successfulFileNames = new Set(newDocs.map(doc => doc.file_name));
        setFilesToUpload(files => files.filter(f => !successfulFileNames.has(f.customName)));
        setIsUploading(false);
      }

    } catch (error) {
      console.error("Upload failed unexpectedly", error);
      let errorMessage = "An unknown error occurred during the upload process."
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({ title: "Upload Failed", description: errorMessage, variant: "destructive" });
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

  const handleFileRenamed = async () => {
    const { listKnowledgeBaseDocuments } = await import('@/lib/actions/knowledge.actions');
    const updatedDocs = await listKnowledgeBaseDocuments();
    setDocuments(updatedDocs);
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
            <Dialog open={isUploadDialogOpen} onOpenChange={handleDialogStateChange}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add File(s)
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Upload New Knowledge Files</DialogTitle>
                  <DialogDescription>Select one or more PDF files, name them, and add to the global knowledge base.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUploadSubmit}>
                  <div className="grid gap-4 py-4">
                    <div>
                      <Label htmlFor="file-upload" className="sr-only">PDF Document(s)</Label>
                      <Input id="file-upload" type="file" accept="application/pdf" onChange={handleFileChange} multiple disabled={isUploading}/>
                    </div>
                     {filesToUpload.length > 0 && (
                        <div className="space-y-4 max-h-60 overflow-y-auto border rounded-md p-4 bg-muted/30">
                            <Label className="text-xs text-muted-foreground font-semibold">Files to upload ({filesToUpload.length}):</Label>
                            {filesToUpload.map(({ file, customName }, index) => (
                                <div key={index} className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id={`file-name-${index}`}
                                            type="text"
                                            placeholder="Enter a file name"
                                            value={customName}
                                            onChange={(e) => handleNameChange(index, e.target.value)}
                                            className="h-9 text-sm"
                                            disabled={isUploading}
                                            required
                                        />
                                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive flex-shrink-0" onClick={() => handleRemoveFile(index)} disabled={isUploading} title={`Remove ${file.name}`}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground pl-1">Original: {file.name} ({(file.size / 1024).toFixed(2)} KB)</p>
                                </div>
                            ))}
                        </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button type="button" variant="outline" onClick={() => handleDialogStateChange(false)} disabled={isUploading}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isUploading || filesToUpload.length === 0}>
                      {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isUploading ? `Uploading ${filesToUpload.length}...` : `Upload ${filesToUpload.length} File(s)`}
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
                          <Edit className="h-4 w-4" />
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
