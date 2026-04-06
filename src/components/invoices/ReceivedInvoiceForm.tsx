import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Line {
  id?: string;
  concept: string;
  quantity: number;
  unit_price: number;
  tax_id: string;
  line_total: number;
}

interface Props {
  projectId: string;
  invoice: any;
  onBack: () => void;
}

export default function ReceivedInvoiceForm({ projectId, invoice, onBack }: Props) {
  const { t } = useTranslation("invoices");
  const { can } = usePermissions();
  const canEdit = can("update", "invoices");

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [extNumber, setExtNumber] = useState(invoice?.ext_number || "");
  const [supplierId, setSupplierId] = useState(invoice?.supplier_id || "");
  const [receiptDate, setReceiptDate] = useState(invoice?.receipt_date || new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(invoice?.due_date || "");
  const [notes, setNotes] = useState(invoice?.notes || "");
  const [status, setStatus] = useState(invoice?.status || "received");
  const [lines, setLines] = useState<Line[]>([]);
  const [saving, setSaving] = useState(false);
  const isNew = !invoice;
  const isLocked = status === "paid";

  const fetchData = useCallback(async () => {
    const [{ data: sp }, { data: tx }] = await Promise.all([
      supabase.from("suppliers").select("id, name").order("name"),
      supabase.from("invoice_taxes").select("*").eq("project_id", projectId).eq("active", true),
    ]);
    if (sp) setSuppliers(sp);
    if (tx) setTaxes(tx);

    if (invoice) {
      const { data: existingLines } = await supabase
        .from("invoice_received_lines")
        .select("*")
        .eq("invoice_id", invoice.id);
      if (existingLines && existingLines.length > 0) {
        setLines(existingLines.map(l => ({
          id: l.id, concept: l.concept, quantity: Number(l.quantity),
          unit_price: Number(l.unit_price), tax_id: l.tax_id || "", line_total: Number(l.line_total),
        })));
      } else {
        setLines([{ concept: "", quantity: 1, unit_price: 0, tax_id: "", line_total: 0 }]);
      }
    } else {
      setLines([{ concept: "", quantity: 1, unit_price: 0, tax_id: "", line_total: 0 }]);
    }
  }, [projectId, invoice]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateLine = (idx: number, field: keyof Line, value: any) => {
    setLines(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      copy[idx].line_total = Number(copy[idx].quantity) * Number(copy[idx].unit_price);
      return copy;
    });
  };

  const addLine = () => setLines(prev => [...prev, { concept: "", quantity: 1, unit_price: 0, tax_id: "", line_total: 0 }]);
  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.line_total, 0), [lines]);

  const taxBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; type: string; rate: number; amount: number }>();
    for (const line of lines) {
      if (!line.tax_id) continue;
      const tax = taxes.find(t => t.id === line.tax_id);
      if (!tax) continue;
      const existing = map.get(tax.id) || { name: tax.name, type: tax.type, rate: Number(tax.rate), amount: 0 };
      existing.amount += line.line_total * Number(tax.rate) / 100;
      map.set(tax.id, existing);
    }
    return Array.from(map.values());
  }, [lines, taxes]);

  const taxTotal = useMemo(() => taxBreakdown.reduce((s, tb) => s + (tb.type === "addition" ? tb.amount : -tb.amount), 0), [taxBreakdown]);
  const total = subtotal + taxTotal;

  const handleSave = async () => {
    if (!extNumber.trim() || !supplierId || lines.some(l => !l.concept.trim())) {
      toast.error("Complete all required fields");
      return;
    }
    setSaving(true);
    try {
      let invoiceId = invoice?.id;
      if (isNew) {
        const { data: inserted, error } = await supabase.from("invoices_received").insert({
          project_id: projectId, supplier_id: supplierId || null, ext_number: extNumber.trim(),
          receipt_date: receiptDate, due_date: dueDate || null, subtotal, tax_total: taxTotal, total,
          status: "received", notes: notes || null,
        }).select("id").single();
        if (error) throw error;
        invoiceId = inserted.id;
      } else {
        await supabase.from("invoices_received").update({
          supplier_id: supplierId || null, ext_number: extNumber.trim(),
          receipt_date: receiptDate, due_date: dueDate || null, subtotal, tax_total: taxTotal, total,
          notes: notes || null,
        }).eq("id", invoiceId);
        await supabase.from("invoice_received_lines").delete().eq("invoice_id", invoiceId);
      }
      const linePayloads = lines.map(l => ({
        invoice_id: invoiceId!, concept: l.concept.trim(), quantity: l.quantity,
        unit_price: l.unit_price, tax_id: l.tax_id || null, line_total: l.line_total,
      }));
      await supabase.from("invoice_received_lines").insert(linePayloads);
      toast.success(t("received.save"));
      onBack();
    } catch (e: any) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  const changeStatus = async (newStatus: string) => {
    await supabase.from("invoices_received").update({ status: newStatus }).eq("id", invoice.id);
    setStatus(newStatus);
    toast.success(t(`received.status_${newStatus}`));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <h3 className="text-lg font-semibold">{isNew ? t("received.new") : t("received.edit")}</h3>
        {!isNew && <Badge variant="outline">{t(`received.status_${status}`)}</Badge>}
        <div className="flex-1" />
        {!isNew && status === "received" && canEdit && (
          <Button size="sm" variant="outline" onClick={() => changeStatus("booked")}>{t("received.mark_booked")}</Button>
        )}
        {!isNew && (status === "received" || status === "booked") && canEdit && (
          <Button size="sm" variant="outline" onClick={() => changeStatus("paid")}>{t("received.mark_paid")}</Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <Label>{t("received.ext_number")}*</Label>
          <Input value={extNumber} onChange={e => setExtNumber(e.target.value)} disabled={isLocked} />
        </div>
        <div>
          <Label>{t("received.supplier")}*</Label>
          <Select value={supplierId || "none"} onValueChange={v => setSupplierId(v === "none" ? "" : v)} disabled={isLocked}>
            <SelectTrigger><SelectValue placeholder={t("received.select_supplier")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("received.select_supplier")}</SelectItem>
              {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("received.receipt_date")}*</Label>
          <Input type="date" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} disabled={isLocked} />
        </div>
        <div>
          <Label>{t("received.due_date")}</Label>
          <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} disabled={isLocked} />
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <h4 className="text-sm font-semibold">{t("received.lines")}</h4>
          {lines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 sm:col-span-4">
                {idx === 0 && <Label className="text-xs">{t("received.concept")}</Label>}
                <Input value={line.concept} onChange={e => updateLine(idx, "concept", e.target.value)} disabled={isLocked} />
              </div>
              <div className="col-span-3 sm:col-span-2">
                {idx === 0 && <Label className="text-xs">{t("received.quantity")}</Label>}
                <Input type="number" min={0} step="0.01" value={line.quantity} onChange={e => updateLine(idx, "quantity", Number(e.target.value))} disabled={isLocked} />
              </div>
              <div className="col-span-3 sm:col-span-2">
                {idx === 0 && <Label className="text-xs">{t("received.unit_price")}</Label>}
                <Input type="number" min={0} step="0.01" value={line.unit_price} onChange={e => updateLine(idx, "unit_price", Number(e.target.value))} disabled={isLocked} />
              </div>
              <div className="col-span-3 sm:col-span-2">
                {idx === 0 && <Label className="text-xs">{t("received.tax")}</Label>}
                <Select value={line.tax_id || "none"} onValueChange={v => updateLine(idx, "tax_id", v === "none" ? "" : v)} disabled={isLocked}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("received.no_tax")}</SelectItem>
                    {taxes.map(tx => <SelectItem key={tx.id} value={tx.id}>{tx.name} ({tx.rate}%)</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 sm:col-span-1 text-right">
                {idx === 0 && <Label className="text-xs">{t("received.line_total")}</Label>}
                <p className="h-10 flex items-center justify-end font-medium text-sm">{line.line_total.toFixed(2)}</p>
              </div>
              <div className="col-span-1">
                {!isLocked && lines.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeLine(idx)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {!isLocked && (
            <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-4 w-4 mr-1" />{t("received.add_line")}</Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 space-y-2">
          <div className="flex justify-between text-sm"><span>{t("received.subtotal")}</span><span className="font-medium">{subtotal.toFixed(2)} €</span></div>
          {taxBreakdown.map((tb, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span>{tb.name} ({tb.rate}%)</span>
              <span className={tb.type === "deduction" ? "text-destructive" : ""}>{tb.type === "deduction" ? "-" : "+"}{tb.amount.toFixed(2)} €</span>
            </div>
          ))}
          <div className="border-t pt-2 flex justify-between font-bold"><span>{t("received.total")}</span><span>{total.toFixed(2)} €</span></div>
        </CardContent>
      </Card>

      <div>
        <Label>{t("received.notes")}</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} disabled={isLocked} />
      </div>

      {!isLocked && canEdit && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onBack}>{t("received.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving}>{t("received.save")}</Button>
        </div>
      )}
    </div>
  );
}
