import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Eye, Pencil, Trash2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import ProjectFormDialog from "./ProjectFormDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Project {
  id: string;
  name: string;
  description: string | null;
  fiscal_year: number;
  status_id: string | null;
  start_date: string;
  estimated_end_date: string | null;
  created_at: string;
  status_name?: string;
  status_color?: string;
}

interface ProjectStatus {
  id: string;
  name: string;
  color: string;
}

interface Props {
  onSelectProject: (id: string) => void;
}

export default function ProjectList({ onSelectProject }: Props) {
  const { hasRole } = useAuth();
  const { can } = usePermissions();
  const { t, i18n } = useTranslation(["projects", "common"]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteCascadeInfo, setDeleteCascadeInfo] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const canCreate = can("create", "projects");
  const canEdit = can("update", "projects");
  const canDelete = hasRole("superadmin"); // Only superadmin can delete projects
  const dateLocale = i18n.language === "es" ? es : undefined;

  const fetchProjects = async () => {
    setLoading(true);
    const [projRes, statusRes] = await Promise.all([
      supabase.from("projects").select(`
        *,
        project_phases (
          id, is_completed,
          phase_items ( id, is_completed )
        )
      `).order("created_at", { ascending: false }),
      supabase.from("project_statuses").select("*").order("position"),
    ]);

    if (statusRes.data) setStatuses(statusRes.data);

    if (projRes.data && statusRes.data) {
      const statusMap = new Map(statusRes.data.map((s: any) => [s.id, s]));
      setProjects(
        projRes.data.map((p: any) => {
          const st = statusMap.get(p.status_id);
          const phases = p.project_phases || [];
          const totalPhases = phases.length;
          const completedPhases = phases.filter((ph: any) => ph.is_completed).length;
          const totalItems = phases.reduce((acc: number, ph: any) => acc + (ph.phase_items?.length || 0), 0);
          const completedItems = phases.reduce((acc: number, ph: any) => acc + (ph.phase_items?.filter((i: any) => i.is_completed)?.length || 0), 0);
          const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
          return {
            ...p,
            status_name: st?.name ?? t("noStatus"),
            status_color: st?.color ?? "#6b7280",
            totalPhases, completedPhases, totalItems, completedItems, progress,
          };
        })
      );
    }
    setLoading(false);
  };

  useEffect(() => { fetchProjects(); }, []);

  const fetchDeleteCascadeInfo = async (projectId: string) => {
    const [phasesRes, expensesRes, usersRes] = await Promise.all([
      supabase.from("project_phases").select("id").eq("project_id", projectId),
      supabase.from("project_expenses").select("id").eq("project_id", projectId),
      supabase.from("project_users").select("id").eq("project_id", projectId),
    ]);

    const phaseIds = (phasesRes.data || []).map((p: any) => p.id);
    let totalItems = 0, totalComments = 0, totalFiles = 0;

    if (phaseIds.length > 0) {
      const [itemsRes] = await Promise.all([
        supabase.from("phase_items").select("id").in("phase_id", phaseIds),
      ]);
      const itemIds = (itemsRes.data || []).map((i: any) => i.id);
      totalItems = itemIds.length;

      if (itemIds.length > 0) {
        const [commentsRes, filesRes] = await Promise.all([
          supabase.from("phase_item_comments").select("id").in("item_id", itemIds),
          supabase.from("phase_item_files").select("id").in("item_id", itemIds),
        ]);
        totalComments = (commentsRes.data || []).length;
        totalFiles = (filesRes.data || []).length;
      }
    }

    return {
      phases: phaseIds.length,
      items: totalItems,
      comments: totalComments,
      files: totalFiles,
      expenses: (expensesRes.data || []).length,
      users: (usersRes.data || []).length,
    };
  };

  const handleRequestDelete = async (projectId: string) => {
    setDeleteId(projectId);
    const info = await fetchDeleteCascadeInfo(projectId);
    setDeleteCascadeInfo(info);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from("projects").delete().eq("id", deleteId);
    if (error) toast.error(t("errorDeleting"));
    else { toast.success(t("projectDeleted")); fetchProjects(); }
    setDeleteId(null);
    setDeleteCascadeInfo(null);
    setDeleting(false);
  };

  const years = [...new Set(projects.map((p) => p.fiscal_year))].sort((a, b) => b - a);

  const filtered = projects.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "all" && p.status_id !== filterStatus) return false;
    if (filterYear !== "all" && p.fiscal_year !== Number(filterYear)) return false;
    return true;
  });

  const deleteProject = deleteId ? projects.find(p => p.id === deleteId) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("list")}</h2>
        {canCreate && (
          <Button onClick={() => { setEditProject(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" /> {t("newProject")}
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchByName", "Buscar por nombre...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t("common:status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allStatuses", "Todos los estados")}</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder={t("fiscalYear")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allYears", "Todos los años")}</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-8">{t("common:loading")}</p>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">{projects.length === 0 ? t("noProjects") : t("noResults", "No se encontraron resultados")}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="border rounded-lg hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common:name")}</TableHead>
                  <TableHead>{t("fiscalYear")}</TableHead>
                  <TableHead>{t("common:status")}</TableHead>
                  <TableHead>{t("progress", "Progreso")}</TableHead>
                  <TableHead>{t("startDate")}</TableHead>
                  <TableHead>{t("estimatedEndDate")}</TableHead>
                  <TableHead className="text-right">{t("common:actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.fiscal_year}</TableCell>
                    <TableCell>
                      <Badge style={{ backgroundColor: p.status_color, color: "#fff" }}>
                        {p.status_name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={(p as any).progress ?? 0} className="h-2 flex-1" />
                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                          {(p as any).progress ?? 0}%
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {(p as any).completedPhases}/{(p as any).totalPhases} {t("phases", "fases")} · {(p as any).completedItems}/{(p as any).totalItems} items
                      </span>
                    </TableCell>
                    <TableCell>{format(new Date(p.start_date), "dd/MM/yyyy", { locale: dateLocale })}</TableCell>
                    <TableCell>
                      {p.estimated_end_date
                        ? format(new Date(p.estimated_end_date), "dd/MM/yyyy", { locale: dateLocale })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => onSelectProject(p.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                          <Button variant="ghost" size="icon" onClick={() => { setEditProject(p); setShowForm(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                      )}
                      {canDelete && (
                          <Button variant="ghost" size="icon" onClick={() => handleRequestDelete(p.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="glass-card p-4 space-y-3 cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => onSelectProject(p.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm flex-1 min-w-0 truncate">{p.name}</h3>
                  <Badge style={{ backgroundColor: p.status_color, color: "#fff" }} className="shrink-0 text-xs">
                    {p.status_name}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={(p as any).progress ?? 0} className="h-1.5 flex-1" />
                  <span className="text-xs font-semibold text-muted-foreground">{(p as any).progress ?? 0}%</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{format(new Date(p.start_date), "dd/MM/yyyy", { locale: dateLocale })}</span>
                  <span>{(p as any).completedPhases}/{(p as any).totalPhases} {t("phases", "fases")} · {(p as any).completedItems}/{(p as any).totalItems} items</span>
                </div>
                {(canEdit || canDelete) && (
                  <div className="flex justify-end gap-1 pt-1 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditProject(p); setShowForm(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRequestDelete(p.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      <ProjectFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        project={editProject}
        statuses={statuses}
        onSaved={fetchProjects}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) { setDeleteId(null); setDeleteCascadeInfo(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">{t("deleteProject")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="font-medium">{deleteProject?.name}</p>
                {deleteCascadeInfo && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                    <p className="text-sm font-medium text-destructive">{t("deleteProjectCascadeWarning")}</p>
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {t("deleteProjectCascadeDetail", {
                        phases: deleteCascadeInfo.phases,
                        items: deleteCascadeInfo.items,
                        comments: deleteCascadeInfo.comments,
                        files: deleteCascadeInfo.files,
                        expenses: deleteCascadeInfo.expenses,
                        users: deleteCascadeInfo.users,
                      })}
                    </pre>
                  </div>
                )}
                <p className="text-sm">{t("deleteProjectConfirm")}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? t("deletingProject") : t("common:delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
