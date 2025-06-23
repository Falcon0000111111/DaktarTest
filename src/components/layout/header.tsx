"use client";

import Link from "next/link";
import { UserNav } from "@/components/auth/user-nav";
import { BookOpenCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface HeaderProps {
  workspaceName?: string;
}

export function Header({ workspaceName }: HeaderProps) {
  const pathname = usePathname();
  const isWorkspacePage = pathname.startsWith('/dashboard/workspace/');

  return (
    <header 
      className={cn(
        "sticky top-0 z-40 w-full bg-background flex-shrink-0",
        isWorkspacePage ? "border-b" : ""
      )}
      style={{ height: 'var(--header-height)' }}
    >
      <div className="flex h-full items-center justify-between px-6">
        <div>
          {isWorkspacePage && workspaceName ? (
              <span className="font-bold text-xl font-headline truncate">{workspaceName}</span>
          ) : (
              <Link href="/dashboard" className="flex items-center space-x-2">
                  <BookOpenCheck className="h-7 w-7 text-primary" />
                  <span className="font-bold text-xl font-headline">FinalQuiz</span>
              </Link>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <UserNav />
        </div>
      </div>
    </header>
  );
}
