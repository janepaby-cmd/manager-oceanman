import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppModule = "projects" | "phases" | "expenses" | "messages";

interface ModulePermissions {
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_complete: boolean;
}

const FULL_ACCESS: ModulePermissions = { can_create: true, can_read: true, can_update: true, can_delete: true, can_complete: true };
const NO_ACCESS: ModulePermissions = { can_create: false, can_read: false, can_update: false, can_delete: false, can_complete: false };

export function usePermissions() {
  const { roles, user } = useAuth();
  const [permMap, setPermMap] = useState<Record<string, ModulePermissions>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || roles.length === 0) {
      setLoading(false);
      return;
    }

    const fetchPerms = async () => {
      const { data } = await supabase
        .from("role_permissions")
        .select("role, module, can_create, can_read, can_update, can_delete");

      if (!data) { setLoading(false); return; }

      // Merge permissions across all user roles (most permissive wins)
      const merged: Record<string, ModulePermissions> = {};
      for (const row of data) {
        if (!roles.includes(row.role as any)) continue;
        const key = row.module;
        if (!merged[key]) {
          merged[key] = { can_create: false, can_read: false, can_update: false, can_delete: false };
        }
        if (row.can_create) merged[key].can_create = true;
        if (row.can_read) merged[key].can_read = true;
        if (row.can_update) merged[key].can_update = true;
        if (row.can_delete) merged[key].can_delete = true;
      }
      setPermMap(merged);
      setLoading(false);
    };

    fetchPerms();
  }, [user, roles]);

  const getModulePermissions = (module: AppModule): ModulePermissions => {
    // Superadmin always has full access
    if (roles.includes("superadmin")) return FULL_ACCESS;
    return permMap[module] || NO_ACCESS;
  };

  const can = (action: "create" | "read" | "update" | "delete", module: AppModule): boolean => {
    const perms = getModulePermissions(module);
    switch (action) {
      case "create": return perms.can_create;
      case "read": return perms.can_read;
      case "update": return perms.can_update;
      case "delete": return perms.can_delete;
    }
  };

  return { can, getModulePermissions, loading };
}
