import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, ListChecks, Settings2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: any | null;
  statuses: { id: string; name: string; color: string }[];
  onSaved: () => void;
}

export default function ProjectFormDialog({ open, onOpenChange, project, statuses, onSaved }: Props) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation(["projects", "common"]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [statusId, setStatusId] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [saving, setSaving] = useState(false);
  const [isRestrictive, setIsRestrictive] = useState(false);
  const [maxFilesPerItem, setMaxFilesPerItem] = useState(5);
  const [allowedExtensions, setAllowedExtensions] = useState<string[]>([
    'pdf','doc','docx','xls','xlsx','ppt','pptx',
    'kml','kmz','gpx',
    'jpg','jpeg','png','gif','webp','bmp','tiff','svg',
    'zip'
  ]);
  // Template state
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [useTemplate, setUseTemplate] = useState(false);

  const dateLocale = i18n.language === "es" ? es : undefined;

  useEffect(() => {
    if (open && !project) {
      supabase
        .from("checklist_templates")
        .select("id, name, description")
        .eq("is_active", true)
        .order("name")
        .then(({ data }) => {
          if (data) setTemplates(data);
        });
    }
  }, [open, project]);

  const defaultExtensions = [
    'pdf','doc','docx','xls','xlsx','ppt','pptx',
    'kml','kmz','gpx',
    'jpg','jpeg','png','gif','webp','bmp','tiff','svg',
    'zip'
  ];

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || "");
      setFiscalYear(project.fiscal_year);
      setStatusId(project.status_id || "");
      setStartDate(new Date(project.start_date));
      setEndDate(project.estimated_end_date ? new Date(project.estimated_end_date) : undefined);
      setIsRestrictive(project.is_restrictive || false);
      setMaxFilesPerItem(project.max_files_per_item || 5);
      setAllowedExtensions(project.allowed_file_extensions || defaultExtensions);
      setUseTemplate(false);
      setSelectedTemplateId("");
    } else {
      setName("");
      setDescription("");
      setFiscalYear(new Date().getFullYear());
      setStatusId(statuses[0]?.id || "");
      setStartDate(new Date());
      setEndDate(undefined);
      setIsRestrictive(false);
      setMaxFilesPerItem(5);
      setAllowedExtensions(defaultExtensions);
      setUseTemplate(false);
      setSelectedTemplateId("");
    }
  }, [project, open, statuses]);

  const applyTemplate = async (projectId: string, templateId: string) => {
    // Fetch template phases with items
    const { data: tPhases } = await supabase
      .from("checklist_template_phases")
      .select("id, name, description, position")
      .eq("template_id", templateId)
      .order("position");

    if (!tPhases || tPhases.length === 0) return;

    // Get the default checkbox item type
    const { data: itemTypes } = await supabase
      .from("phase_item_types")
      .select("id, code");

    const typeMap = new Map((itemTypes || []).map((t: any) => [t.code, t.id]));
    const defaultTypeId = typeMap.get("checkbox");

    for (const tPhase of tPhases) {
      // Create project phase
      const { data: newPhase } = await supabase
        .from("project_phases")
        .insert({
          project_id: projectId,
          name: tPhase.name,
          description: tPhase.description,
          position: tPhase.position,
        })
        .select("id")
        .single();

      if (!newPhase) continue;

      // Fetch template items for this phase
      const { data: tItems } = await supabase
        .from("checklist_template_items")
        .select("title, description, item_type_code, position")
        .eq("phase_id", tPhase.id)
        .order("position");

      if (tItems && tItems.length > 0) {
        const itemsToInsert = tItems.map((item: any) => ({
          phase_id: newPhase.id,
          title: item.title,
          description: item.description,
          item_type_id: typeMap.get(item.item_type_code) || defaultTypeId,
          position: item.position,
        }));

        await supabase.from("phase_items").insert(itemsToInsert);
      }
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error(t("nameRequired")); return; }
    setSaving(true);

    const data: any = {
      name: name.trim(),
      description: description.trim() || null,
      fiscal_year: fiscalYear,
      status_id: statusId || null,
      start_date: startDate.toISOString(),
      estimated_end_date: endDate?.toISOString() || null,
      is_restrictive: isRestrictive,
      max_files_per_item: maxFilesPerItem,
      allowed_file_extensions: allowedExtensions,
    };

    let error;
    let newProjectId: string | null = null;

    if (project) {
      ({ error } = await supabase.from("projects").update(data).eq("id", project.id));
    } else {
      data.created_by = user!.id;
      const res = await supabase.from("projects").insert(data).select("id").single();
      error = res.error;
      newProjectId = res.data?.id || null;
    }

    if (error) {
      setSaving(false);
      toast.error(t("errorSaving") + ": " + error.message);
      return;
    }

    // Auto-assign creator to project
    if (!project && newProjectId && user) {
      await supabase.from("project_users").insert({ project_id: newProjectId, user_id: user.id });
    }

    // Apply template if selected
    if (!project && useTemplate && selectedTemplateId && newProjectId) {
      try {
        await applyTemplate(newProjectId, selectedTemplateId);
        toast.success(t("templateApplied"));
      } catch (e) {
        console.error("Error applying template:", e);
      }
    }

    setSaving(false);
    toast.success(project ? t("projectUpdated") : t("projectCreated"));
    onOpenChange(false);
    onSaved();
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{project ? t("editProject") : t("newProject")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t("projectName")} *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("projectNamePlaceholder")} />
          </div>
          <div>
            <Label>{t("common:description")}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("descriptionPlaceholder")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("fiscalYear")}</Label>
              <Select value={String(fiscalYear)} onValueChange={(v) => setFiscalYear(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("common:status")}</Label>
              <Select value={statusId} onValueChange={setStatusId}>
                <SelectTrigger><SelectValue placeholder={t("selectStatus")} /></SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("startDate")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, "dd/MM/yyyy", { locale: dateLocale })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>{t("estimatedEndDate")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy", { locale: dateLocale }) : t("selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Restrictive execution */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="is-restrictive"
              checked={isRestrictive}
              onCheckedChange={(c) => setIsRestrictive(!!c)}
            />
            <div>
              <label htmlFor="is-restrictive" className="text-sm font-medium cursor-pointer">{t("isRestrictive")}</label>
              <p className="text-xs text-muted-foreground">{t("isRestrictiveHint")}</p>
            </div>
          </div>

          {/* File attachment configuration */}
          <div className="rounded-lg border border-dashed p-4 space-y-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{t("fileConfig")}</span>
            </div>
            <div>
              <Label>{t("maxFilesPerItem")}</Label>
              <p className="text-xs text-muted-foreground mb-1">{t("maxFilesPerItemHint")}</p>
              <Select value={String(maxFilesPerItem)} onValueChange={(v) => setMaxFilesPerItem(Number(v))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,5,10,15,20].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("allowedFileTypes")}</Label>
              <p className="text-xs text-muted-foreground mb-2">{t("allowedFileTypesHint")}</p>
              <div className="space-y-2">
                {[
                  { label: t("fileGroupDocuments"), exts: ["pdf","doc","docx","xls","xlsx","ppt","pptx"] },
                  { label: t("fileGroupImages"), exts: ["jpg","jpeg","png","gif","webp","bmp","tiff","svg"] },
                  { label: t("fileGroupGeo"), exts: ["kml","kmz","gpx"] },
                  { label: t("fileGroupOther"), exts: ["zip"] },
                ].map((group) => {
                  const allChecked = group.exts.every(e => allowedExtensions.includes(e));
                  const someChecked = group.exts.some(e => allowedExtensions.includes(e));
                  return (
                    <div key={group.label} className="flex items-center gap-2">
                      <Checkbox
                        checked={allChecked ? true : someChecked ? "indeterminate" : false}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setAllowedExtensions(prev => [...new Set([...prev, ...group.exts])]);
                          } else {
                            setAllowedExtensions(prev => prev.filter(e => !group.exts.includes(e)));
                          }
                        }}
                      />
                      <span className="text-sm">{group.label}</span>
                      <span className="text-xs text-muted-foreground">({group.exts.map(e => `.${e}`).join(", ")})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {!project && templates.length > 0 && (
            <div className="rounded-lg border border-dashed p-4 space-y-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="use-template"
                  checked={useTemplate}
                  onCheckedChange={(c) => {
                    setUseTemplate(!!c);
                    if (!c) setSelectedTemplateId("");
                  }}
                />
                <label htmlFor="use-template" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                  <ListChecks className="h-4 w-4 text-primary" />
                  {t("useTemplate")}
                </label>
              </div>
              {useTemplate && (
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectTemplate")} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((tmpl) => (
                      <SelectItem key={tmpl.id} value={tmpl.id}>
                        {tmpl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {useTemplate && selectedTemplateId && (
                <p className="text-xs text-muted-foreground">
                  {templates.find((t) => t.id === selectedTemplateId)?.description}
                </p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common:cancel")}</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? t("common:saving") : t("common:save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
