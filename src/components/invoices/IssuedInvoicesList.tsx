import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";
import IssuedInvoiceForm from "./IssuedInvoiceForm";

interface Props {
  projectId: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  issued: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function IssuedInvoicesList({ projectId }: Props) {
  const { t } = useTranslation("invoices");
  const { can } = usePermissions();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [filterClient, setFilterClient] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editInvoice, setEditInvoice] = useState<any>(null);

  const canCreate = can("create", "invoices");
  const canEdit = can("update", "invoices");
  const canDelete = can("delete", "invoices");

  const fetchInvoices = useCallback(async () => {
    const { data } = await supabase
      .from("invoices_issued")
      .select("*, clients(name)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (data) {
      // Auto-mark overdue
      const now = new Date();
      for (const inv of data) {
        if (inv.status === "issued" && inv.due_date && new Date(inv.due_date) < now) {
          await supabase.from("invoices_issued").update({ status: "overdue" }).eq("id", inv.id);
          inv.status = "overdue";
        }
      }
      setInvoices(data);
    }
  }, [projectId]);

  const fetchClients = useCallback(async () => {
    const { data } = await supabase.from("clients").select("id, name").order("name");
    if (data) setClients(data);
  }, []);

  useEffect(() => { fetchInvoices(); fetchClients(); }, [fetchInvoices, fetchClients]);

  const handleDelete = async (id: string) => {
    if (!confirm(t("issued.delete_confirm"))) return;
    await supabase.from("invoices_issued").delete().eq("id", id);
    fetchInvoices();
  };

  const filtered = invoices.filter(inv => {
    if (filterClient !== "all" && inv.client_id !== filterClient) return false;
    if (filterStatus !== "all" && inv.status !== filterStatus) return false;
    return true;
  });

  const totalInvoiced = filtered.reduce((s, i) => s + Number(i.total || 0), 0);
  const totalCollected = filtered.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.total || 0), 0);
  const totalPending = totalInvoiced - totalCollected;

  if (showForm) {
    return (
      <IssuedInvoiceForm
        projectId={projectId}
        invoice={editInvoice}
        onBack={() => { setShowForm(false); setEditInvoice(null); fetchInvoices(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("issued.title")}</h3>
        {canCreate && (
          <Button size="sm" onClick={() => { setEditInvoice(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1" /> {t("issued.new")}
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-md border bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp className="h-3.5 w-3.5" />{t("issued.total_invoiced")}</div>
          <p className="text-lg font-bold">{totalInvoiced.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</p>
        </div>
        <div className="rounded-md border bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingDown className="h-3.5 w-3.5" />{t("issued.total_collected")}</div>
          <p className="text-lg font-bold text-green-600">{totalCollected.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</p>
        </div>
        <div className="rounded-md border bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Minus className="h-3.5 w-3.5" />{t("issued.total_pending")}</div>
          <p className="text-lg font-bold text-orange-600">{totalPending.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder={t("issued.client")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("issued.client")}</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder={t("issued.status")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("issued.status")}</SelectItem>
            <SelectItem value="draft">{t("issued.status_draft")}</SelectItem>
            <SelectItem value="issued">{t("issued.status_issued")}</SelectItem>
            <SelectItem value="paid">{t("issued.status_paid")}</SelectItem>
            <SelectItem value="overdue">{t("issued.status_overdue")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{t("issued.no_invoices")}</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("issued.number")}</TableHead>
                <TableHead>{t("issued.client")}</TableHead>
                <TableHead>{t("issued.issue_date")}</TableHead>
                <TableHead>{t("issued.due_date")}</TableHead>
                <TableHead className="text-right">{t("issued.total")}</TableHead>
                <TableHead>{t("issued.status")}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono font-medium">{inv.number}</TableCell>
                  <TableCell>{(inv as any).clients?.name || "—"}</TableCell>
                  <TableCell>{format(new Date(inv.issue_date), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{inv.due_date ? format(new Date(inv.due_date), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell className="text-right font-medium">{Number(inv.total).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[inv.status] || ""}>{t(`issued.status_${inv.status}`)}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditInvoice(inv); setShowForm(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {canDelete && inv.status === "draft" && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(inv.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
