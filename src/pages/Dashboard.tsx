import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { FolderKanban, Mail, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";

export default function Dashboard() {
  const { profile, roles } = useAuth();
  const { t } = useTranslation(["dashboard", "common"]);

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="glass-card p-6">
          <div className="flex items-start gap-5">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">
                {profile?.full_name || t("common:user")}
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {profile?.email || "—"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  {roles.length > 0 ? (
                    <span className="flex gap-1">
                      {roles.map((r) => (
                        <Badge key={r} variant="secondary" className="capitalize text-xs">{r}</Badge>
                      ))}
                    </span>
                  ) : t("common:noRole")}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <FolderKanban className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{t("dashboard:myProjects")}</h2>
          </div>
          <div className="glass-card p-10 text-center">
            <FolderKanban className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{t("dashboard:noProjectsAssigned")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("dashboard:projectsWillAppear")}</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
