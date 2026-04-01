import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, FileText, Receipt, Search, Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import ExpenseFormDialog from "./ExpenseFormDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious, PaginationEllipsis,
} from "@/components/ui/pagination";
import * as XLSX from "xlsx";

interface Props {
  projectId: string;
  canManage: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

const PAGE_SIZE = 10;

export default function ExpenseList({ projectId, canManage, canEdit = canManage, canDelete = canManage }: Props) {
  const { t, i18n } = useTranslation(["expenses", "common"]);
  const dateLocale = i18n.language === "es" ? es : undefined;
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editExpense, setEditExpense] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTypeId, setFilterTypeId] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchExpenses = useCallback(async () => {
    const { data } = await supabase
      .from("project_expenses")
      .select("*, expense_types(name)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (data) setExpenses(data);
  }, [projectId]);

  const fetchExpenseTypes = useCallback(async () => {
    const { data } = await supabase.from("expense_types").select("id, name").order("name");
    if (data) setExpenseTypes(data);
  }, []);

  useEffect(() => {
    fetchExpenses();
    fetchExpenseTypes();
  }, [fetchExpenses, fetchExpenseTypes]);

  const filteredExpenses = useMemo(() => {
    let result = expenses;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          (e.description && e.description.toLowerCase().includes(q)) ||
          (e.document_number && e.document_number.toLowerCase().includes(q))
      );
    }
    if (filterTypeId !== "all") {
      result = result.filter((e) => e.expense_type_id === filterTypeId);
    }
    return result;
  }, [expenses, searchQuery, filterTypeId]);

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedExpenses = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredExpenses.slice(start, start + PAGE_SIZE);
  }, [filteredExpenses, safeCurrentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterTypeId]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("project_expenses").delete().eq("id", deleteId);
    if (error) toast.error(t("common:error"));
    else { toast.success(t("expenseDeleted")); fetchExpenses(); }
    setDeleteId(null);
  };

  const handleExport = () => {
    if (filteredExpenses.length === 0) return;
    const rows = filteredExpenses.map((e) => ({
      [t("expenseDate")]: format(new Date(e.expense_date), "dd/MM/yyyy", { locale: dateLocale }),
      [t("expenseType")]: e.expense_types?.name || "",
      [t("description")]: e.description || "",
      [t("documentNumber")]: e.document_number || "",
      [t("totalAmount")]: parseFloat(e.amount).toFixed(2),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t("title"));
    XLSX.writeFile(wb, `gastos_${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages: (number | "ellipsis")[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - safeCurrentPage) <= 1) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "ellipsis") {
        pages.push("ellipsis");
      }
    }
    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className={safeCurrentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          {pages.map((p, idx) =>
            p === "ellipsis" ? (
              <PaginationItem key={`e-${idx}`}><PaginationEllipsis /></PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink
                  isActive={p === safeCurrentPage}
                  onClick={() => setCurrentPage(p)}
                  className="cursor-pointer"
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            )
          )}
          <PaginationItem>
            <PaginationNext
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className={safeCurrentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3 px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              {t("title")}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-muted-foreground">
                {t("total")}: €{totalAmount.toFixed(2)}
              </span>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredExpenses.length === 0}>
                <Download className="h-4 w-4 mr-1" /> Excel
              </Button>
              {canManage && (
                <Button size="sm" onClick={() => { setEditExpense(null); setShowForm(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> {t("newExpense")}
                </Button>
              )}
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Select value={filterTypeId} onValueChange={setFilterTypeId}>
              <SelectTrigger className="w-full sm:w-[200px] h-9">
                <SelectValue placeholder={t("filterByType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allTypes")}</SelectItem>
                {expenseTypes.map((et) => (
                  <SelectItem key={et.id} value={et.id}>{et.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {paginatedExpenses.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">{t("noExpenses")}</div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("expenseDate")}</TableHead>
                      <TableHead>{t("expenseType")}</TableHead>
                      <TableHead>{t("description")}</TableHead>
                      <TableHead>{t("documentNumber")}</TableHead>
                      <TableHead className="text-right">{t("totalAmount")}</TableHead>
                      <TableHead>{t("ticket")}</TableHead>
                      {canManage && <TableHead className="text-right">{t("common:actions")}</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedExpenses.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell>{format(new Date(exp.expense_date), "dd/MM/yyyy", { locale: dateLocale })}</TableCell>
                        <TableCell>{exp.expense_types?.name || "—"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{exp.description || "—"}</TableCell>
                        <TableCell>{exp.document_number || "—"}</TableCell>
                        <TableCell className="text-right font-medium">€{parseFloat(exp.amount).toFixed(2)}</TableCell>
                        <TableCell>
                          {exp.ticket_url ? (
                            <a href={exp.ticket_url} target="_blank" rel="noopener noreferrer">
                              <FileText className="h-4 w-4 text-primary" />
                            </a>
                          ) : "—"}
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditExpense(exp); setShowForm(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(exp.id)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {paginatedExpenses.map((exp) => (
                  <div key={exp.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{exp.expense_types?.name || "—"}</p>
                        <p className="text-xs text-muted-foreground truncate">{exp.description || "—"}</p>
                      </div>
                      <span className="font-semibold text-sm shrink-0">€{parseFloat(exp.amount).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{format(new Date(exp.expense_date), "dd/MM/yyyy", { locale: dateLocale })}</span>
                      <div className="flex items-center gap-2">
                        {exp.ticket_url && (
                          <a href={exp.ticket_url} target="_blank" rel="noopener noreferrer">
                            <FileText className="h-3.5 w-3.5 text-primary" />
                          </a>
                        )}
                        {canManage && (
                          <>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditExpense(exp); setShowForm(true); }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteId(exp.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {renderPagination()}

              <p className="text-xs text-muted-foreground text-center mt-2">
                {filteredExpenses.length} {t("common:results")}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <ExpenseFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        projectId={projectId}
        expense={editExpense}
        onSaved={fetchExpenses}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteExpense")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteExpenseConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t("common:delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
