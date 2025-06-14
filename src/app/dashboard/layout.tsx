
import { Header } from "@/components/layout/header";
import type { ReactNode } from "react";
import { CurrentYear } from "@/components/layout/current-year";
import { 
  SidebarProvider, 
  Sidebar,
  SidebarInset,
  SidebarRail
} from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}> {/* defaultOpen true for fixed sidebar */}
      <div className="flex min-h-screen">
        <Sidebar collapsible="icon" className="border-r bg-card"> {/* Use bg-card for sidebar background */}
          <DashboardSidebar />
          <SidebarRail />
        </Sidebar>
        <SidebarInset className="flex flex-col flex-1">
          <Header />
          <main className="flex-1 container py-8 max-w-screen-xl">
            {children}
          </main>
          <footer className="py-6 text-center text-sm text-muted-foreground border-t">
            © <CurrentYear /> QuizifyAI. All rights reserved.
          </footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
