import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, UserX } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import ExternalUserFormDialog from "./ExternalUserFormDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ExternalUser {
  id: string;
  project_id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

interface Props {
  projectId: string;
  canManage: boolean;
}

export default function ExternalUsersList({ projectId, canManage }: Props) {
  const { t } = useTranslation(["projects", "common"]);
  const [users, setUsers] = useState<ExternalUser[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<ExternalUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<ExternalUser | null>(null);

  const fetchUsers = useCallback(async () => {
    let query = supabase
      .from("external_users")
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (statusFilter === "active") query = query.eq("is_active", true);
    if (statusFilter === "inactive") query = query.eq("is_active", false);

    const { data } = await query;
    if (data) setUsers(data as ExternalUser[]);
  }, [projectId, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDelete = async () => {
    if (!deleteUser) return;
    await supabase.from("external_users").update({ deleted_at: new Date().toISOString() }).eq("id", deleteUser.id);
    toast.success(t("extUserDeleted"));
    setDeleteUser(null);
    fetchUsers();
  };

  const needle = search.toLowerCase();
  const filtered = users.filter(u =>
    u.first_name.toLowerCase().includes(needle) ||
    (u.last_name && u.last_name.toLowerCase().includes(needle)) ||
    u.email.toLowerCase().includes(needle) ||
    (u.company && u.company.toLowerCase().includes(needle))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-lg font-semibold">{t("extUsersTitle")}</h3>
        {canManage && (
          <Button size="sm" onClick={() => { setEditUser(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" /> {t("extUserNew")}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("extUserSearchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("extUserFilterAll")}</SelectItem>
            <SelectItem value="active">{t("extUserFilterActive")}</SelectItem>
            <SelectItem value="inactive">{t("extUserFilterInactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <UserX className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{t("extUserNoUsers")}</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("extUserName")}</TableHead>
                <TableHead>{t("extUserEmail")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("extUserCompany")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("extUserPhone")}</TableHead>
                <TableHead>{t("extUserStatus")}</TableHead>
                {canManage && <TableHead className="w-[80px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.first_name} {u.last_name || ""}
                  </TableCell>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{u.company || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{u.phone || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={u.is_active ? "default" : "secondary"} className="text-xs">
                      {u.is_active ? t("extUserActive") : t("extUserInactive")}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditUser(u); setShowForm(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteUser(u)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ExternalUserFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        projectId={projectId}
        user={editUser}
        onSaved={fetchUsers}
      />

      <AlertDialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("extUserDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("extUserDeleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t("common:delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
