import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Minus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import BudgetEntryFormDialog from "./BudgetEntryFormDialog";

interface Category { id: string; name: string; type: string; }
interface Entry {
  id: string; project_id: string; category_id: string | null; date: string;
  concept: string; amount: number; type: string; status: string; created_at: string;
}

interface Props {
  projectId: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export default function BudgetEntries({ projectId, canCreate, canEdit, canDelete }: Props) {
  const { t } = useTranslation("budget");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchConcept, setSearchConcept] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    const [{ data: e }, { data: c }] = await Promise.all([
      supabase.from("budget_entries").select("*").eq("project_id", projectId).order("date", { ascending: false }),
      supabase.from("budget_categories").select("id, name, type").eq("project_id", projectId),
    ]);
    if (e) setEntries(e as Entry[]);
    if (c) setCategories(c as Category[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [projectId]);

  const catMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c.name])), [categories]);

  const filtered = useMemo(() => {
    const term = searchConcept.trim().toLowerCase();
    const applySearch = term.length >= 3;
    return entries.filter(e => {
      if (filterType !== "all" && e.type !== filterType) return false;
      if (filterCategory !== "all" && e.category_id !== filterCategory) return false;
      if (filterStatus !== "all" && e.status !== filterStatus) return false;
      if (applySearch && !e.concept.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [entries, filterType, filterCategory, filterStatus, searchConcept]);

  const totalIncome = filtered.filter(e => e.type === "income").reduce((s, e) => s + Number(e.amount), 0);
  const totalExpenses = filtered.filter(e => e.type === "expense").reduce((s, e) => s + Number(e.amount), 0);
  const netResult = totalIncome - totalExpenses;

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("budget_entries").delete().eq("id", deleteId);
    if (error) { toast.error(t("common:error")); return; }
    toast.success(t("entries.entry_deleted"));
    setDeleteId(null);
    fetchData();
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    };
    return <Badge className={`${variants[status] || ""} text-xs`}>{t(`entries.status_${status}`)}</Badge>;
  };

  if (loading) return <p className="text-center py-8 text-muted-foreground">{t("common:loading", "Cargando...")}</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">{t("entries.title")}</h3>
        {canCreate && (
          <Button size="sm" onClick={() => { setEditEntry(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1" /> {t("entries.add_entry")}
          </Button>
        )}
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">{t("entries.total_income")}</p>
              <p className="text-sm font-bold text-green-600 dark:text-green-400">+{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-xs text-muted-foreground">{t("entries.total_expenses")}</p>
              <p className="text-sm font-bold text-red-600 dark:text-red-400">-{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <Minus className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">{t("entries.net_result")}</p>
              <p className={`text-sm font-bold ${netResult >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {netResult >= 0 ? "+" : ""}{netResult.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("entries.all_types")}</SelectItem>
            <SelectItem value="income">{t("entries.type_income")}</SelectItem>
            <SelectItem value="expense">{t("entries.type_expense")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("entries.all_categories")}</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("entries.all_statuses")}</SelectItem>
            <SelectItem value="pending">{t("entries.status_pending")}</SelectItem>
            <SelectItem value="confirmed">{t("entries.status_confirmed")}</SelectItem>
            <SelectItem value="paid">{t("entries.status_paid")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">{t("entries.no_entries")}</div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("entries.date")}</TableHead>
                <TableHead>{t("entries.type")}</TableHead>
                <TableHead>{t("entries.category")}</TableHead>
                <TableHead>{t("entries.concept")}</TableHead>
                <TableHead className="text-right">{t("entries.amount")}</TableHead>
                <TableHead>{t("entries.status")}</TableHead>
                {(canEdit || canDelete) && <TableHead className="w-[80px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell className="text-sm">{format(new Date(entry.date), "dd/MM/yyyy")}</TableCell>
                  <TableCell>
                    <Badge variant={entry.type === "income" ? "default" : "destructive"} className="text-xs">
                      {t(`entries.type_${entry.type}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{entry.category_id ? catMap[entry.category_id] || "—" : t("entries.no_category")}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{entry.concept}</TableCell>
                  <TableCell className={`text-right font-medium ${entry.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {entry.type === "income" ? "+" : "-"}{Number(entry.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>{statusBadge(entry.status)}</TableCell>
                  {(canEdit || canDelete) && (
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        {canEdit && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditEntry(entry); setShowForm(true); }}><Pencil className="h-3.5 w-3.5" /></Button>}
                        {canDelete && <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(entry.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <BudgetEntryFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        projectId={projectId}
        categories={categories}
        entry={editEntry}
        onSaved={fetchData}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("entries.delete_entry")}</AlertDialogTitle>
            <AlertDialogDescription>{t("entries.delete_confirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel", "Cancelar")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">{t("common:delete", "Eliminar")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
