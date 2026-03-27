import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FolderKanban } from "lucide-react";

export default function ProjectsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Proyectos</h1>
        </div>
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">No hay proyectos aún. ¡Crea tu primer proyecto!</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
