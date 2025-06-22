
"use client";

import Link from "next/link";
import { UserNav } from "@/components/auth/user-nav";
import { BookOpenCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const isWorkspacePage = pathname.startsWith('/dashboard/workspace/');

  return (
    <header 
      className={cn(
        "sticky top-0 z-40 w-full bg-background",
        !isWorkspacePage && "border-b"
      )}
      style={{ height: 'var(--header-height)' }}
    >
      <div className="container flex h-full max-w-screen-2xl items-center">
        {!isWorkspacePage && (
            <Link href="/dashboard" className="flex items-center space-x-2">
                <BookOpenCheck className="h-7 w-7 text-primary" />
                <span className="font-bold text-xl font-headline">FinalQuiz</span>
            </Link>
        )}
        <div className="flex flex-1 items-center justify-end space-x-4">
          <UserNav />
        </div>
      </div>
    </header>
  );
}
