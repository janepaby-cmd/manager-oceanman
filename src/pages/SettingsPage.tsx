import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings } from "lucide-react";
import { UsersTab } from "@/components/settings/UsersTab";
import { RolesTab } from "@/components/settings/RolesTab";

export default function SettingsPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("superadmin") || hasRole("admin");

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        </div>

        <Tabs defaultValue={isAdmin ? "users" : "general"} className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            {isAdmin && <TabsTrigger value="users">Usuarios</TabsTrigger>}
            {isAdmin && <TabsTrigger value="roles">Roles</TabsTrigger>}
          </TabsList>

          <TabsContent value="general">
            <div className="glass-card p-12 text-center">
              <p className="text-muted-foreground">Configuración general del sistema próximamente.</p>
            </div>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="users">
              <UsersTab />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="roles">
              <RolesTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
