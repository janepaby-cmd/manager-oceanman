import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  tax: any;
  onSaved: () => void;
}

export default function TaxFormDialog({ open, onOpenChange, projectId, tax, onSaved }: Props) {
  const { t } = useTranslation("taxes");
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [type, setType] = useState<"addition" | "deduction">("addition");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tax) {
      setName(tax.name);
      setRate(String(tax.rate));
      setType(tax.type);
    } else {
      setName("");
      setRate("");
      setType("addition");
    }
  }, [tax, open]);

  const handleSave = async () => {
    if (!name.trim() || !rate) return;
    setSaving(true);
    const payload = { project_id: projectId, name: name.trim(), rate: Number(rate), type };
    if (tax) {
      await supabase.from("invoice_taxes").update(payload).eq("id", tax.id);
    } else {
      await supabase.from("invoice_taxes").insert(payload);
    }
    setSaving(false);
    toast.success(t("saved"));
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{tax ? t("edit") : t("new_tax")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>{t("name")}</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="IVA 21%" /></div>
          <div><Label>{t("rate")}</Label><Input type="number" step="0.01" value={rate} onChange={e => setRate(e.target.value)} placeholder="21" /></div>
          <div>
            <Label>{t("type")}</Label>
            <Select value={type} onValueChange={v => setType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="addition">{t("type_addition")}</SelectItem>
                <SelectItem value="deduction">{t("type_deduction")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button onClick={handleSave} disabled={saving || !name.trim() || !rate}>{t("save")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
