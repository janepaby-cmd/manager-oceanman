import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Shield } from "lucide-react";
import { getRoleLabel, APP_ROLES } from "@/lib/roleLabels";

interface Permission {
  id: string;
  role: string;
  module: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_complete: boolean;
}

const MODULES = ["projects", "phases", "expenses", "messages"];

export function PermissionsTab() {
  const { t, i18n } = useTranslation("settings");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const moduleLabels: Record<string, string> = {
    projects: t("permissions.modules.projects", "Proyectos"),
    phases: t("permissions.modules.phases", "Fases e ítems"),
    expenses: t("permissions.modules.expenses", "Gastos"),
    messages: t("permissions.modules.messages", "Mensajes"),
  };

  const actionLabels: Record<string, string> = {
    can_create: t("permissions.actions.create", "Crear"),
    can_read: t("permissions.actions.read", "Consultar"),
    can_update: t("permissions.actions.update", "Editar"),
    can_delete: t("permissions.actions.delete", "Eliminar"),
  };

  const fetchPermissions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("role_permissions")
      .select("*")
      .order("role")
      .order("module");
    if (data) setPermissions(data as Permission[]);
    setLoading(false);
  };

  useEffect(() => { fetchPermissions(); }, []);

  const togglePermission = async (perm: Permission, field: keyof Pick<Permission, "can_create" | "can_read" | "can_update" | "can_delete">) => {
    // Don't allow modifying superadmin permissions
    if (perm.role === "superadmin") {
      toast.error(t("permissions.superadminProtected", "Los permisos de superadmin no se pueden modificar"));
      return;
    }

    const newValue = !perm[field];
    const { error } = await supabase
      .from("role_permissions")
      .update({ [field]: newValue })
      .eq("id", perm.id);

    if (error) {
      toast.error(t("common:error"));
    } else {
      setPermissions((prev) =>
        prev.map((p) => (p.id === perm.id ? { ...p, [field]: newValue } : p))
      );
      toast.success(t("permissions.updated", "Permiso actualizado"));
    }
  };

  // Filter out superadmin - they always have full access
  const editableRoles = APP_ROLES.filter((r) => r !== "superadmin");

  if (loading) {
    return <p className="text-center py-8 text-muted-foreground">{t("common:loading", "Cargando...")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <p className="text-sm text-muted-foreground">
          {t("permissions.description", "Configura los permisos CRUD para cada rol y módulo de la aplicación. El superadmin siempre tiene acceso completo.")}
        </p>
      </div>

      {editableRoles.map((role) => {
        const rolePerms = permissions.filter((p) => p.role === role);
        if (rolePerms.length === 0) return null;

        return (
          <Card key={role}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Badge variant="outline" className="text-sm">
                  {getRoleLabel(role, i18n.language)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px]">{t("permissions.module", "Módulo")}</TableHead>
                      {Object.entries(actionLabels).map(([key, label]) => (
                        <TableHead key={key} className="text-center min-w-[80px]">{label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MODULES.map((mod) => {
                      const perm = rolePerms.find((p) => p.module === mod);
                      if (!perm) return null;
                      return (
                        <TableRow key={mod}>
                          <TableCell className="font-medium">{moduleLabels[mod]}</TableCell>
                          {(["can_create", "can_read", "can_update", "can_delete"] as const).map((field) => (
                            <TableCell key={field} className="text-center">
                              <Switch
                                checked={perm[field]}
                                onCheckedChange={() => togglePermission(perm, field)}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
