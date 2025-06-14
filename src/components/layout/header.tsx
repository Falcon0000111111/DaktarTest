
"use client";

import Link from "next/link";
import { UserNav } from "@/components/auth/user-nav";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        {/* "FinalQuiz" branding removed */}
        <div className="flex flex-1 items-center justify-end space-x-4 md:ml-auto"> {/* Ensured user nav is pushed to the right */}
          <UserNav />
        </div>
      </div>
    </header>
  );
}
