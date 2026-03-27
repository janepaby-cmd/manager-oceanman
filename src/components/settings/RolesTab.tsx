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
import { useTranslation } from "react-i18next";
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

  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [deleteRole, setDeleteRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDesc, setRoleDesc] = useState("");

  const [assignOpen, setAssignOpen] = useState(false);
  const [deleteAssignment, setDeleteAssignment] = useState<RoleAssignment | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoleName, setSelectedRoleName] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  const { toast } = useToast();
  const { t } = useTranslation(["settings", "common"]);

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

  const handleCreateRole = async () => {
    if (!roleName.trim()) return;
    setActionLoading(true);
    try {
      await callApi({ action: "create_role", name: roleName, description: roleDesc });
      toast({ title: t("roles.roleCreated") });
      setCreateRoleOpen(false);
      setRoleName(""); setRoleDesc("");
      await fetchData();
    } catch (e: any) {
      toast({ title: t("common:error"), description: e.message, variant: "destructive" });
    }
    setActionLoading(false);
  };

  const handleUpdateRole = async () => {
    if (!editRole) return;
    setActionLoading(true);
    try {
      await callApi({ action: "update_role", role_id: editRole.id, name: roleName, description: roleDesc });
      toast({ title: t("roles.roleUpdated") });
      setEditRole(null);
      await fetchData();
    } catch (e: any) {
      toast({ title: t("common:error"), description: e.message, variant: "destructive" });
    }
    setActionLoading(false);
  };

  const handleDeleteRole = async () => {
    if (!deleteRole) return;
    setActionLoading(true);
    try {
      await callApi({ action: "delete_role", role_id: deleteRole.id, role_name: deleteRole.name });
      toast({ title: t("roles.roleDeleted") });
      setDeleteRole(null);
      await fetchData();
    } catch (e: any) {
      toast({ title: t("common:error"), description: e.message, variant: "destructive" });
    }
    setActionLoading(false);
  };

  const handleAssign = async () => {
    if (!selectedUserId || !selectedRoleName) return;
    setActionLoading(true);
    try {
      await callApi({ action: "assign_role", user_id: selectedUserId, role: selectedRoleName });
      toast({ title: t("roles.roleAssigned") });
      setAssignOpen(false);
      setSelectedUserId(""); setSelectedRoleName("");
      await fetchData();
    } catch (e: any) {
      toast({ title: t("common:error"), description: e.message, variant: "destructive" });
    }
    setActionLoading(false);
  };

  const handleRemoveAssignment = async () => {
    if (!deleteAssignment) return;
    setActionLoading(true);
    try {
      await callApi({ action: "remove_role", user_id: deleteAssignment.user_id, role: deleteAssignment.role });
      toast({ title: t("roles.assignmentRemoved") });
      setDeleteAssignment(null);
      await fetchData();
    } catch (e: any) {
      toast({ title: t("common:error"), description: e.message, variant: "destructive" });
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
        <TabsTrigger value="roles-list">{t("roles.title")}</TabsTrigger>
        <TabsTrigger value="assignments">{t("roles.assignments")}</TabsTrigger>
      </TabsList>

      <TabsContent value="roles-list" className="space-y-4">
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { setRoleName(""); setRoleDesc(""); setCreateRoleOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> {t("roles.newRole")}
          </Button>
        </div>

        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common:name")}</TableHead>
                <TableHead>{t("common:description")}</TableHead>
                <TableHead>{t("roles.usersCount")}</TableHead>
                <TableHead>{t("roles.created")}</TableHead>
                <TableHead className="text-right">{t("common:actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t("roles.noRoles")}</TableCell>
                </TableRow>
              ) : (
                roles.map((r) => {
                  const count = assignments.filter((a) => a.role === r.name).length;
                  return (
                    <TableRow key={r.id}>
                      <TableCell><Badge variant="secondary" className="capitalize">{r.name}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{r.description || "—"}</TableCell>
                      <TableCell className="text-sm">{count}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditRole(r)} title={t("common:edit")}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {r.name !== "superadmin" && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteRole(r)} title={t("common:delete")}>
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

      <TabsContent value="assignments" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t("roles.filterByRole")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("roles.allRoles")}</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.name} className="capitalize">{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setAssignOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> {t("roles.assignRole")}
          </Button>
        </div>

        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("roles.user")}</TableHead>
                <TableHead>{t("common:email")}</TableHead>
                <TableHead>{t("roles.title")}</TableHead>
                <TableHead>{t("roles.assigned")}</TableHead>
                <TableHead className="text-right">{t("common:actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t("roles.noAssignments")}</TableCell>
                </TableRow>
              ) : (
                filteredAssignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.full_name || "—"}</TableCell>
                    <TableCell>{a.email}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize text-xs">{a.role}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(a.created_at).toLocaleDateString()}</TableCell>
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
            <DialogTitle>{t("roles.createRole")}</DialogTitle>
            <DialogDescription>{t("roles.createRoleDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("common:name")} *</Label>
              <Input value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder={t("roles.roleNamePlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label>{t("common:description")}</Label>
              <Textarea value={roleDesc} onChange={(e) => setRoleDesc(e.target.value)} placeholder={t("roles.roleDescPlaceholder")} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateRoleOpen(false)}>{t("common:cancel")}</Button>
            <Button onClick={handleCreateRole} disabled={actionLoading || !roleName.trim()}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t("common:create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!editRole} onOpenChange={(o) => !o && setEditRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("roles.editRole")}</DialogTitle>
            <DialogDescription>{t("roles.editRoleDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("common:name")}</Label>
              <Input value={roleName} onChange={(e) => setRoleName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("common:description")}</Label>
              <Textarea value={roleDesc} onChange={(e) => setRoleDesc(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRole(null)}>{t("common:cancel")}</Button>
            <Button onClick={handleUpdateRole} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t("common:save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirm */}
      <AlertDialog open={!!deleteRole} onOpenChange={(o) => !o && setDeleteRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("roles.deleteRole")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("roles.deleteRoleDesc", { name: deleteRole?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRole} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t("common:delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Role Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("roles.assignRole")}</DialogTitle>
            <DialogDescription>{t("roles.assignRoleDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("roles.user")}</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger><SelectValue placeholder={t("roles.selectUser")} /></SelectTrigger>
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
              <Label>{t("roles.title")}</Label>
              <Select value={selectedRoleName} onValueChange={setSelectedRoleName}>
                <SelectTrigger><SelectValue placeholder={t("roles.selectRole")} /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.name} className="capitalize">{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>{t("common:cancel")}</Button>
            <Button onClick={handleAssign} disabled={actionLoading || !selectedUserId || !selectedRoleName}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t("users.assign")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Assignment Confirm */}
      <AlertDialog open={!!deleteAssignment} onOpenChange={(o) => !o && setDeleteAssignment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("roles.removeRole")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("roles.removeRoleDesc", { role: deleteAssignment?.role, name: deleteAssignment?.full_name || deleteAssignment?.email })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveAssignment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t("common:delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
}
