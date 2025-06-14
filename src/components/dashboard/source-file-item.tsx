
"use client";

import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";

interface SourceFileItemProps {
  pdfName: string;
  // onSelect?: () => void; // Kept for potential future use
  // isSelected?: boolean; // Kept for potential future use
}

export function SourceFileItem({ pdfName }: SourceFileItemProps) {
  return (
    <div
      className={cn(
        "flex items-center w-full justify-start p-2 rounded-md transition-colors text-left space-x-2",
        "text-sm text-muted-foreground hover:text-foreground"
        // isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted/50", // Removed card-like background
      )}
      // onClick={onSelect}
      // role={onSelect ? "button" : undefined}
      // tabIndex={onSelect ? 0 : undefined}
      // aria-pressed={isSelected}
    >
      <FileText className={cn("h-4 w-4 flex-shrink-0")} />
      <span className="truncate" title={pdfName}>
        {pdfName}
      </span>
    </div>
  );
}
