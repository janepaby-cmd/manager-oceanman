import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Eye, Pencil, Trash2 } from "lucide-react";
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
  const { t, i18n } = useTranslation(["projects", "common"]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const canManage = hasRole("superadmin") || hasRole("admin") || hasRole("manager");
  const dateLocale = i18n.language === "es" ? es : undefined;

  const fetchProjects = async () => {
    setLoading(true);
    const [projRes, statusRes] = await Promise.all([
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase.from("project_statuses").select("*").order("position"),
    ]);

    if (statusRes.data) setStatuses(statusRes.data);

    if (projRes.data && statusRes.data) {
      const statusMap = new Map(statusRes.data.map((s: any) => [s.id, s]));
      setProjects(
        projRes.data.map((p: any) => {
          const st = statusMap.get(p.status_id);
          return { ...p, status_name: st?.name ?? t("noStatus"), status_color: st?.color ?? "#6b7280" };
        })
      );
    }
    setLoading(false);
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("projects").delete().eq("id", deleteId);
    if (error) toast.error(t("errorDeleting"));
    else { toast.success(t("projectDeleted")); fetchProjects(); }
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("list")}</h2>
        {canManage && (
          <Button onClick={() => { setEditProject(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" /> {t("newProject")}
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-8">{t("common:loading")}</p>
      ) : projects.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">{t("noProjects")}</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common:name")}</TableHead>
                <TableHead>{t("fiscalYear")}</TableHead>
                <TableHead>{t("common:status")}</TableHead>
                <TableHead>{t("startDate")}</TableHead>
                <TableHead>{t("estimatedEndDate")}</TableHead>
                <TableHead className="text-right">{t("common:actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.fiscal_year}</TableCell>
                  <TableCell>
                    <Badge style={{ backgroundColor: p.status_color, color: "#fff" }}>
                      {p.status_name}
                    </Badge>
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
                    {canManage && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => { setEditProject(p); setShowForm(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ProjectFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        project={editProject}
        statuses={statuses}
        onSaved={fetchProjects}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteProject")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteProjectConfirm")}</AlertDialogDescription>
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
