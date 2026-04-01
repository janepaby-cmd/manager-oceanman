import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Users, CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import PhaseCard from "./PhaseCard";
import PhaseFormDialog from "./PhaseFormDialog";
import ProjectUsersDialog from "./ProjectUsersDialog";
import ExpenseList from "./ExpenseList";
import ProjectDocuments from "./ProjectDocuments";

interface Props {
  projectId: string;
  onBack: () => void;
}

export default function ProjectDetail({ projectId, onBack }: Props) {
  const { hasRole } = useAuth();
  const { can } = usePermissions();
  const { t, i18n } = useTranslation(["projects", "common"]);
  const [project, setProject] = useState<any>(null);
  const [phases, setPhases] = useState<any[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [showPhaseForm, setShowPhaseForm] = useState(false);
  const [editPhase, setEditPhase] = useState<any>(null);
  const [docsRefreshKey, setDocsRefreshKey] = useState(0);
  const [showUsers, setShowUsers] = useState(false);

  const canManageProject = can("update", "projects");
  const canCreatePhase = can("create", "phases");
  const canEditPhase = can("update", "phases");
  const canDeletePhase = can("delete", "phases");
  const dateLocale = i18n.language === "es" ? es : undefined;

  const fetchProject = useCallback(async () => {
    const { data } = await supabase.from("projects").select("*").eq("id", projectId).single();
    if (data) {
      setProject(data);
      if (data.status_id) {
        const { data: st } = await supabase.from("project_statuses").select("*").eq("id", data.status_id).single();
        setStatus(st);
      }
    }
  }, [projectId]);

  const fetchPhases = useCallback(async () => {
    const { data } = await supabase
      .from("project_phases")
      .select("*")
      .eq("project_id", projectId)
      .order("position");
    if (data) setPhases(data);
    setDocsRefreshKey((k) => k + 1);
  }, [projectId]);

  useEffect(() => {
    fetchProject();
    fetchPhases();
  }, [fetchProject, fetchPhases]);

  if (!project) return <p className="text-center py-8 text-muted-foreground">{t("common:loading")}</p>;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-bold truncate">{project.name}</h2>
          {project.description && <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{project.description}</p>}
        </div>
        {status && (
          <Badge className="shrink-0" style={{ backgroundColor: status.color, color: "#fff" }}>{status.name}</Badge>
        )}
        {canManageProject && (
          <Button variant="outline" size="sm" onClick={() => setShowUsers(true)} className="shrink-0 hidden sm:flex">
            <Users className="h-4 w-4 mr-2" /> {t("users")}
          </Button>
        )}
        {canManageProject && (
          <Button variant="outline" size="icon" onClick={() => setShowUsers(true)} className="shrink-0 sm:hidden h-8 w-8">
            <Users className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-md border bg-card px-2 py-1.5">
          <p className="text-[10px] text-muted-foreground leading-none">{t("fiscalYear")}</p>
          <p className="text-sm font-semibold">{project.fiscal_year}</p>
        </div>
        <div className="rounded-md border bg-card px-2 py-1.5">
          <p className="text-[10px] text-muted-foreground leading-none">{t("start")}</p>
          <p className="text-sm font-semibold">{format(new Date(project.start_date), "dd/MM/yy", { locale: dateLocale })}</p>
        </div>
        <div className="rounded-md border bg-card px-2 py-1.5">
          <p className="text-[10px] text-muted-foreground leading-none">{t("estimatedEnd")}</p>
          <p className="text-sm font-semibold">{project.estimated_end_date ? format(new Date(project.estimated_end_date), "dd/MM/yy", { locale: dateLocale }) : "—"}</p>
        </div>
        <div className="rounded-md border bg-card px-2 py-1.5">
          <p className="text-[10px] text-muted-foreground leading-none">{t("phases")}</p>
          <div className="flex items-center gap-1">
            <p className="text-sm font-semibold">{phases.filter(p => p.is_completed).length}/{phases.length}</p>
            {phases.length > 0 && phases.every(p => p.is_completed) ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Circle className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t("phases")}</h3>
          {canCreatePhase && (
            <Button size="sm" onClick={() => { setEditPhase(null); setShowPhaseForm(true); }}>
              <Plus className="h-4 w-4 mr-2" /> {t("newPhase")}
            </Button>
          )}
        </div>

        {phases.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            {t("noPhases")}
          </div>
        ) : (
          <div className="space-y-3">
            {phases.map((phase, index) => {
              const isLocked = project.is_restrictive && index > 0 && !phases[index - 1].is_completed;
              return (
                <PhaseCard
                  key={phase.id}
                  phase={phase}
                  canManage={canManage}
                  isLocked={isLocked}
                  maxFiles={project.max_files_per_item || 5}
                  allowedExtensions={project.allowed_file_extensions || undefined}
                  onEdit={() => { setEditPhase(phase); setShowPhaseForm(true); }}
                  onDeleted={fetchPhases}
                  onUpdated={fetchPhases}
                />
              );
            })}
          </div>
        )}
      </div>

      <ProjectDocuments projectId={projectId} refreshKey={docsRefreshKey} />

      <ExpenseList projectId={projectId} canManage={canManage} />

      <PhaseFormDialog
        open={showPhaseForm}
        onOpenChange={setShowPhaseForm}
        projectId={projectId}
        phase={editPhase}
        nextPosition={phases.length}
        onSaved={fetchPhases}
      />

      <ProjectUsersDialog
        open={showUsers}
        onOpenChange={setShowUsers}
        projectId={projectId}
      />
    </div>
  );
}
