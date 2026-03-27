import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { FolderKanban, Mail, Shield, Calendar, CheckCircle2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { profile, roles, user } = useAuth();
  const { t, i18n } = useTranslation(["dashboard", "common", "projects"]);
  const navigate = useNavigate();
  const dateLocale = i18n.language === "es" ? es : enUS;
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["dashboard-projects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          project_statuses ( name, color ),
          project_phases (
            id, name, is_completed,
            phase_items ( id, is_completed )
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

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

          {isLoading ? (
            <div className="glass-card p-10 text-center">
              <p className="text-muted-foreground">{t("common:loading")}</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <FolderKanban className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">{t("dashboard:noProjectsAssigned")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("dashboard:projectsWillAppear")}</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {projects.map((project) => {
                const phases = (project as any).project_phases || [];
                const totalPhases = phases.length;
                const completedPhases = phases.filter((p: any) => p.is_completed).length;
                const totalItems = phases.reduce((acc: number, p: any) => acc + (p.phase_items?.length || 0), 0);
                const completedItems = phases.reduce((acc: number, p: any) => acc + (p.phase_items?.filter((i: any) => i.is_completed)?.length || 0), 0);
                const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
                const status = (project as any).project_statuses;

                return (
                  <div
                    key={project.id}
                    className="glass-card p-5 space-y-3 cursor-pointer hover:border-primary/40 transition-colors"
                    onClick={() => navigate("/dashboard/projects")}
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-foreground">{project.name}</h3>
                      {status && (
                        <Badge
                          variant="outline"
                          style={{ borderColor: status.color || undefined, color: status.color || undefined }}
                        >
                          {status.name}
                        </Badge>
                      )}
                    </div>
                    {project.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(project.start_date), "dd MMM yyyy", { locale: dateLocale })}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {completedPhases}/{totalPhases} {t("dashboard:phases", "fases")}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {completedItems}/{totalItems} items
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={progress} className="h-1.5 flex-1" />
                      <span className="text-xs font-semibold text-muted-foreground">{progress}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
