import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Users, FolderKanban, Shield, Activity } from "lucide-react";

const stats = [
  { label: "Proyectos activos", value: "0", icon: FolderKanban, color: "text-primary" },
  { label: "Usuarios", value: "—", icon: Users, color: "text-emerald-500" },
  { label: "Roles asignados", value: "—", icon: Shield, color: "text-amber-500" },
  { label: "Actividad hoy", value: "0", icon: Activity, color: "text-violet-500" },
];

export default function Dashboard() {
  const { profile, roles } = useAuth();

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bienvenido, {profile?.full_name || "Usuario"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Panel de control — OceanMan Project Manager
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <p className="text-3xl font-bold mt-2">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="glass-card p-6">
          <h2 className="font-semibold mb-3">Tu perfil</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{profile?.email || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Nombre</p>
              <p className="font-medium">{profile?.full_name || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Roles</p>
              <p className="font-medium capitalize">{roles.join(", ") || "Sin rol"}</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
