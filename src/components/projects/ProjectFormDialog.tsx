import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [endDate, setEndDate] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d;
  });
  const [saving, setSaving] = useState(false);
  const [isRestrictive, setIsRestrictive] = useState(false);
  const [maxFilesPerItem, setMaxFilesPerItem] = useState(5);
  const [allowedExtensions, setAllowedExtensions] = useState<string[]>([
    'pdf','doc','docx','xls','xlsx','ppt','pptx',
    'kml','kmz','gpx',
    'jpg','jpeg','png','gif','webp','bmp','tiff','svg',
    'zip'
  ]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [useTemplate, setUseTemplate] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      const defaultEnd = new Date();
      defaultEnd.setFullYear(defaultEnd.getFullYear() + 1);
      setEndDate(defaultEnd);
      setIsRestrictive(false);
      setMaxFilesPerItem(5);
      setAllowedExtensions(defaultExtensions);
      setUseTemplate(false);
      setSelectedTemplateId("");
    }
    setErrors({});
  }, [project, open, statuses]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = t("nameRequired");
    if (!statusId) errs.status = t("statusRequired");
    if (!project && templates.length > 0 && !selectedTemplateId) errs.template = t("templateRequired");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const applyTemplate = async (projectId: string, templateId: string) => {
    const { data: tPhases } = await supabase
      .from("checklist_template_phases")
      .select("id, name, description, position")
      .eq("template_id", templateId)
      .order("position");

    if (!tPhases || tPhases.length === 0) return;

    const { data: itemTypes } = await supabase
      .from("phase_item_types")
      .select("id, code");

    const typeMap = new Map((itemTypes || []).map((t: any) => [t.code, t.id]));
    const defaultTypeId = typeMap.get("checkbox");

    for (const tPhase of tPhases) {
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
    if (!validate()) return;
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

    let error: any = null;
    let newProjectId: string | null = null;

    if (project) {
      ({ error } = await supabase.from("projects").update(data).eq("id", project.id));
    } else {
      newProjectId = crypto.randomUUID();
      data.id = newProjectId;
      data.created_by = user!.id;
      ({ error } = await supabase.from("projects").insert(data));
    }

    if (error) {
      setSaving(false);
      toast.error(t("errorSaving") + ": " + error.message);
      return;
    }


    if (!project && selectedTemplateId && newProjectId) {
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

  const fileGroups = [
    { label: t("fileGroupDocuments"), exts: ["pdf","doc","docx","xls","xlsx","ppt","pptx"] },
    { label: t("fileGroupImages"), exts: ["jpg","jpeg","png","gif","webp","bmp","tiff","svg"] },
    { label: t("fileGroupGeo"), exts: ["kml","kmz","gpx"] },
    { label: t("fileGroupOther"), exts: ["zip"] },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 flex flex-col max-h-[90dvh] gap-0">
        {/* Fixed header */}
        <DialogHeader className="px-4 pt-4 pb-2 border-b shrink-0">
          <DialogTitle className="text-base">{project ? t("editProject") : t("newProject")}</DialogTitle>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto" data-scroll-area>
          <div className="px-4 py-3 space-y-3">
            {/* Name */}
            <div className="space-y-1">
              <Label className="text-xs">{t("projectName")} <span className="text-destructive">*</span></Label>
              <Input
                value={name}
                onChange={(e) => { setName(e.target.value); setErrors(prev => ({ ...prev, name: "" })); }}
                placeholder={t("projectNamePlaceholder")}
                className={cn("h-8 text-sm", errors.name && "border-destructive")}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label className="text-xs">{t("common:description")}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
                rows={2}
                className="text-sm min-h-[56px]"
              />
            </div>

            {/* Fiscal year + Status */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{t("fiscalYear")}</Label>
                <Select value={String(fiscalYear)} onValueChange={(v) => setFiscalYear(Number(v))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("common:status")} <span className="text-destructive">*</span></Label>
                <Select value={statusId} onValueChange={(v) => { setStatusId(v); setErrors(prev => ({ ...prev, status: "" })); }}>
                  <SelectTrigger className={cn("h-8 text-sm", errors.status && "border-destructive")}>
                    <SelectValue placeholder={t("selectStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.status && <p className="text-xs text-destructive">{errors.status}</p>}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{t("startDate")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal text-xs h-8">
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{format(startDate, "dd/MM/yyyy", { locale: dateLocale })}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("estimatedEndDate")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-xs h-8", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{endDate ? format(endDate, "dd/MM/yyyy", { locale: dateLocale }) : t("selectDate")}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Restrictive */}
            <div className="flex items-start gap-2">
              <Checkbox
                id="is-restrictive"
                checked={isRestrictive}
                onCheckedChange={(c) => setIsRestrictive(!!c)}
                className="mt-0.5"
              />
              <div>
                <label htmlFor="is-restrictive" className="text-xs font-medium cursor-pointer leading-tight">{t("isRestrictive")}</label>
                <p className="text-[11px] text-muted-foreground leading-tight">{t("isRestrictiveHint")}</p>
              </div>
            </div>

            {/* File config */}
            <div className="rounded-md border border-dashed p-2.5 space-y-2 bg-muted/30">
              <div className="flex items-center gap-1.5">
                <Settings2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-xs font-medium">{t("fileConfig")}</span>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">{t("maxFilesPerItem")}</Label>
                <Select value={String(maxFilesPerItem)} onValueChange={(v) => setMaxFilesPerItem(Number(v))}>
                  <SelectTrigger className="w-20 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,5,10,15,20].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">{t("allowedFileTypes")}</Label>
                <div className="space-y-1">
                  {fileGroups.map((group) => {
                    const allChecked = group.exts.every(e => allowedExtensions.includes(e));
                    const someChecked = group.exts.some(e => allowedExtensions.includes(e));
                    return (
                      <div key={group.label} className="flex items-center gap-1.5">
                        <Checkbox
                          checked={allChecked ? true : someChecked ? "indeterminate" : false}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setAllowedExtensions(prev => [...new Set([...prev, ...group.exts])]);
                            } else {
                              setAllowedExtensions(prev => prev.filter(e => !group.exts.includes(e)));
                            }
                          }}
                          className="h-3.5 w-3.5"
                        />
                        <span className="text-[11px]">{group.label}</span>
                        <span className="text-[10px] text-muted-foreground">({group.exts.map(e => `.${e}`).join(", ")})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Template - obligatorio solo en creación */}
            {!project && templates.length > 0 && (
              <div className={cn(
                "rounded-md border border-dashed p-2.5 space-y-2 bg-muted/30",
                errors.template && "border-destructive"
              )}>
                <div className="flex items-center gap-1.5">
                  <ListChecks className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-xs font-medium">{t("useTemplate")} <span className="text-destructive">*</span></span>
                </div>
                <Select value={selectedTemplateId} onValueChange={(v) => { setSelectedTemplateId(v); setErrors(prev => ({ ...prev, template: "" })); }}>
                  <SelectTrigger className={cn("h-8 text-sm", errors.template && "border-destructive")}>
                    <SelectValue placeholder={t("selectTemplate")} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((tmpl) => (
                      <SelectItem key={tmpl.id} value={tmpl.id}>{tmpl.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.template && <p className="text-xs text-destructive">{errors.template}</p>}
                {selectedTemplateId && (
                  <p className="text-[11px] text-muted-foreground">
                    {templates.find((t) => t.id === selectedTemplateId)?.description}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sticky footer */}
        <div className="px-4 py-3 border-t shrink-0 flex justify-end gap-2 bg-background">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{t("common:cancel")}</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? t("common:saving") : t("common:save")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
