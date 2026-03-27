import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Loader2 } from "lucide-react";

interface UserWithRoles {
  user_id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  roles: string[];
}

export default function UsersManagement() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasRole } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      const { data: profiles } = await supabase.from("profiles").select("*");
      const { data: allRoles } = await supabase.from("user_roles").select("*");

      if (profiles) {
        const mapped: UserWithRoles[] = profiles.map((p) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          created_at: p.created_at,
          roles: allRoles?.filter((r) => r.user_id === p.user_id).map((r) => r.role) || [],
        }));
        setUsers(mapped);
      }
      setLoading(false);
    };
    fetchUsers();
  }, []);

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
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Usuarios</h1>
        </div>

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
                          {u.roles.length > 0 ? (
                            u.roles.map((r) => (
                              <Badge key={r} variant="secondary" className="capitalize text-xs">
                                {r}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-xs">Sin rol</span>
                          )}
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
      </div>
    </DashboardLayout>
  );
}
