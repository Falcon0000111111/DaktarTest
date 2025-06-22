"use client";

import Link from "next/link";
import { UserNav } from "@/components/auth/user-nav";
import { BookOpenCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface HeaderProps {
  isSidebarOpen?: boolean;
  workspaceName?: string;
}

export function Header({ isSidebarOpen, workspaceName }: HeaderProps) {
  const pathname = usePathname();
  const isWorkspacePage = !!workspaceName && pathname.startsWith('/dashboard/workspace/');

  return (
    <header 
      className={cn(
        "sticky top-0 z-40 w-full bg-background",
        !isWorkspacePage && "border-b"
      )}
      style={{ height: 'var(--header-height)' }}
    >
      <div className={cn(
        "flex h-full items-center justify-between pr-6 transition-[padding-left] duration-200 ease-in-out",
        isWorkspacePage 
          ? (isSidebarOpen ? "pl-[calc(var(--sidebar-width-expanded)_+_1.5rem)]" : "pl-[calc(var(--sidebar-width-collapsed)_+_1.5rem)]")
          : "pl-6"
      )}>
        <div className="flex-1 truncate">
          {isWorkspacePage ? (
              <span className="font-bold text-xl font-headline truncate">{workspaceName}</span>
          ) : (
              <Link href="/dashboard" className="flex items-center space-x-2">
                  <BookOpenCheck className="h-7 w-7 text-primary" />
                  <span className="font-bold text-xl font-headline">FinalQuiz</span>
              </Link>
          )}
        </div>
        
        <div className="flex flex-shrink-0 items-center justify-end space-x-4 pl-4">
          <UserNav />
        </div>
      </div>
    </header>
  );
}
