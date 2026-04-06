import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

interface Category {
  id: string;
  project_id: string;
  name: string;
  type: "income" | "expense";
  budgeted_amount: number | null;
  created_at: string;
}

interface Props {
  projectId: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export default function BudgetConfiguration({ projectId, canCreate, canEdit, canDelete }: Props) {
  const { t } = useTranslation("budget");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [newIncome, setNewIncome] = useState(false);
  const [newExpense, setNewExpense] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("budget_categories")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at");
    if (data) setCategories(data as Category[]);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, [projectId]);

  const incomeCategories = categories.filter(c => c.type === "income");
  const expenseCategories = categories.filter(c => c.type === "expense");

  const handleCreate = async (type: "income" | "expense") => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("budget_categories").insert({
      project_id: projectId,
      name: newName.trim(),
      type,
      budgeted_amount: newAmount ? parseFloat(newAmount) : null,
    });
    if (error) { toast.error(t("common:error")); return; }
    toast.success(t("configuration.category_created"));
    setNewName(""); setNewAmount(""); setNewIncome(false); setNewExpense(false);
    fetchCategories();
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    const { error } = await supabase.from("budget_categories").update({
      name: editName.trim(),
      budgeted_amount: editAmount ? parseFloat(editAmount) : null,
    }).eq("id", id);
    if (error) { toast.error(t("common:error")); return; }
    toast.success(t("configuration.category_updated"));
    setEditingId(null);
    fetchCategories();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("budget_categories").delete().eq("id", deleteId);
    if (error) { toast.error(t("common:error")); return; }
    toast.success(t("configuration.category_deleted"));
    setDeleteId(null);
    fetchCategories();
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditAmount(cat.budgeted_amount?.toString() || "");
  };

  const renderTable = (items: Category[], type: "income" | "expense") => {
    const isAdding = type === "income" ? newIncome : newExpense;
    const emptyMsg = type === "income" ? t("configuration.no_income_categories") : t("configuration.no_expense_categories");

    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{type === "income" ? t("configuration.income_categories") : t("configuration.expense_categories")}</CardTitle>
            {canCreate && !isAdding && (
              <Button size="sm" variant="outline" onClick={() => { type === "income" ? setNewIncome(true) : setNewExpense(true); setNewName(""); setNewAmount(""); }}>
                <Plus className="h-4 w-4 mr-1" /> {type === "income" ? t("configuration.add_income") : t("configuration.add_expense")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 && !isAdding ? (
            <p className="text-sm text-muted-foreground text-center py-4">{emptyMsg}</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("configuration.category_name")}</TableHead>
                    <TableHead className="text-right w-[180px]">{t("configuration.budgeted_amount")}</TableHead>
                    {(canEdit || canDelete) && <TableHead className="w-[100px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(cat => (
                    <TableRow key={cat.id}>
                      {editingId === cat.id ? (
                        <>
                          <TableCell>
                            <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="h-8 text-right" placeholder="0.00" />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-end">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleUpdate(cat.id)}><Check className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="font-medium">{cat.name}</TableCell>
                          <TableCell className="text-right">{cat.budgeted_amount != null ? cat.budgeted_amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}</TableCell>
                          {(canEdit || canDelete) && (
                            <TableCell>
                              <div className="flex gap-1 justify-end">
                                {canEdit && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(cat)}><Pencil className="h-3.5 w-3.5" /></Button>}
                                {canDelete && <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(cat.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                              </div>
                            </TableCell>
                          )}
                        </>
                      )}
                    </TableRow>
                  ))}
                  {isAdding && (
                    <TableRow>
                      <TableCell>
                        <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder={t("configuration.category_name")} className="h-8" autoFocus />
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="0.00" className="h-8 text-right" />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCreate(type)}><Check className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { type === "income" ? setNewIncome(false) : setNewExpense(false); }}><X className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) return <p className="text-center py-8 text-muted-foreground">{t("common:loading", "Cargando...")}</p>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{t("configuration.title")}</h3>
      <div className="grid md:grid-cols-2 gap-4">
        {renderTable(incomeCategories, "income")}
        {renderTable(expenseCategories, "expense")}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("configuration.delete_category")}</AlertDialogTitle>
            <AlertDialogDescription>{t("configuration.delete_confirm")}</AlertDialogDescription>
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
