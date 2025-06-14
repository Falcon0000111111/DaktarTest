
"use client";

import { SourceFileItem } from "./source-file-item";
import { Inbox } from "lucide-react";

interface SourceFileListProps {
  pdfNames: string[];
  // Add onSelectSourceFile and selectedSourceFile if selection interaction is needed
}

export function SourceFileList({ pdfNames }: SourceFileListProps) {
  if (pdfNames.length === 0) {
    return (
      <div className="text-center py-6 border-2 border-dashed rounded-lg mt-4">
        <Inbox className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-md font-semibold">No Source Files</h3>
        <p className="text-sm text-muted-foreground px-2">
          Upload PDF documents using the "+ Add" button to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 mt-2">
      {pdfNames.map((name, index) => (
        <SourceFileItem 
          key={`${name}-${index}`} 
          pdfName={name}
          // onSelect={() => onSelectSourceFile && onSelectSourceFile(name)}
          // isSelected={name === selectedSourceFile}
        />
      ))}
    </div>
  );
}
