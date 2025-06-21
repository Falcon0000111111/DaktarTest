
"use client";

import { cn } from "@/lib/utils";
import { FileText, MoreVertical, Edit3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import React, { useState } from "react";
import type { KnowledgeBaseFile } from "@/types/supabase";
import { formatDistanceToNow } from 'date-fns';


interface KnowledgeFileItemProps {
  file: KnowledgeBaseFile;
  onRename: () => void;
  onDelete: () => void;
}

export const KnowledgeFileItem = React.memo(function KnowledgeFileItem({ file, onRename, onDelete }: KnowledgeFileItemProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div
      className={cn(
        "group relative flex items-center justify-between p-2 rounded-md text-left space-x-2 text-sm",
        "text-foreground hover:bg-muted/50"
      )}
    >
      <div className="flex items-center flex-grow overflow-hidden pr-2">
        <FileText className={cn("h-4 w-4 mr-3 flex-shrink-0 text-muted-foreground")} />
        <div className="flex-1 overflow-hidden">
            <p className="font-medium truncate" title={file.file_name}>
                {file.file_name}
            </p>
             <p className="text-xs text-muted-foreground">
                Added {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
            </p>
        </div>
      </div>
      <DropdownMenu onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 flex-shrink-0",
              isDropdownOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Source file options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={onRename}>
            <Edit3 className="mr-2 h-4 w-4" /> Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive focus:bg-destructive/10">
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});
KnowledgeFileItem.displayName = 'KnowledgeFileItem';
