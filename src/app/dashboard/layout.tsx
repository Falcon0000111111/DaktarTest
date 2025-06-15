
import { Header } from "@/components/layout/header";
import type { ReactNode } from "react";
import { CurrentYear } from "@/components/layout/current-year";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © <CurrentYear /> FinalQuiz. All rights reserved.
      </footer>
    </div>
  );
}
