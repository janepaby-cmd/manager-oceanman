import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";
import ReceivedInvoiceForm from "./ReceivedInvoiceForm";

interface Props {
  projectId: string;
}

const statusColors: Record<string, string> = {
  received: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  booked: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

export default function ReceivedInvoicesList({ projectId }: Props) {
  const { t } = useTranslation("invoices");
  const { can } = usePermissions();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editInvoice, setEditInvoice] = useState<any>(null);

  const canCreate = can("create", "invoices");
  const canEdit = can("update", "invoices");
  const canDelete = can("delete", "invoices");

  const fetchInvoices = useCallback(async () => {
    const { data } = await supabase
      .from("invoices_received")
      .select("*, suppliers(name)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (data) setInvoices(data);
  }, [projectId]);

  const fetchSuppliers = useCallback(async () => {
    const { data } = await supabase.from("suppliers").select("id, name").order("name");
    if (data) setSuppliers(data);
  }, []);

  useEffect(() => { fetchInvoices(); fetchSuppliers(); }, [fetchInvoices, fetchSuppliers]);

  const handleDelete = async (id: string) => {
    if (!confirm(t("received.delete_confirm"))) return;
    await supabase.from("invoices_received").delete().eq("id", id);
    fetchInvoices();
  };

  const filtered = invoices.filter(inv => {
    if (filterSupplier !== "all" && inv.supplier_id !== filterSupplier) return false;
    if (filterStatus !== "all" && inv.status !== filterStatus) return false;
    return true;
  });

  const totalReceived = filtered.reduce((s, i) => s + Number(i.total || 0), 0);
  const totalPaid = filtered.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.total || 0), 0);
  const totalPending = totalReceived - totalPaid;

  if (showForm) {
    return (
      <ReceivedInvoiceForm
        projectId={projectId}
        invoice={editInvoice}
        onBack={() => { setShowForm(false); setEditInvoice(null); fetchInvoices(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("received.title")}</h3>
        {canCreate && (
          <Button size="sm" onClick={() => { setEditInvoice(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1" /> {t("received.new")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-md border bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp className="h-3.5 w-3.5" />{t("received.total_received")}</div>
          <p className="text-lg font-bold">{totalReceived.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</p>
        </div>
        <div className="rounded-md border bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingDown className="h-3.5 w-3.5" />{t("received.total_paid")}</div>
          <p className="text-lg font-bold text-green-600">{totalPaid.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</p>
        </div>
        <div className="rounded-md border bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Minus className="h-3.5 w-3.5" />{t("received.total_pending")}</div>
          <p className="text-lg font-bold text-orange-600">{totalPending.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={filterSupplier} onValueChange={setFilterSupplier}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder={t("received.supplier")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("received.supplier")}</SelectItem>
            {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder={t("received.status")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("received.status")}</SelectItem>
            <SelectItem value="received">{t("received.status_received")}</SelectItem>
            <SelectItem value="booked">{t("received.status_booked")}</SelectItem>
            <SelectItem value="paid">{t("received.status_paid")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{t("received.no_invoices")}</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("received.ext_number")}</TableHead>
                <TableHead>{t("received.supplier")}</TableHead>
                <TableHead>{t("received.receipt_date")}</TableHead>
                <TableHead>{t("received.due_date")}</TableHead>
                <TableHead className="text-right">{t("received.total")}</TableHead>
                <TableHead>{t("received.status")}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono font-medium">{inv.ext_number}</TableCell>
                  <TableCell>{(inv as any).suppliers?.name || "—"}</TableCell>
                  <TableCell>{format(new Date(inv.receipt_date), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{inv.due_date ? format(new Date(inv.due_date), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell className="text-right font-medium">{Number(inv.total).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[inv.status] || ""}>{t(`received.status_${inv.status}`)}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditInvoice(inv); setShowForm(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {canDelete && inv.status === "received" && (
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
