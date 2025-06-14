
"use client";

import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";

interface SourceFileItemProps {
  pdfName: string;
}

export function SourceFileItem({ pdfName }: SourceFileItemProps) {
  return (
    <div
      className={cn(
        "flex items-center w-full justify-start p-2 rounded-md transition-colors text-left space-x-2",
        "text-sm text-foreground hover:bg-muted/60" // Use foreground for text, muted for hover
      )}
    >
      <FileText className={cn("h-4 w-4 flex-shrink-0 text-muted-foreground")} />
      <span className="truncate" title={pdfName}>
        {pdfName}
      </span>
    </div>
  );
}
