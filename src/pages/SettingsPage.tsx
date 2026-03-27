import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        </div>
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">Configuración del sistema próximamente.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
