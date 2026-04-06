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
import { ArrowLeft, Plus, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { pdf } from "@react-pdf/renderer";
import InvoicePdf from "./InvoicePdf";

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

export default function IssuedInvoiceForm({ projectId, invoice, onBack }: Props) {
  const { t } = useTranslation("invoices");
  const { can } = usePermissions();
  const canEdit = can("update", "invoices");

  const [clients, setClients] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [number, setNumber] = useState(invoice?.number || "");
  const [clientId, setClientId] = useState(invoice?.client_id || "");
  const [issueDate, setIssueDate] = useState(invoice?.issue_date || new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(invoice?.due_date || "");
  const [notes, setNotes] = useState(invoice?.notes || "");
  const [status, setStatus] = useState(invoice?.status || "draft");
  const [lines, setLines] = useState<Line[]>([]);
  const [saving, setSaving] = useState(false);
  const isNew = !invoice;
  const isLocked = status !== "draft";

  const fetchData = useCallback(async () => {
    const [{ data: cl }, { data: tx }, { data: cfg }] = await Promise.all([
      supabase.from("clients").select("id, name").order("name"),
      supabase.from("invoice_taxes").select("*").eq("project_id", projectId).eq("active", true),
      supabase.from("invoice_config").select("*").eq("project_id", projectId).order("fiscal_year", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (cl) setClients(cl);
    if (tx) setTaxes(tx);
    if (cfg) setConfig(cfg);

    if (invoice) {
      const { data: existingLines } = await supabase
        .from("invoice_issued_lines")
        .select("*")
        .eq("invoice_id", invoice.id);
      if (existingLines && existingLines.length > 0) {
        setLines(existingLines.map(l => ({
          id: l.id,
          concept: l.concept,
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
          tax_id: l.tax_id || "",
          line_total: Number(l.line_total),
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
      if (!line.tax_id || line.tax_id === "") continue;
      const tax = taxes.find(t => t.id === line.tax_id);
      if (!tax) continue;
      const existing = map.get(tax.id) || { name: tax.name, type: tax.type, rate: Number(tax.rate), amount: 0 };
      existing.amount += line.line_total * Number(tax.rate) / 100;
      map.set(tax.id, existing);
    }
    return Array.from(map.values());
  }, [lines, taxes]);

  const taxTotal = useMemo(() => {
    return taxBreakdown.reduce((s, tb) => s + (tb.type === "addition" ? tb.amount : -tb.amount), 0);
  }, [taxBreakdown]);

  const total = subtotal + taxTotal;

  const handleSave = async () => {
    if (!clientId || lines.length === 0 || lines.some(l => !l.concept.trim())) {
      toast.error("Complete all required fields");
      return;
    }
    setSaving(true);

    let invoiceNumber = number;
    let invoiceId = invoice?.id;

    try {
      if (isNew) {
        const { data: numData } = await supabase.rpc("get_next_invoice_number", {
          p_project_id: projectId,
          p_fiscal_year: new Date(issueDate).getFullYear(),
        });
        invoiceNumber = numData as string;

        const { data: inserted, error } = await supabase.from("invoices_issued").insert({
          project_id: projectId,
          client_id: clientId || null,
          number: invoiceNumber,
          issue_date: issueDate,
          due_date: dueDate || null,
          subtotal,
          tax_total: taxTotal,
          total,
          status: "draft",
          notes: notes || null,
        }).select("id").single();

        if (error) throw error;
        invoiceId = inserted.id;
      } else {
        await supabase.from("invoices_issued").update({
          client_id: clientId || null,
          issue_date: issueDate,
          due_date: dueDate || null,
          subtotal,
          tax_total: taxTotal,
          total,
          notes: notes || null,
        }).eq("id", invoiceId);

        // Delete old lines
        await supabase.from("invoice_issued_lines").delete().eq("invoice_id", invoiceId);
      }

      // Insert lines
      const linePayloads = lines.map(l => ({
        invoice_id: invoiceId!,
        concept: l.concept.trim(),
        quantity: l.quantity,
        unit_price: l.unit_price,
        tax_id: l.tax_id || null,
        line_total: l.line_total,
      }));
      await supabase.from("invoice_issued_lines").insert(linePayloads);

      toast.success(t("issued.save"));
      onBack();
    } catch (e: any) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  const changeStatus = async (newStatus: string) => {
    await supabase.from("invoices_issued").update({ status: newStatus }).eq("id", invoice.id);
    setStatus(newStatus);
    toast.success(t(`issued.status_${newStatus}`));
  };

  const downloadPdf = async () => {
    const client = clients.find(c => c.id === clientId);
    const { data: clientFull } = await supabase.from("clients").select("*").eq("id", clientId).single();
    const blob = await pdf(
      <InvoicePdf
        config={config}
        client={clientFull}
        invoice={{ number: number || invoice?.number, issue_date: issueDate, due_date: dueDate, notes, subtotal, tax_total: taxTotal, total }}
        lines={lines}
        taxBreakdown={taxBreakdown}
        taxes={taxes}
      />
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${number || invoice?.number || "invoice"}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <h3 className="text-lg font-semibold">{isNew ? t("issued.new") : t("issued.edit")}</h3>
        {!isNew && <Badge className="font-mono">{number}</Badge>}
        {!isNew && <Badge variant="outline">{t(`issued.status_${status}`)}</Badge>}
        <div className="flex-1" />
        {!isNew && status === "draft" && canEdit && (
          <Button size="sm" variant="outline" onClick={() => changeStatus("issued")}>{t("issued.mark_issued")}</Button>
        )}
        {!isNew && (status === "issued" || status === "overdue") && canEdit && (
          <Button size="sm" variant="outline" onClick={() => changeStatus("paid")}>{t("issued.mark_paid")}</Button>
        )}
        {!isNew && (status === "issued" || status === "paid") && (
          <Button size="sm" variant="outline" onClick={downloadPdf}><Download className="h-4 w-4 mr-1" />{t("issued.download_pdf")}</Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <Label>{t("issued.client")}*</Label>
          <Select value={clientId || "none"} onValueChange={v => setClientId(v === "none" ? "" : v)} disabled={isLocked}>
            <SelectTrigger><SelectValue placeholder={t("issued.select_client")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("issued.select_client")}</SelectItem>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("issued.issue_date")}*</Label>
          <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} disabled={isLocked} />
        </div>
        <div>
          <Label>{t("issued.due_date")}</Label>
          <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} disabled={isLocked} />
        </div>
      </div>

      {/* Lines */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <h4 className="text-sm font-semibold">{t("issued.lines")}</h4>
          {lines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 sm:col-span-4">
                {idx === 0 && <Label className="text-xs">{t("issued.concept")}</Label>}
                <Input value={line.concept} onChange={e => updateLine(idx, "concept", e.target.value)} disabled={isLocked} />
              </div>
              <div className="col-span-3 sm:col-span-2">
                {idx === 0 && <Label className="text-xs">{t("issued.quantity")}</Label>}
                <Input type="number" min={0} step="0.01" value={line.quantity} onChange={e => updateLine(idx, "quantity", Number(e.target.value))} disabled={isLocked} />
              </div>
              <div className="col-span-3 sm:col-span-2">
                {idx === 0 && <Label className="text-xs">{t("issued.unit_price")}</Label>}
                <Input type="number" min={0} step="0.01" value={line.unit_price} onChange={e => updateLine(idx, "unit_price", Number(e.target.value))} disabled={isLocked} />
              </div>
              <div className="col-span-3 sm:col-span-2">
                {idx === 0 && <Label className="text-xs">{t("issued.tax")}</Label>}
                <Select value={line.tax_id || "none"} onValueChange={v => updateLine(idx, "tax_id", v === "none" ? "" : v)} disabled={isLocked}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("issued.no_tax")}</SelectItem>
                    {taxes.map(tx => <SelectItem key={tx.id} value={tx.id}>{tx.name} ({tx.rate}%)</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 sm:col-span-1 text-right">
                {idx === 0 && <Label className="text-xs">{t("issued.line_total")}</Label>}
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
            <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-4 w-4 mr-1" />{t("issued.add_line")}</Button>
          )}
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardContent className="pt-4 space-y-2">
          <div className="flex justify-between text-sm"><span>{t("issued.subtotal")}</span><span className="font-medium">{subtotal.toFixed(2)} €</span></div>
          {taxBreakdown.map((tb, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span>{tb.name} ({tb.rate}%)</span>
              <span className={tb.type === "deduction" ? "text-destructive" : ""}>{tb.type === "deduction" ? "-" : "+"}{tb.amount.toFixed(2)} €</span>
            </div>
          ))}
          <div className="border-t pt-2 flex justify-between font-bold"><span>{t("issued.total")}</span><span>{total.toFixed(2)} €</span></div>
        </CardContent>
      </Card>

      <div>
        <Label>{t("issued.notes")}</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} disabled={isLocked} />
      </div>

      {!isLocked && canEdit && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onBack}>{t("issued.cancel")}</Button>
          <Button onClick={handleSave} disabled={saving}>{t("issued.save")}</Button>
        </div>
      )}
    </div>
  );
}
