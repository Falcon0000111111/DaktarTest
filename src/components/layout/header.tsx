
"use client";

import Link from "next/link";
import { UserNav } from "@/components/auth/user-nav";
import { BookOpenCheck } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar"; // Added for mobile sidebar toggle

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <div className="mr-4 hidden md:flex">
          {/* Desktop: App name is part of the main layout, not necessarily in header for this design */}
        </div>
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
        <Link href="/dashboard" className="mr-6 flex items-center space-x-2 md:ml-4">
          {/* <BookOpenCheck className="h-6 w-6 text-primary" /> */}
          <span className="font-bold font-headline text-xl sm:inline-block">
            FinalQuiz
          </span>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <UserNav />
        </div>
      </div>
    </header>
  );
}

