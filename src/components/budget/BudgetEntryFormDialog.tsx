import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Category { id: string; name: string; type: string; }
interface Entry {
  id: string; project_id: string; category_id: string | null; date: string;
  concept: string; amount: number; type: string; status: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  categories: Category[];
  entry: Entry | null;
  onSaved: () => void;
}

export default function BudgetEntryFormDialog({ open, onOpenChange, projectId, categories, entry, onSaved }: Props) {
  const { t } = useTranslation("budget");
  const isEdit = !!entry;

  const [type, setType] = useState<string>("expense");
  const [categoryId, setCategoryId] = useState<string>("");
  const [date, setDate] = useState("");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("pending");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entry) {
      setType(entry.type);
      setCategoryId(entry.category_id || "");
      setDate(entry.date);
      setConcept(entry.concept);
      setAmount(entry.amount.toString());
      setStatus(entry.status);
    } else {
      setType("expense");
      setCategoryId("");
      setDate(new Date().toISOString().split("T")[0]);
      setConcept("");
      setAmount("");
      setStatus("pending");
    }
  }, [entry, open]);

  const filteredCats = categories.filter(c => c.type === type);

  const handleSave = async () => {
    if (!concept.trim()) { toast.error(t("entries.concept_required")); return; }
    if (!amount || parseFloat(amount) <= 0) { toast.error(t("entries.amount_required")); return; }
    setSaving(true);

    const payload = {
      project_id: projectId,
      type,
      category_id: categoryId || null,
      date,
      concept: concept.trim(),
      amount: parseFloat(amount),
      status,
    };

    const { error } = isEdit
      ? await supabase.from("budget_entries").update(payload).eq("id", entry!.id)
      : await supabase.from("budget_entries").insert(payload);

    setSaving(false);
    if (error) { toast.error(t("common:error")); return; }
    toast.success(isEdit ? t("entries.entry_updated") : t("entries.entry_created"));
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("entries.edit_entry") : t("entries.add_entry")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t("entries.type")}</Label>
            <Select value={type} onValueChange={v => { setType(v); setCategoryId(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="income">{t("entries.type_income")}</SelectItem>
                <SelectItem value="expense">{t("entries.type_expense")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("entries.category")}</Label>
            <Select value={categoryId || "none"} onValueChange={v => setCategoryId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder={t("entries.all_categories")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("entries.no_category")}</SelectItem>
                {filteredCats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("entries.date")}</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <Label>{t("entries.concept")}</Label>
            <Input value={concept} onChange={e => setConcept(e.target.value)} placeholder={t("entries.concept")} />
          </div>
          <div>
            <Label>{t("entries.amount")}</Label>
            <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <Label>{t("entries.status")}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">{t("entries.status_pending")}</SelectItem>
                <SelectItem value="confirmed">{t("entries.status_confirmed")}</SelectItem>
                <SelectItem value="paid">{t("entries.status_paid")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common:cancel", "Cancelar")}</Button>
          <Button onClick={handleSave} disabled={saving}>{t("common:save", "Guardar")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
