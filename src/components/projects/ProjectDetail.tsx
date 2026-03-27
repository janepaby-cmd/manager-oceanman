import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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

interface Props {
  projectId: string;
  onBack: () => void;
}

export default function ProjectDetail({ projectId, onBack }: Props) {
  const { hasRole } = useAuth();
  const { t, i18n } = useTranslation(["projects", "common"]);
  const [project, setProject] = useState<any>(null);
  const [phases, setPhases] = useState<any[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [showPhaseForm, setShowPhaseForm] = useState(false);
  const [editPhase, setEditPhase] = useState<any>(null);
  const [showUsers, setShowUsers] = useState(false);

  const canManage = hasRole("superadmin") || hasRole("admin") || hasRole("manager");
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
  }, [projectId]);

  useEffect(() => {
    fetchProject();
    fetchPhases();
  }, [fetchProject, fetchPhases]);

  if (!project) return <p className="text-center py-8 text-muted-foreground">{t("common:loading")}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{project.name}</h2>
          {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
        </div>
        {status && (
          <Badge style={{ backgroundColor: status.color, color: "#fff" }}>{status.name}</Badge>
        )}
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => setShowUsers(true)}>
            <Users className="h-4 w-4 mr-2" /> {t("users")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{t("fiscalYear")}</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">{project.fiscal_year}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{t("start")}</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">{format(new Date(project.start_date), "dd/MM/yyyy", { locale: dateLocale })}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{t("estimatedEnd")}</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">
            {project.estimated_end_date ? format(new Date(project.estimated_end_date), "dd/MM/yyyy", { locale: dateLocale }) : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{t("phases")}</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2">
            <span className="text-lg font-semibold">{phases.filter(p => p.is_completed).length}/{phases.length}</span>
            {phases.length > 0 && phases.every(p => p.is_completed) ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t("phases")}</h3>
          {canManage && (
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
            {phases.map((phase) => (
              <PhaseCard
                key={phase.id}
                phase={phase}
                canManage={canManage}
                onEdit={() => { setEditPhase(phase); setShowPhaseForm(true); }}
                onDeleted={fetchPhases}
                onUpdated={fetchPhases}
              />
            ))}
          </div>
        )}
      </div>

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
