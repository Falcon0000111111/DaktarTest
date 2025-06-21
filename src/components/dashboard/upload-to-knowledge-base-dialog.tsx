
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState, type FormEvent, useRef, type ChangeEvent } from "react";
import { uploadKnowledgeBaseFile } from "@/lib/actions/knowledge.actions";
import { FileUp, Loader2, X, FileText } from "lucide-react";

const MAX_FILE_SIZE_MB = 10;

interface UploadToKnowledgeBaseDialogProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

export function UploadToKnowledgeBaseDialog({
  workspaceId,
  open,
  onOpenChange,
  onUploadComplete
}: UploadToKnowledgeBaseDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        toast({ title: "Invalid File Type", description: "Only PDF files are allowed.", variant: "destructive" });
        return;
      }
      if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast({ title: "File Too Large", description: `File size cannot exceed ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  const handleCloseDialog = () => {
    setFile(null);
    setLoading(false);
    onOpenChange(false);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      toast({ title: "No File Selected", description: "Please select a PDF file to upload.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await uploadKnowledgeBaseFile(workspaceId, formData);
      toast({ title: "Upload Successful", description: `"${file.name}" has been added to your knowledge base.` });
      onUploadComplete();
      handleCloseDialog();
    } catch (error) {
      toast({ title: "Upload Failed", description: (error as Error).message, variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCloseDialog()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileUp className="mr-2 h-5 w-5" /> Add to Knowledge Base
          </DialogTitle>
          <DialogDescription>
            Upload a PDF file to make it available for generating quizzes later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} id="kb-upload-form">
          <div className="grid gap-4 py-4">
            <div className="grid w-full items-center gap-2">
              <Label htmlFor="kb-file">PDF File</Label>
              <Input
                id="kb-file"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                disabled={loading || !!file}
              />
            </div>
            {file && (
                <div className="text-sm flex items-center justify-between group p-2 hover:bg-muted/50 rounded-md border">
                    <div className="flex items-center truncate">
                        <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate" title={file.name}>{file.name}</span>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={handleRemoveFile}
                        disabled={loading}
                        title={`Remove ${file.name}`}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}
          </div>
        </form>
         <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" form="kb-upload-form" disabled={loading || !file}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? "Uploading..." : "Upload File"}
            </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

