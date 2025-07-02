
"use client";

import { useState, useMemo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { uploadKnowledgeBaseFile, deleteKnowledgeBaseDocument, updateKnowledgeBaseFileCategory } from "@/lib/actions/knowledge.actions";
import type { KnowledgeBaseDocument, KnowledgeCategory } from "@/types/supabase";
import { FileUp, Loader2, PlusCircle, X } from "lucide-react";
import { RenameKnowledgeFileDialog } from "../dashboard/rename-knowledge-file-dialog";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
import { KnowledgeColumn, DraggableKnowledgeItem } from "./knowledge-board";

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

export const CATEGORIES: KnowledgeCategory[] = ['Biology', 'Chemistry', 'Physics', 'English', 'Logical Reasoning'];
const UNCATEGORIZED_ID = "Uncategorized";

export function KnowledgeBaseManager({ initialDocuments }: { initialDocuments: KnowledgeBaseDocument[] }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<FileToUpload[]>([]);
  const { toast } = useToast();
  const [docToRename, setDocToRename] = useState<KnowledgeBaseDocument | null>(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);

  const [activeDoc, setActiveDoc] = useState<KnowledgeBaseDocument | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
        distance: 3,
    },
  }));

  const docsByCategory = useMemo(() => {
    const grouped: Record<string, KnowledgeBaseDocument[]> = {
      [UNCATEGORIZED_ID]: [],
    };
    CATEGORIES.forEach(cat => grouped[cat] = []);

    documents.forEach(doc => {
      const category = doc.category || UNCATEGORIZED_ID;
      if (grouped[category]) {
        grouped[category].push(doc);
      } else {
        // Fallback for any unexpected category values
        grouped[UNCATEGORIZED_ID].push(doc);
      }
    });

    return grouped;
  }, [documents]);

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
        setDocuments((prev) => [...newDocs, ...prev]);
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

  const handleDelete = async (docId: string) => {
    try {
      await deleteKnowledgeBaseDocument(docId);
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
      toast({ title: "File Deleted", description: `File has been removed from the knowledge base.` });
    } catch (error) {
      toast({ title: "Deletion Failed", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleRename = (doc: KnowledgeBaseDocument) => {
    setDocToRename(doc);
    setIsRenameDialogOpen(true);
  };

  const handleFileRenamed = async (updatedDoc: KnowledgeBaseDocument) => {
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
  };
  
  function onDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type === "Document") {
      setActiveDoc(event.active.data.current.doc);
    }
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveDoc(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;
    
    const activeDoc = documents.find(d => d.id === activeId);
    if (!activeDoc) return;
    
    const oldCategory = activeDoc.category || UNCATEGORIZED_ID;
    const newCategory = over.data.current?.type === "Column" ? (overId as string) : (over.data.current?.doc.category || UNCATEGORIZED_ID);
    
    if (oldCategory === newCategory) return;
    
    // Optimistic UI update
    setDocuments(prev => {
        const updatedDocs = prev.map(d => {
            if (d.id === activeId) {
                return {...d, category: newCategory === UNCATEGORIZED_ID ? null : newCategory as KnowledgeCategory};
            }
            return d;
        });
        return updatedDocs;
    });

    try {
        await updateKnowledgeBaseFileCategory(activeId as string, newCategory === UNCATEGORIZED_ID ? null : newCategory as KnowledgeCategory);
    } catch(error) {
        toast({ title: "Update Failed", description: (error as Error).message, variant: "destructive" });
        // Revert UI on failure
        setDocuments(prev => prev.map(d => d.id === activeId ? activeDoc : d));
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Global Knowledge Base</CardTitle>
              <CardDescription>
                Drag and drop files to organize them into categories. Uploaded files appear in &quot;Uncategorized&quot;.
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
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4">
                <KnowledgeColumn
                    id={UNCATEGORIZED_ID}
                    title="Uncategorized"
                    documents={docsByCategory[UNCATEGORIZED_ID] || []}
                    onRename={handleRename}
                    onDelete={handleDelete}
                />
                {CATEGORIES.map(category => (
                    <KnowledgeColumn
                        key={category}
                        id={category}
                        title={category}
                        documents={docsByCategory[category] || []}
                        onRename={handleRename}
                        onDelete={handleDelete}
                    />
                ))}
            </div>
            <DragOverlay>
              {activeDoc ? <DraggableKnowledgeItem doc={activeDoc} isOverlay /> : null}
            </DragOverlay>
          </DndContext>
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
