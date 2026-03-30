import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, FileText, Receipt } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import ExpenseFormDialog from "./ExpenseFormDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  projectId: string;
  canManage: boolean;
}

export default function ExpenseList({ projectId, canManage }: Props) {
  const { t, i18n } = useTranslation(["expenses", "common"]);
  const dateLocale = i18n.language === "es" ? es : undefined;
  const [expenses, setExpenses] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editExpense, setEditExpense] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    const { data } = await supabase
      .from("project_expenses")
      .select("*, expense_types(name)")
      .eq("project_id", projectId)
      .order("expense_date", { ascending: false });
    if (data) setExpenses(data);
  }, [projectId]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("project_expenses").delete().eq("id", deleteId);
    if (error) toast.error(t("common:error"));
    else { toast.success(t("expenseDeleted")); fetchExpenses(); }
    setDeleteId(null);
  };

  const totalAmount = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  return (
    <>
      <Card>
        <CardHeader className="pb-3 px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              {t("title")}
            </CardTitle>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-muted-foreground">
                {t("total")}: €{totalAmount.toFixed(2)}
              </span>
              {canManage && (
                <Button size="sm" onClick={() => { setEditExpense(null); setShowForm(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> {t("newExpense")}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">{t("noExpenses")}</div>
          ) : (
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
                {expenses.map((exp) => (
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
