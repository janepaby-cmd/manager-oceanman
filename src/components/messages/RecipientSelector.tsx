import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getRoleLabel } from "@/lib/roleLabels";

interface Props {
  scopeType: string;
  onScopeChange: (scope: string) => void;
  selectedUserIds: string[];
  onUsersChange: (ids: string[]) => void;
  selectedProjectIds: string[];
  onProjectsChange: (ids: string[]) => void;
  selectedRoles: string[];
  onRolesChange: (roles: string[]) => void;
}

interface UserOption {
  user_id: string;
  full_name: string;
  email: string;
}

const ALLOWED_SCOPES: Record<string, string[]> = {
  user: ["user"],
  manager: ["user", "role"],
  admin: ["user", "role", "project", "global"],
  superadmin: ["user", "role", "project", "global"],
};

const ROLES_LIST = ["superadmin", "admin", "manager", "user"];

export default function RecipientSelector({
  scopeType, onScopeChange,
  selectedUserIds, onUsersChange,
  selectedProjectIds, onProjectsChange,
  selectedRoles, onRolesChange,
}: Props) {
  const { user, roles, hasRole } = useAuth();
  const { t, i18n } = useTranslation("messages");
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const userRole = hasRole("superadmin")
    ? "superadmin"
    : hasRole("admin")
    ? "admin"
    : hasRole("manager")
    ? "manager"
    : "user";

  const allowedScopes = ALLOWED_SCOPES[userRole] || ["user"];

  useEffect(() => {
    loadData();
  }, [scopeType, selectedProjectIds, selectedRoles]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (scopeType === "user" || scopeType === "project") {
        await loadAvailableUsers();
      }
      if (scopeType === "project" || allowedScopes.includes("project")) {
        await loadProjects();
      }
      if (scopeType === "role") {
        await loadUsersByRoles();
      }
      if (scopeType === "global") {
        await loadAllUsers();
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    if (userRole === "user") {
      // User can only message managers of their projects
      const { data: myProjects } = await supabase
        .from("project_users")
        .select("project_id")
        .eq("user_id", user!.id);
      if (!myProjects?.length) { setAvailableUsers([]); return; }

      const projectIds = myProjects.map((p) => p.project_id);
      const { data: projectUserIds } = await supabase
        .from("project_users")
        .select("user_id")
        .in("project_id", projectIds)
        .neq("user_id", user!.id);
      if (!projectUserIds?.length) { setAvailableUsers([]); return; }

      const uids = [...new Set(projectUserIds.map((p) => p.user_id))];
      // Filter to only managers
      const { data: managerRoles } = await (supabase as any)
        .from("user_roles")
        .select("user_id")
        .in("user_id", uids)
        .eq("role", "manager");
      const managerIds = (managerRoles || []).map((r: any) => r.user_id);
      if (!managerIds.length) { setAvailableUsers([]); return; }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", managerIds)
        .eq("is_active", true);
      setAvailableUsers(profiles || []);
    } else if (userRole === "manager") {
      // Manager: users from their projects + managers/admins/superadmins
      const { data: myProjects } = await supabase
        .from("project_users")
        .select("project_id")
        .eq("user_id", user!.id);
      const projectIds = myProjects?.map((p) => p.project_id) || [];

      let userIds: string[] = [];
      if (selectedProjectIds.length) {
        // Verify manager has access to selected projects
        const validPids = selectedProjectIds.filter((pid) => projectIds.includes(pid));
        const { data: pUsers } = await supabase
          .from("project_users")
          .select("user_id")
          .in("project_id", validPids);
        userIds = (pUsers || []).map((u) => u.user_id);
      } else {
        const { data: pUsers } = await supabase
          .from("project_users")
          .select("user_id")
          .in("project_id", projectIds);
        userIds = (pUsers || []).map((u) => u.user_id);
      }

      // Add managers, admins, superadmins
      const { data: higherRoles } = await (supabase as any)
        .from("user_roles")
        .select("user_id")
        .in("role", ["manager", "admin", "superadmin"]);
      const higherIds = (higherRoles || []).map((r: any) => r.user_id);
      const allIds = [...new Set([...userIds, ...higherIds])].filter((id) => id !== user!.id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", allIds)
        .eq("is_active", true);
      setAvailableUsers(profiles || []);
    } else {
      // Admin/Superadmin: all users
      await loadAllUsers();
    }
  };

  const loadProjects = async () => {
    if (userRole === "manager") {
      const { data: myProjects } = await supabase
        .from("project_users")
        .select("project_id")
        .eq("user_id", user!.id);
      const pids = myProjects?.map((p) => p.project_id) || [];
      const { data } = await supabase
        .from("projects")
        .select("id, name")
        .in("id", pids)
        .order("name");
      setProjects(data || []);
    } else {
      const { data } = await supabase.from("projects").select("id, name").order("name");
      setProjects(data || []);
    }
  };

  const loadUsersByRoles = async () => {
    if (!selectedRoles.length) { setAvailableUsers([]); return; }
    const { data: roleUsers } = await (supabase as any)
      .from("user_roles")
      .select("user_id")
      .in("role", selectedRoles);
    const uids = [...new Set((roleUsers || []).map((r: any) => r.user_id))];
    if (!uids.length) { setAvailableUsers([]); return; }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", uids)
      .eq("is_active", true);
    setAvailableUsers(profiles || []);
    onUsersChange(uids.filter((id) => id !== user!.id));
  };

  const loadAllUsers = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .eq("is_active", true)
      .neq("user_id", user!.id)
      .order("full_name");
    setAvailableUsers(profiles || []);
    if (scopeType === "global") {
      onUsersChange((profiles || []).map((p) => p.user_id));
    }
  };

  const toggleUser = (uid: string) => {
    onUsersChange(
      selectedUserIds.includes(uid)
        ? selectedUserIds.filter((id) => id !== uid)
        : [...selectedUserIds, uid]
    );
  };

  const toggleProject = async (pid: string) => {
    const newPids = selectedProjectIds.includes(pid)
      ? selectedProjectIds.filter((id) => id !== pid)
      : [...selectedProjectIds, pid];
    onProjectsChange(newPids);

    // Resolve users for selected projects
    if (newPids.length) {
      const { data: pUsers } = await supabase
        .from("project_users")
        .select("user_id")
        .in("project_id", newPids);
      const uids = ([...new Set((pUsers || []).map((u) => u.user_id))] as string[]).filter((id) => id !== user!.id);
      onUsersChange(uids);
    } else {
      onUsersChange([]);
    }
  };

  const toggleRole = (role: string) => {
    onRolesChange(
      selectedRoles.includes(role)
        ? selectedRoles.filter((r) => r !== role)
        : [...selectedRoles, role]
    );
  };

  const availableRoles = userRole === "manager"
    ? ["manager", "admin", "superadmin"]
    : ROLES_LIST;

  return (
    <div className="space-y-4">
      <div>
        <Label>{t("scope.label")}</Label>
        <Select value={scopeType} onValueChange={onScopeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allowedScopes.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`scope.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {scopeType === "role" && (
        <div className="space-y-2">
          <Label>{t("selectRoles")}</Label>
          <div className="flex flex-wrap gap-2">
            {availableRoles.map((r) => (
              <label key={r} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selectedRoles.includes(r)}
                  onCheckedChange={() => toggleRole(r)}
                />
                <span className="text-sm">{getRoleLabel(r as any, i18n.language)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {scopeType === "project" && (
        <div className="space-y-2">
          <Label>{t("selectProjects")}</Label>
          <ScrollArea className="h-32 border rounded-md p-2">
            {projects.map((p) => (
              <label key={p.id} className="flex items-center gap-2 py-1 cursor-pointer">
                <Checkbox
                  checked={selectedProjectIds.includes(p.id)}
                  onCheckedChange={() => toggleProject(p.id)}
                />
                <span className="text-sm">{p.name}</span>
              </label>
            ))}
          </ScrollArea>
        </div>
      )}

      {(scopeType === "user" || (scopeType === "role" && selectedRoles.length > 0)) && (
        <div className="space-y-2">
          <Label>
            {t("selectRecipients")}
            {selectedUserIds.length > 0 && (
              <Badge variant="secondary" className="ml-2">{selectedUserIds.length}</Badge>
            )}
          </Label>
          <ScrollArea className="h-40 border rounded-md p-2">
            {availableUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground p-2">{t("common:noResults")}</p>
            ) : (
              availableUsers.map((u) => (
                <label key={u.user_id} className="flex items-center gap-2 py-1 cursor-pointer">
                  <Checkbox
                    checked={selectedUserIds.includes(u.user_id)}
                    onCheckedChange={() => toggleUser(u.user_id)}
                    disabled={scopeType === "role"}
                  />
                  <div className="min-w-0">
                    <span className="text-sm font-medium">{u.full_name || u.email}</span>
                    <span className="text-xs text-muted-foreground ml-2">{u.email}</span>
                  </div>
                </label>
              ))
            )}
          </ScrollArea>
        </div>
      )}

      {scopeType === "global" && (
        <p className="text-sm text-muted-foreground">
          {t("recipientsSelected", { count: selectedUserIds.length })}
        </p>
      )}

      {scopeType === "project" && selectedProjectIds.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {t("recipientsSelected", { count: selectedUserIds.length })}
        </p>
      )}
    </div>
  );
}
