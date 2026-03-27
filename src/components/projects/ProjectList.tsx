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
  const [projects, setProjects] = useState<Project[]>([]);
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const canManage = hasRole("superadmin") || hasRole("admin") || hasRole("manager");

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
          return { ...p, status_name: st?.name ?? "Sin estado", status_color: st?.color ?? "#6b7280" };
        })
      );
    }
    setLoading(false);
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("projects").delete().eq("id", deleteId);
    if (error) toast.error("Error al eliminar proyecto");
    else { toast.success("Proyecto eliminado"); fetchProjects(); }
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Lista de Proyectos</h2>
        {canManage && (
          <Button onClick={() => { setEditProject(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nuevo Proyecto
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-8">Cargando...</p>
      ) : projects.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">No hay proyectos aún. ¡Crea tu primer proyecto!</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Ejercicio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha inicio</TableHead>
                <TableHead>Fecha fin est.</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
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
                  <TableCell>{format(new Date(p.start_date), "dd/MM/yyyy", { locale: es })}</TableCell>
                  <TableCell>
                    {p.estimated_end_date
                      ? format(new Date(p.estimated_end_date), "dd/MM/yyyy", { locale: es })
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
            <AlertDialogTitle>¿Eliminar proyecto?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
