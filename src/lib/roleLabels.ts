import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_LABELS: Record<AppRole, { en: string; es: string }> = {
  superadmin: { en: "Super Admin", es: "Super Admin" },
  admin: { en: "Administrator", es: "Administrador" },
  manager: { en: "Project Manager", es: "Project Manager" },
  user: { en: "User", es: "Usuario" },
};

export function getRoleLabel(role: AppRole, lang: string = "es"): string {
  const labels = ROLE_LABELS[role];
  if (!labels) return role;
  return lang === "en" ? labels.en : labels.es;
}

export const APP_ROLES: AppRole[] = ["superadmin", "admin", "manager", "user"];
