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
  const isWorkspacePage = pathname.startsWith('/dashboard/workspace/');

  const headerStyle = isWorkspacePage
    ? {
        left: isSidebarOpen ? 'var(--sidebar-width-expanded)' : 'var(--sidebar-width-collapsed)',
        width: isSidebarOpen ? 'calc(100% - var(--sidebar-width-expanded))' : 'calc(100% - var(--sidebar-width-collapsed))',
        transition: 'left 0.2s ease-in-out, width 0.2s ease-in-out',
      }
    : {
        width: '100%',
      };

  return (
    <header 
      className={cn(
        "sticky top-0 z-40 bg-background",
        !isWorkspacePage && "border-b"
      )}
      style={{ 
        height: 'var(--header-height)', 
        ...headerStyle
      }}
    >
      <div className="flex h-full items-center justify-between px-6">
        {isWorkspacePage ? (
            <span className="font-bold text-xl font-headline truncate">{workspaceName}</span>
        ) : (
            <Link href="/dashboard" className="flex items-center space-x-2">
                <BookOpenCheck className="h-7 w-7 text-primary" />
                <span className="font-bold text-xl font-headline">FinalQuiz</span>
            </Link>
        )}
        
        <div className="flex items-center space-x-4">
          <UserNav />
        </div>
      </div>
    </header>
  );
}
