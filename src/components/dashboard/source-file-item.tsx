
"use client";

import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";
import type { ButtonProps } from "@/components/ui/button"; // For potential future use if it becomes a button
import { Badge } from "@/components/ui/badge";

interface SourceFileItemProps {
  pdfName: string;
  onSelect?: () => void; // Optional: if source files become selectable
  isSelected?: boolean; // Optional: if selection state is needed
}

export function SourceFileItem({ pdfName, onSelect, isSelected }: SourceFileItemProps) {
  return (
    <div
      className={cn(
        "flex items-center w-full h-auto justify-start p-3 rounded-md transition-all text-left space-x-3",
        "hover:bg-muted/50 cursor-pointer", // Assuming it might be clickable
        isSelected ? "bg-primary/10 text-primary" : "",
        "focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0"
      )}
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-pressed={isSelected}
    >
      <FileText className={cn("h-5 w-5 flex-shrink-0 text-muted-foreground", isSelected && "text-primary")} />
      <div className="flex-1 overflow-hidden">
        <h3 className={cn("font-medium text-sm truncate", isSelected ? "text-primary" : "text-card-foreground")} title={pdfName}>
          {pdfName}
        </h3>
      </div>
      {/* No metadata like number of questions or status for source files */}
    </div>
  );
}
