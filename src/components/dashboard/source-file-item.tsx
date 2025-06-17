
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
        "flex items-center w-full justify-start p-2 rounded-md transition-colors text-left space-x-2 text-xs",
        "text-foreground hover:bg-muted/50 dark:hover:bg-muted/20"
      )}
    >
      <FileText className={cn("h-3.5 w-3.5 flex-shrink-0 text-muted-foreground")} />
      <span className="truncate" title={pdfName}>
        {pdfName}
      </span>
    </div>
  );
}

