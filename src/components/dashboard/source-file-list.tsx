
"use client";

import { SourceFileItem } from "./source-file-item";
import { Inbox, FileArchive } from "lucide-react";

interface SourceFileListProps {
  pdfNames: string[];
}

export function SourceFileList({ pdfNames }: SourceFileListProps) {
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
  // Sort PDF names alphabetically for consistent display
  const sortedPdfNames = [...pdfNames].sort((a, b) => a.localeCompare(b));


  return (
    <div className="space-y-1 py-1">
      {sortedPdfNames.map((name, index) => (
        <SourceFileItem 
          key={`${name}-${index}`} 
          pdfName={name}
        />
      ))}
    </div>
  );
}

