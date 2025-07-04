
"use client";

import Link from "next/link";
import { UserNav } from "@/components/auth/user-nav";
import { Stethoscope } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface HeaderProps {
  workspaceName?: string;
  mobileSidebarTrigger?: ReactNode;
}

export function Header({ workspaceName, mobileSidebarTrigger }: HeaderProps) {
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
      <div className="flex h-full items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          {mobileSidebarTrigger}
          {isWorkspacePage && workspaceName ? (
              <span className="font-bold text-xl font-headline truncate">{workspaceName}</span>
          ) : (
              <Link href="/dashboard" className="flex items-center space-x-2">
                  <Stethoscope className="h-7 w-7 text-primary" />
                  <span className="font-bold text-xl font-headline">DaktarTest</span>
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
