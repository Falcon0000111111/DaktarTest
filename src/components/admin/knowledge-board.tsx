
"use client";

import { useSortable, SortableContext } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import type { KnowledgeBaseDocument } from "@/types/supabase";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, Trash2, GripVertical, AlertTriangle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface KnowledgeColumnProps {
  id: string;
  title: string;
  documents: KnowledgeBaseDocument[];
  onRename: (doc: KnowledgeBaseDocument) => void;
  onDelete: (id: string) => void;
}

export function KnowledgeColumn({ id, title, documents, onRename, onDelete }: KnowledgeColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
    data: {
      type: "Column",
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-72 flex-shrink-0 rounded-lg bg-muted/50 p-2 transition-colors",
        isOver ? "bg-primary/10 ring-2 ring-primary" : ""
      )}
    >
      <h3 className="font-semibold px-2 py-1 mb-2">{title} <span className="text-sm text-muted-foreground font-normal">({documents.length})</span></h3>
      <div className="space-y-2 min-h-24">
        <SortableContext items={documents.map(d => d.id)}>
          {documents.map((doc) => (
            <DraggableKnowledgeItem
              key={doc.id}
              doc={doc}
              onRename={() => onRename(doc)}
              onDelete={() => onDelete(doc.id)}
            />
          ))}
        </SortableContext>
        {documents.length === 0 && (
          <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
            Drop files here
          </div>
        )}
      </div>
    </div>
  );
}

interface DraggableKnowledgeItemProps {
  doc: KnowledgeBaseDocument;
  isOverlay?: boolean;
  onRename?: () => void;
  onDelete?: () => void;
}

export function DraggableKnowledgeItem({ doc, isOverlay, onRename, onDelete }: DraggableKnowledgeItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: doc.id,
    data: {
      type: "Document",
      doc,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group bg-card p-2.5 rounded-md shadow-sm border relative",
        isDragging || isOverlay ? "opacity-75 shadow-lg z-50 cursor-grabbing" : "cursor-grab",
        isOverlay && "ring-2 ring-primary"
      )}
    >
      <div className="flex items-start justify-between">
        <div {...attributes} {...listeners} className="flex-1 pr-2 truncate">
          <p className="font-medium text-sm truncate">{doc.file_name}</p>
          <p className="text-xs text-muted-foreground">
            Added: {format(new Date(doc.created_at), "MMM d, yyyy")}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={onRename}>
              <Edit className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center">
                    <AlertTriangle className="mr-2 h-5 w-5 text-destructive" /> Are you sure?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This action is permanent and cannot be undone. This will delete the file "{doc.file_name}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">
                    Delete File
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
