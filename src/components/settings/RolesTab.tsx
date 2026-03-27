import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Role {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface RoleAssignment {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  full_name: string | null;
  email: string | null;
}

export function RolesTab() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [profiles, setProfiles] = useState<{ user_id: string; full_name: string | null; email: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Role CRUD dialogs
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [deleteRole, setDeleteRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDesc, setRoleDesc] = useState("");

  // Assignment dialogs
  const [assignOpen, setAssignOpen] = useState(false);
  const [deleteAssignment, setDeleteAssignment] = useState<RoleAssignment | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoleName, setSelectedRoleName] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const [{ data: rolesData }, { data: profs }, { data: userRoles }] = await Promise.all([
      supabase.from("roles").select("*").order("created_at"),
      supabase.from("profiles").select("user_id, full_name, email"),
      supabase.from("user_roles").select("*"),
    ]);
    if (rolesData) setRoles(rolesData);
    if (profs) setProfiles(profs);
    if (userRoles && profs) {
      setAssignments(
        userRoles.map((r) => {
          const p = profs.find((p) => p.user_id === r.user_id);
          return { ...r, full_name: p?.full_name ?? null, email: p?.email ?? null };
        })
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const callApi = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("manage-users", { body });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  // Role CRUD handlers
  const handleCreateRole = async () => {
    if (!roleName.trim()) return;
    setActionLoading(true);
    try {
      await callApi({ action: "create_role", name: roleName, description: roleDesc });
      toast({ title: "Rol creado correctamente" });
      setCreateRoleOpen(false);
      setRoleName("");
      setRoleDesc("");
      await fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setActionLoading(false);
  };

  const handleUpdateRole = async () => {
    if (!editRole) return;
    setActionLoading(true);
    try {
      await callApi({ action: "update_role", role_id: editRole.id, name: roleName, description: roleDesc });
      toast({ title: "Rol actualizado" });
      setEditRole(null);
      await fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setActionLoading(false);
  };

  const handleDeleteRole = async () => {
    if (!deleteRole) return;
    setActionLoading(true);
    try {
      await callApi({ action: "delete_role", role_id: deleteRole.id, role_name: deleteRole.name });
      toast({ title: "Rol eliminado" });
      setDeleteRole(null);
      await fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setActionLoading(false);
  };

  // Assignment handlers
  const handleAssign = async () => {
    if (!selectedUserId || !selectedRoleName) return;
    setActionLoading(true);
    try {
      await callApi({ action: "assign_role", user_id: selectedUserId, role: selectedRoleName });
      toast({ title: "Rol asignado correctamente" });
      setAssignOpen(false);
      setSelectedUserId("");
      setSelectedRoleName("");
      await fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setActionLoading(false);
  };

  const handleRemoveAssignment = async () => {
    if (!deleteAssignment) return;
    setActionLoading(true);
    try {
      await callApi({ action: "remove_role", user_id: deleteAssignment.user_id, role: deleteAssignment.role });
      toast({ title: "Asignación removida" });
      setDeleteAssignment(null);
      await fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setActionLoading(false);
  };

  const openEditRole = (r: Role) => {
    setRoleName(r.name);
    setRoleDesc(r.description || "");
    setEditRole(r);
  };

  const filteredAssignments = filterRole === "all" ? assignments : assignments.filter((a) => a.role === filterRole);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="roles-list" className="space-y-4">
      <TabsList>
        <TabsTrigger value="roles-list">Roles</TabsTrigger>
        <TabsTrigger value="assignments">Asignaciones</TabsTrigger>
      </TabsList>

      {/* === ROLES LIST === */}
      <TabsContent value="roles-list" className="space-y-4">
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { setRoleName(""); setRoleDesc(""); setCreateRoleOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo rol
          </Button>
        </div>

        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Usuarios</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No hay roles</TableCell>
                </TableRow>
              ) : (
                roles.map((r) => {
                  const count = assignments.filter((a) => a.role === r.name).length;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">{r.name}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {r.description || "—"}
                      </TableCell>
                      <TableCell className="text-sm">{count}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(r.created_at).toLocaleDateString("es-ES")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditRole(r)} title="Editar">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {r.name !== "superadmin" && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteRole(r)} title="Eliminar">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {/* === ASSIGNMENTS === */}
      <TabsContent value="assignments" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.name} className="capitalize">{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setAssignOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Asignar rol
          </Button>
        </div>

        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Asignado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No hay asignaciones
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.full_name || "—"}</TableCell>
                    <TableCell>{a.email}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize text-xs">{a.role}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(a.created_at).toLocaleDateString("es-ES")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteAssignment(a)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      {/* Create Role Dialog */}
      <Dialog open={createRoleOpen} onOpenChange={setCreateRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear rol</DialogTitle>
            <DialogDescription>Define un nuevo rol para el sistema.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="ej: editor, viewer" />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={roleDesc} onChange={(e) => setRoleDesc(e.target.value)} placeholder="Describe los permisos de este rol" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateRoleOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateRole} disabled={actionLoading || !roleName.trim()}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!editRole} onOpenChange={(o) => !o && setEditRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar rol</DialogTitle>
            <DialogDescription>Modifica el nombre o descripción del rol.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={roleName} onChange={(e) => setRoleName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={roleDesc} onChange={(e) => setRoleDesc(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRole(null)}>Cancelar</Button>
            <Button onClick={handleUpdateRole} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirm */}
      <AlertDialog open={!!deleteRole} onOpenChange={(o) => !o && setDeleteRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar rol?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el rol <strong className="capitalize">{deleteRole?.name}</strong> y todas sus asignaciones a usuarios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRole} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Role Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar rol</DialogTitle>
            <DialogDescription>Selecciona un usuario y el rol a asignar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Usuario</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar usuario" /></SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>
                      {p.full_name || p.email} — {p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={selectedRoleName} onValueChange={setSelectedRoleName}>
                <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.name} className="capitalize">{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancelar</Button>
            <Button onClick={handleAssign} disabled={actionLoading || !selectedUserId || !selectedRoleName}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Assignment Confirm */}
      <AlertDialog open={!!deleteAssignment} onOpenChange={(o) => !o && setDeleteAssignment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar rol?</AlertDialogTitle>
            <AlertDialogDescription>
              Se quitará el rol <strong className="capitalize">{deleteAssignment?.role}</strong> de <strong>{deleteAssignment?.full_name || deleteAssignment?.email}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveAssignment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Quitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
}
