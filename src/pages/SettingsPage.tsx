import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Users, Shield, Loader2 } from "lucide-react";

interface UserWithRoles {
  user_id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  roles: string[];
}

const roleDescriptions = [
  { role: "superadmin", desc: "Control total del sistema. Gestión de usuarios, roles y configuración." },
  { role: "admin", desc: "Administración de usuarios y proyectos. Sin acceso a configuración del sistema." },
  { role: "manager", desc: "Gestión de proyectos asignados y equipos." },
  { role: "user", desc: "Acceso básico a proyectos asignados." },
];

export default function SettingsPage() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasRole } = useAuth();
  const isAdmin = hasRole("superadmin") || hasRole("admin");

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    const fetchUsers = async () => {
      const { data: profiles } = await supabase.from("profiles").select("*");
      const { data: allRoles } = await supabase.from("user_roles").select("*");
      if (profiles) {
        setUsers(profiles.map((p) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          created_at: p.created_at,
          roles: allRoles?.filter((r) => r.user_id === p.user_id).map((r) => r.role) || [],
        })));
      }
      setLoading(false);
    };
    fetchUsers();
  }, [isAdmin]);

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
              <div className="glass-card overflow-hidden">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead>Registrado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No hay usuarios registrados
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((u) => (
                          <TableRow key={u.user_id}>
                            <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                {u.roles.length > 0 ? u.roles.map((r) => (
                                  <Badge key={r} variant="secondary" className="capitalize text-xs">{r}</Badge>
                                )) : <span className="text-muted-foreground text-xs">Sin rol</span>}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(u.created_at).toLocaleDateString("es-ES")}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="roles">
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
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
