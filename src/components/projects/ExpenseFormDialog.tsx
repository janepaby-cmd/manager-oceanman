import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Upload, Loader2, Scan } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  expense?: any;
  onSaved: () => void;
}

export default function ExpenseFormDialog({ open, onOpenChange, projectId, expense, onSaved }: Props) {
  const { user } = useAuth();
  const { t } = useTranslation(["expenses", "common"]);
  const [expenseTypes, setExpenseTypes] = useState<any[]>([]);
  const [expenseDate, setExpenseDate] = useState("");
  const [expenseTypeId, setExpenseTypeId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingTicketUrl, setExistingTicketUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("expense_types").select("*").order("name").then(({ data }) => {
      if (data) setExpenseTypes(data);
    });
  }, []);

  useEffect(() => {
    if (expense) {
      setExpenseDate(expense.expense_date || "");
      setExpenseTypeId(expense.expense_type_id || "");
      setAmount(expense.amount?.toString() || "");
      setDescription(expense.description || "");
      setExistingTicketUrl(expense.ticket_url || null);
    } else {
      setExpenseDate("");
      setExpenseTypeId("");
      setAmount("");
      setDescription("");
      setExistingTicketUrl(null);
    }
    setFile(null);
  }, [expense, open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const extractTicketData = async () => {
    if (!file) return;
    setExtracting(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("extract-ticket-data", {
        body: { imageBase64: base64, mimeType: file.type },
      });

      if (error) throw error;

      if (data?.date) setExpenseDate(data.date);
      if (data?.amount) setAmount(data.amount.toString());
      if (data?.description && !description) setDescription(data.description);

      toast.success(t("dataExtracted"));
    } catch (err) {
      console.error("OCR error:", err);
      toast.error(t("extractError"));
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    if (!expenseDate || !expenseTypeId || !amount) {
      toast.error(t("requiredFields"));
      return;
    }

    setSaving(true);
    try {
      let ticketUrl = existingTicketUrl;

      if (file) {
        const ext = file.name.split(".").pop();
        const path = `expenses/${projectId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("project-files").upload(path, file);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("project-files").getPublicUrl(path);
        ticketUrl = urlData.publicUrl;
      }

      const payload = {
        project_id: projectId,
        expense_type_id: expenseTypeId,
        expense_date: expenseDate,
        amount: parseFloat(amount),
        description: description || null,
        ticket_url: ticketUrl,
        created_by: user!.id,
      };

      if (expense) {
        const { error } = await supabase.from("project_expenses").update(payload).eq("id", expense.id);
        if (error) throw error;
        toast.success(t("expenseUpdated"));
      } else {
        const { error } = await supabase.from("project_expenses").insert(payload);
        if (error) throw error;
        toast.success(t("expenseCreated"));
      }

      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(t("common:error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{expense ? t("editExpense") : t("newExpense")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File upload + OCR */}
          <div className="space-y-2">
            <Label>{t("ticket")}</Label>
            <div className="flex gap-2">
              <Input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="flex-1" />
              {file && (
                <Button type="button" variant="outline" size="sm" onClick={extractTicketData} disabled={extracting}>
                  {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
                  <span className="ml-1">{t("extract")}</span>
                </Button>
              )}
            </div>
            {existingTicketUrl && !file && (
              <a href={existingTicketUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                {t("viewTicket")}
              </a>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("expenseDate")}</Label>
            <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>{t("expenseType")}</Label>
            <Select value={expenseTypeId} onValueChange={setExpenseTypeId}>
              <SelectTrigger><SelectValue placeholder={t("selectType")} /></SelectTrigger>
              <SelectContent>
                {expenseTypes.map((et) => (
                  <SelectItem key={et.id} value={et.id}>{et.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("totalAmount")}</Label>
            <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>

          <div className="space-y-2">
            <Label>{t("description")}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("descriptionPlaceholder")} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common:cancel")}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t("common:save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
