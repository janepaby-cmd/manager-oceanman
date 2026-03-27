import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldPlus, ShieldMinus } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
const ALL_ROLES: AppRole[] = ["superadmin", "admin", "manager", "user"];

const roleDescriptions: Record<AppRole, string> = {
  superadmin: "Control total del sistema. Gestión de usuarios, roles y configuración.",
  admin: "Administración de usuarios y proyectos. Sin acceso a configuración del sistema.",
  manager: "Gestión de proyectos asignados y equipos.",
  user: "Acceso básico a proyectos asignados.",
};

interface UserRole {
  user_id: string;
  full_name: string | null;
  email: string | null;
  roles: AppRole[];
}

export function RolesTab() {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [assignDialog, setAssignDialog] = useState<UserRole | null>(null);
  const [removeDialog, setRemoveDialog] = useState<{ user: UserRole; role: AppRole } | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>("user");
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: allRoles } = await supabase.from("user_roles").select("*");
    if (profiles) {
      setUserRoles(
        profiles.map((p) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          roles: (allRoles?.filter((r) => r.user_id === p.user_id).map((r) => r.role) || []) as AppRole[],
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const callManageUsers = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("manage-users", { body });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const handleAssign = async () => {
    if (!assignDialog) return;
    setActionLoading(true);
    try {
      await callManageUsers({ action: "assign_role", user_id: assignDialog.user_id, role: selectedRole });
      toast({ title: "Rol asignado correctamente" });
      setAssignDialog(null);
      await fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setActionLoading(false);
  };

  const handleRemove = async () => {
    if (!removeDialog) return;
    setActionLoading(true);
    try {
      await callManageUsers({ action: "remove_role", user_id: removeDialog.user.user_id, role: removeDialog.role });
      toast({ title: "Rol removido correctamente" });
      setRemoveDialog(null);
      await fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Role descriptions */}
      <div className="grid gap-3 sm:grid-cols-2">
        {ALL_ROLES.map((role) => (
          <div key={role} className="glass-card p-4 flex items-start gap-3">
            <Badge variant="secondary" className="capitalize mt-0.5 shrink-0">{role}</Badge>
            <p className="text-sm text-muted-foreground">{roleDescriptions[role]}</p>
          </div>
        ))}
      </div>

      {/* Users & Roles Table */}
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles actuales</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {userRoles.map((u) => (
              <TableRow key={u.user_id}>
                <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {u.roles.length > 0 ? u.roles.map((r) => (
                      <Badge key={r} variant="secondary" className="capitalize text-xs cursor-pointer hover:bg-destructive/20"
                        onClick={() => setRemoveDialog({ user: u, role: r })} title={`Clic para quitar rol ${r}`}>
                        {r} ×
                      </Badge>
                    )) : <span className="text-muted-foreground text-xs">Sin rol</span>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedRole("user"); setAssignDialog(u); }}>
                    <ShieldPlus className="mr-1 h-3.5 w-3.5" /> Asignar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Assign Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={(o) => !o && setAssignDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar rol</DialogTitle>
            <DialogDescription>Selecciona un rol para {assignDialog?.full_name || assignDialog?.email}</DialogDescription>
          </DialogHeader>
          <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL_ROLES.map((r) => (
                <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(null)}>Cancelar</Button>
            <Button onClick={handleAssign} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirm Dialog */}
      <Dialog open={!!removeDialog} onOpenChange={(o) => !o && setRemoveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quitar rol</DialogTitle>
            <DialogDescription>
              ¿Quitar el rol <strong className="capitalize">{removeDialog?.role}</strong> de <strong>{removeDialog?.user.full_name || removeDialog?.user.email}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialog(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRemove} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Quitar rol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
