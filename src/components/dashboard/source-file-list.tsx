
"use client";

import { SourceFileItem } from "./source-file-item";
import { FileArchive } from "lucide-react";
import React from 'react'; // Ensure React is imported for memo

interface SourceFileListProps {
  pdfNames: string[];
  onRenameSourceFile: (oldName: string) => void;
  onDeleteSourceFile: (name: string) => void;
}

export const SourceFileList = React.memo(function SourceFileList({ pdfNames, onRenameSourceFile, onDeleteSourceFile }: SourceFileListProps) {
  if (pdfNames.length === 0) {
    return (
      <div className="text-center py-3 px-1">
        <FileArchive className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <h3 className="text-sm font-medium">No Source Files</h3>
        <p className="text-xs text-muted-foreground">
          PDFs used for quizzes will appear here.
        </p>
      </div>
    );
  }
  const sortedPdfNames = [...pdfNames].sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-1 py-1">
      {sortedPdfNames.map((name, index) => (
        <SourceFileItem 
          key={`${name}-${index}`} 
          pdfName={name}
          onRename={() => onRenameSourceFile(name)}
          onDelete={() => onDeleteSourceFile(name)}
        />
      ))}
    </div>
  );
});

SourceFileList.displayName = 'SourceFileList';

    