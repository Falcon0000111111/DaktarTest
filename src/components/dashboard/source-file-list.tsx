
"use client";

import { KnowledgeFileItem } from "./source-file-item";
import { FileArchive } from "lucide-react";
import React from 'react';
import type { KnowledgeBaseFile } from "@/types/supabase";

interface KnowledgeFileListProps {
  files: KnowledgeBaseFile[];
  onRenameFile: (file: KnowledgeBaseFile) => void;
  onDeleteFile: (fileId: string) => void;
}

export const KnowledgeFileList = React.memo(function KnowledgeFileList({ files, onRenameFile, onDeleteFile }: KnowledgeFileListProps) {
  if (files.length === 0) {
    return (
      <div className="text-center py-3 px-1">
        <FileArchive className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <h3 className="text-sm font-medium">No Source Files</h3>
        <p className="text-xs text-muted-foreground">
          Upload PDFs to your knowledge base to see them here.
        </p>
      </div>
    );
  }

  const sortedFiles = [...files].sort((a, b) => a.file_name.localeCompare(b.file_name));

  return (
    <div className="space-y-1 py-1">
      {sortedFiles.map((file) => (
        <KnowledgeFileItem
          key={file.id} 
          file={file}
          onRename={() => onRenameFile(file)}
          onDelete={() => onDeleteFile(file.id)}
        />
      ))}
    </div>
  );
});

KnowledgeFileList.displayName = 'KnowledgeFileList';
