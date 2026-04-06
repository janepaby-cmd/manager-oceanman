import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  supplier: any;
  onSaved: () => void;
}

export default function SupplierFormDialog({ open, onOpenChange, supplier, onSaved }: Props) {
  const { t } = useTranslation("contacts");
  const [form, setForm] = useState({
    name: "", tax_id: "", address: "", city: "", zip: "", country: "",
    email: "", phone: "", bank_account: "", payment_terms: 30, supplier_type: "supplier" as string, notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name || "", tax_id: supplier.tax_id || "", address: supplier.address || "",
        city: supplier.city || "", zip: supplier.zip || "", country: supplier.country || "",
        email: supplier.email || "", phone: supplier.phone || "", bank_account: supplier.bank_account || "",
        payment_terms: supplier.payment_terms ?? 30, supplier_type: supplier.supplier_type || "supplier", notes: supplier.notes || "",
      });
    } else {
      setForm({ name: "", tax_id: "", address: "", city: "", zip: "", country: "", email: "", phone: "", bank_account: "", payment_terms: 30, supplier_type: "supplier", notes: "" });
    }
  }, [supplier, open]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { ...form, name: form.name.trim(), payment_terms: Number(form.payment_terms) || 30 };
    if (supplier) {
      await supabase.from("suppliers").update(payload).eq("id", supplier.id);
    } else {
      await supabase.from("suppliers").insert(payload);
    }
    setSaving(false);
    toast.success(t("save"));
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{supplier ? t("edit") : t("new_supplier")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>{t("name")}*</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
            <div><Label>{t("tax_id")}</Label><Input value={form.tax_id} onChange={e => set("tax_id", e.target.value)} /></div>
            <div>
              <Label>{t("supplier_type")}</Label>
              <Select value={form.supplier_type} onValueChange={v => set("supplier_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="supplier">{t("type_supplier")}</SelectItem>
                  <SelectItem value="creditor">{t("type_creditor")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t("email")}</Label><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} /></div>
            <div><Label>{t("phone")}</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
            <div><Label>{t("address")}</Label><Input value={form.address} onChange={e => set("address", e.target.value)} /></div>
            <div><Label>{t("city")}</Label><Input value={form.city} onChange={e => set("city", e.target.value)} /></div>
            <div><Label>{t("zip")}</Label><Input value={form.zip} onChange={e => set("zip", e.target.value)} /></div>
            <div><Label>{t("country")}</Label><Input value={form.country} onChange={e => set("country", e.target.value)} /></div>
            <div><Label>{t("bank_account")}</Label><Input value={form.bank_account} onChange={e => set("bank_account", e.target.value)} /></div>
            <div><Label>{t("payment_terms")}</Label><Input type="number" value={form.payment_terms} onChange={e => set("payment_terms", e.target.value)} /></div>
          </div>
          <div><Label>{t("notes")}</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>{t("save")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
