import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, ShieldPlus, ShieldMinus, Ban, CheckCircle2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRoles {
  user_id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  is_active: boolean;
  roles: AppRole[];
}

export function UsersTab() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [availableRoles, setAvailableRoles] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserWithRoles | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserWithRoles | null>(null);
  const [roleDialog, setRoleDialog] = useState<{ user: UserWithRoles; action: "assign" | "remove" } | null>(null);

  // Form states
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  const { user } = useAuth();
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    const [{ data: profiles }, { data: allRoles }, { data: rolesTable }] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
      supabase.from("roles").select("id, name").order("name"),
    ]);
    if (rolesTable) setAvailableRoles(rolesTable);
    if (profiles) {
      setUsers(
        profiles.map((p) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          created_at: p.created_at,
          is_active: p.is_active,
          roles: (allRoles?.filter((r) => r.user_id === p.user_id).map((r) => r.role) || []) as AppRole[],
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const callManageUsers = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("manage-users", { body });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const handleCreate = async () => {
    if (!newEmail.trim() || !newPassword.trim()) return;
    setActionLoading(true);
    try {
      await callManageUsers({
        action: "create_user",
        email: newEmail.trim(),
        password: newPassword,
        full_name: newName.trim() || newEmail.trim(),
        role: newRole,
      });
      toast({ title: "Usuario creado correctamente" });
      setCreateOpen(false);
      setNewEmail(""); setNewPassword(""); setNewName(""); setNewRole("user");
      await fetchUsers();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setActionLoading(false);
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    setActionLoading(true);
    try {
      await callManageUsers({
        action: "update_user",
        user_id: editUser.user_id,
        full_name: editName.trim(),
        email: editEmail.trim(),
      });
      toast({ title: "Usuario actualizado" });
      setEditUser(null);
      await fetchUsers();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setActionLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setActionLoading(true);
    try {
      await callManageUsers({ action: "delete_user", user_id: deleteUser.user_id });
      toast({ title: "Usuario eliminado" });
      setDeleteUser(null);
      await fetchUsers();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setActionLoading(false);
  };

  const handleRoleAction = async () => {
    if (!roleDialog) return;
    setActionLoading(true);
    try {
      await callManageUsers({
        action: roleDialog.action === "assign" ? "assign_role" : "remove_role",
        user_id: roleDialog.user.user_id,
        role: selectedRole,
      });
      toast({ title: roleDialog.action === "assign" ? "Rol asignado" : "Rol removido" });
      setRoleDialog(null);
      await fetchUsers();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setActionLoading(false);
  };

  const handleToggleStatus = async (u: UserWithRoles) => {
    setActionLoading(true);
    try {
      await callManageUsers({ action: "toggle_user_status", user_id: u.user_id, is_active: !u.is_active });
      toast({ title: u.is_active ? "Usuario suspendido" : "Usuario activado" });
      await fetchUsers();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setActionLoading(false);
  };

  const openEdit = (u: UserWithRoles) => {
    setEditName(u.full_name || "");
    setEditEmail(u.email || "");
    setEditUser(u);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" /> Nuevo usuario
        </Button>
      </div>

      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Registrado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No hay usuarios registrados
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.is_active ? "secondary" : "destructive"} className="text-xs">
                      {u.is_active ? "Activo" : "Suspendido"}
                    </Badge>
                  </TableCell>
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
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)} title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedRole("user"); setRoleDialog({ user: u, action: "assign" }); }} title="Asignar rol">
                        <ShieldPlus className="h-3.5 w-3.5" />
                      </Button>
                      {u.roles.length > 0 && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedRole(u.roles[0]); setRoleDialog({ user: u, action: "remove" }); }} title="Quitar rol">
                          <ShieldMinus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {(() => {
                        const isSuperadmin = u.roles.includes("superadmin" as AppRole);
                        return (
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => !isSuperadmin && handleToggleStatus(u)}
                            disabled={isSuperadmin}
                            title={isSuperadmin ? "No se puede suspender a un superadmin" : u.is_active ? "Suspender usuario" : "Activar usuario"}>
                            {u.is_active
                              ? <Ban className="h-3.5 w-3.5 text-warning" />
                              : <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                          </Button>
                        );
                      })()}
                      {u.user_id !== user?.id && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteUser(u)} title="Eliminar">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear usuario</DialogTitle>
            <DialogDescription>Ingresa los datos del nuevo usuario.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Juan Pérez" />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@ejemplo.com" required />
            </div>
            <div className="space-y-2">
              <Label>Contraseña *</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required />
            </div>
            <div className="space-y-2">
              <Label>Rol inicial</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
                <SelectContent>
                  {availableRoles.map((r) => (
                    <SelectItem key={r.id} value={r.name} className="capitalize">{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
            <DialogDescription>Modifica los datos del usuario.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Dialog */}
      <Dialog open={!!roleDialog} onOpenChange={(o) => !o && setRoleDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{roleDialog?.action === "assign" ? "Asignar rol" : "Quitar rol"}</DialogTitle>
            <DialogDescription>
              {roleDialog?.action === "assign"
                ? `Selecciona el rol para ${roleDialog?.user.full_name || roleDialog?.user.email}`
                : `Selecciona el rol a quitar de ${roleDialog?.user.full_name || roleDialog?.user.email}`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {roleDialog?.action === "remove" ? (
                  roleDialog.user.roles.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                  ))
                ) : (
                  availableRoles.map((r) => (
                    <SelectItem key={r.id} value={r.name} className="capitalize">{r.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialog(null)}>Cancelar</Button>
            <Button onClick={handleRoleAction} disabled={actionLoading} variant={roleDialog?.action === "remove" ? "destructive" : "default"}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {roleDialog?.action === "assign" ? "Asignar" : "Quitar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente a <strong>{deleteUser?.full_name || deleteUser?.email}</strong> y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
