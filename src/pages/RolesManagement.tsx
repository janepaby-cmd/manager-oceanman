import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const roleDescriptions = [
  { role: "superadmin", desc: "Control total del sistema. Gestión de usuarios, roles y configuración." },
  { role: "admin", desc: "Administración de usuarios y proyectos. Sin acceso a configuración del sistema." },
  { role: "manager", desc: "Gestión de proyectos asignados y equipos." },
  { role: "user", desc: "Acceso básico a proyectos asignados." },
];

export default function RolesManagement() {
  const { hasRole } = useAuth();

  if (!hasRole("superadmin") && !hasRole("admin")) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No tienes permisos para ver esta página.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Roles</h1>
        </div>

        <div className="grid gap-4">
          {roleDescriptions.map((r) => (
            <div key={r.role} className="glass-card p-5 flex items-start gap-4">
              <Badge variant="secondary" className="capitalize mt-0.5">{r.role}</Badge>
              <div>
                <p className="font-medium capitalize">{r.role}</p>
                <p className="text-sm text-muted-foreground mt-1">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
