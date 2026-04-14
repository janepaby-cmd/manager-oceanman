import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Users, CheckCircle2, Circle, Layers, FileText, Receipt, PiggyBank, FileSpreadsheet, Search, UserPlus, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import InvoiceModule from "@/components/invoices/InvoiceModule";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import SortablePhaseCard from "./SortablePhaseCard";
import PhaseFormDialog from "./PhaseFormDialog";
import ProjectUsersDialog from "./ProjectUsersDialog";
import ExpenseList from "./ExpenseList";
import ProjectDocuments from "./ProjectDocuments";
import BudgetModule from "@/components/budget/BudgetModule";
import ExternalUsersList from "./external-users/ExternalUsersList";
import ExternalSentItemsTab from "./external-users/ExternalSentItemsTab";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";

interface Props {
  projectId: string;
  onBack: () => void;
}

export default function ProjectDetail({ projectId, onBack }: Props) {
  const { hasRole } = useAuth();
  const { can } = usePermissions();
  const { t, i18n } = useTranslation(["projects", "common", "budget", "expenses"]);
  const [project, setProject] = useState<any>(null);
  const [phases, setPhases] = useState<any[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [showPhaseForm, setShowPhaseForm] = useState(false);
  const [editPhase, setEditPhase] = useState<any>(null);
  const [docsRefreshKey, setDocsRefreshKey] = useState(0);
  const [showUsers, setShowUsers] = useState(false);
  const [phaseSearch, setPhaseSearch] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handlePhaseDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = phases.findIndex(p => p.id === active.id);
    const newIndex = phases.findIndex(p => p.id === over.id);
    const reordered = arrayMove(phases, oldIndex, newIndex);
    setPhases(reordered);
    // Persist new positions
    await Promise.all(reordered.map((p, i) =>
      supabase.from("project_phases").update({ position: i }).eq("id", p.id)
    ));
  };

  const canManageProject = can("update", "projects");
  const canCreatePhase = can("create", "phases");
  const canEditPhase = can("update", "phases");
  const canDeletePhase = can("delete", "phases");
  const canCompleteItems = can("complete", "phases");
  const canReadBudget = can("read", "budget");
  const canReadInvoices = can("read", "invoices");
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
      {/* Header */}
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

      {/* Summary cards */}
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
          <p className="text-[10px] text-muted-foreground leading-none">{t("tab_phases")}</p>
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

      {/* Tabs */}
      <Tabs defaultValue="phases" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="phases" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Layers className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("tab_phases")}</span>
            <span className="sm:hidden">{t("tab_phases")}</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("tab_documents")}</span>
            <span className="sm:hidden">{t("tab_documents_short")}</span>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Receipt className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("tab_expenses")}</span>
            <span className="sm:hidden">{t("tab_expenses_short")}</span>
          </TabsTrigger>
          {canReadBudget && (
            <TabsTrigger value="budget" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <PiggyBank className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("budget:module_name")}</span>
              <span className="sm:hidden">{t("budget:module_name")}</span>
            </TabsTrigger>
          )}
          {canReadInvoices && (
            <TabsTrigger value="invoices" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("tab_invoices")}</span>
              <span className="sm:hidden">{t("tab_invoices_short")}</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="external-users" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <UserPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("tab_external_users")}</span>
            <span className="sm:hidden">{t("tab_external_users_short")}</span>
          </TabsTrigger>
          <TabsTrigger value="external-sent" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("tab_sent_external")}</span>
            <span className="sm:hidden">{t("tab_sent_external_short")}</span>
          </TabsTrigger>
        </TabsList>

        {/* Phases */}
        <TabsContent value="phases">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-lg font-semibold">{t("tab_phases")}</h3>
              <div className="flex items-center gap-2 flex-1 justify-end">
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("searchPhasesItems")}
                    value={phaseSearch}
                    onChange={(e) => setPhaseSearch(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
                {canCreatePhase && (
                  <Button size="sm" onClick={() => { setEditPhase(null); setShowPhaseForm(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> {t("newPhase")}
                  </Button>
                )}
              </div>
            </div>
            {phases.length === 0 ? (
              <div className="border rounded-lg p-8 text-center text-muted-foreground">
                {t("noPhases")}
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePhaseDragEnd}>
                <SortableContext items={phases.map(p => p.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {phases.map((phase, index) => {
                      const isLocked = project.is_restrictive && index > 0 && !phases[index - 1].is_completed;
                      return (
                        <SortablePhaseCard
                          key={phase.id}
                          id={phase.id}
                          phase={phase}
                          canManage={canEditPhase}
                          canDelete={canDeletePhase}
                          canCreateItems={canCreatePhase}
                          canCompleteItems={canCompleteItems}
                          isLocked={isLocked}
                          maxFiles={project.max_files_per_item || 5}
                          allowedExtensions={project.allowed_file_extensions || undefined}
                          onEdit={() => { setEditPhase(phase); setShowPhaseForm(true); }}
                          onDeleted={fetchPhases}
                          onUpdated={fetchPhases}
                          searchTerm={phaseSearch}
                          isDragDisabled={!canEditPhase || !!phaseSearch}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents">
          <ProjectDocuments projectId={projectId} refreshKey={docsRefreshKey} />
        </TabsContent>

        {/* Expenses */}
        <TabsContent value="expenses">
          <ExpenseList projectId={projectId} canManage={can("create", "expenses")} canEdit={can("update", "expenses")} canDelete={can("delete", "expenses")} />
        </TabsContent>

        {/* Budget */}
        {canReadBudget && (
          <TabsContent value="budget">
            <BudgetModule projectId={projectId} />
          </TabsContent>
        )}

        {/* Invoices */}
        {canReadInvoices && (
          <TabsContent value="invoices">
            <InvoiceModule projectId={projectId} />
          </TabsContent>
        )}

        {/* External Users */}
        <TabsContent value="external-users">
          <ExternalUsersList projectId={projectId} canManage={canManageProject} />
        </TabsContent>

        {/* External Sent Items */}
        <TabsContent value="external-sent">
          <ExternalSentItemsTab projectId={projectId} />
        </TabsContent>
      </Tabs>

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
