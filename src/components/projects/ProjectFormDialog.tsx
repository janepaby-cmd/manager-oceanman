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
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

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

  const dateLocale = i18n.language === "es" ? es : undefined;

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || "");
      setFiscalYear(project.fiscal_year);
      setStatusId(project.status_id || "");
      setStartDate(new Date(project.start_date));
      setEndDate(project.estimated_end_date ? new Date(project.estimated_end_date) : undefined);
    } else {
      setName("");
      setDescription("");
      setFiscalYear(new Date().getFullYear());
      setStatusId(statuses[0]?.id || "");
      setStartDate(new Date());
      setEndDate(undefined);
    }
  }, [project, open, statuses]);

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
    };

    let error;
    if (project) {
      ({ error } = await supabase.from("projects").update(data).eq("id", project.id));
    } else {
      data.created_by = user!.id;
      ({ error } = await supabase.from("projects").insert(data));
    }

    setSaving(false);
    if (error) { toast.error(t("errorSaving") + ": " + error.message); return; }
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common:cancel")}</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? t("common:saving") : t("common:save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
