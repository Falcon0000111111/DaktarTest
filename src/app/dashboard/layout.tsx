
import type { ReactNode } from "react";
import { CurrentYear } from "@/components/layout/current-year";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col" style={{ '--header-height': '4rem', '--footer-height': '3.5rem' } as React.CSSProperties}>
      <main className="flex-1 flex flex-col bg-background">
        {children}
      </main>
      <footer className="py-4 text-center text-xs text-muted-foreground border-t bg-background h-[var(--footer-height)] flex-shrink-0">
        © <CurrentYear /> DoctorQuiz. All rights reserved.
      </footer>
    </div>
  );
}
