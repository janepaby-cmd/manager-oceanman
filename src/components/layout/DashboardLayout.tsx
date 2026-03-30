import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { DashboardFooter } from "@/components/layout/DashboardFooter";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
        <div className="min-h-[100dvh] flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-h-[100dvh] w-0">
            <DashboardHeader />
            <main className="flex-1 p-3 sm:p-6 bg-background overflow-auto">
              {children}
            </main>
            <DashboardFooter />
        </div>
      </div>
    </SidebarProvider>
  );
}
