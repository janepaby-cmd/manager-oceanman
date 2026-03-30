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
import { Upload, Loader2, ChevronLeft, ChevronRight, Camera, FileUp, AlertTriangle, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  const [step, setStep] = useState(1);

  // Form fields
  const [expenseTypeId, setExpenseTypeId] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [expenseDate, setExpenseDate] = useState("");
  const [amount, setAmount] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");

  // State
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [extractionFailed, setExtractionFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingTicketUrl, setExistingTicketUrl] = useState<string | null>(null);

  const isEditing = !!expense;
  const totalSteps = 3;

  useEffect(() => {
    supabase.from("expense_types").select("*").order("name").then(({ data }) => {
      if (data) setExpenseTypes(data);
    });
  }, []);

  useEffect(() => {
    if (expense) {
      setExpenseTypeId(expense.expense_type_id || "");
      setDescription(expense.description || "");
      setExpenseDate(expense.expense_date || "");
      setAmount(expense.amount?.toString() || "");
      setDocumentNumber(expense.document_number || "");
      setExistingTicketUrl(expense.ticket_url || null);
      setStep(1);
    } else {
      resetForm();
    }
  }, [expense, open]);

  const resetForm = () => {
    setExpenseTypeId("");
    setDescription("");
    setFile(null);
    setExpenseDate("");
    setAmount("");
    setDocumentNumber("");
    setExistingTicketUrl(null);
    setExtracted(false);
    setExtractionFailed(false);
    setStep(1);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setExtracted(false);
    setExtractionFailed(false);

    // Auto-extract on file selection
    await extractTicketData(f);
  };

  const extractTicketData = async (fileToProcess: File) => {
    setExtracting(true);
    setExtractionFailed(false);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(fileToProcess);
      });

      const { data, error } = await supabase.functions.invoke("extract-ticket-data", {
        body: { imageBase64: base64, mimeType: fileToProcess.type },
      });

      if (error) throw error;

      let anyExtracted = false;
      if (data?.date) { setExpenseDate(data.date); anyExtracted = true; }
      if (data?.amount) { setAmount(data.amount.toString()); anyExtracted = true; }
      if (data?.document_number) { setDocumentNumber(data.document_number.toString()); anyExtracted = true; }
      if (data?.description && !description) { setDescription(data.description); }

      if (anyExtracted) {
        setExtracted(true);
        toast.success(t("dataExtracted"));
      } else {
        setExtractionFailed(true);
        toast.warning(t("extractionPartial"));
      }
    } catch (err) {
      console.error("OCR error:", err);
      setExtractionFailed(true);
      toast.error(t("extractError"));
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    if (!expenseTypeId || !amount) {
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
        expense_date: expenseDate || new Date().toISOString().split("T")[0],
        amount: parseFloat(amount),
        description: description || null,
        document_number: documentNumber || null,
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

  const canGoNext = () => {
    if (step === 1) return !!expenseTypeId;
    if (step === 2) return true;
    return true;
  };

  const goNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };
  const goBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("editExpense") : t("newExpense")}</DialogTitle>
          {!isEditing && (
            <div className="flex items-center gap-2 pt-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div
                    className={`h-2 flex-1 rounded-full transition-colors ${
                      s <= step ? "bg-primary" : "bg-muted"
                    }`}
                    style={{ width: 80 }}
                  />
                </div>
              ))}
            </div>
          )}
        </DialogHeader>

        <div className="min-h-[200px]">
          {/* STEP 1: Expense type */}
          {(step === 1 || isEditing) && (
            <div className={`space-y-4 ${isEditing ? "" : step !== 1 ? "hidden" : ""}`}>
              <div className="space-y-2">
                <Label>{t("expenseType")} *</Label>
                <Select value={expenseTypeId} onValueChange={setExpenseTypeId}>
                  <SelectTrigger><SelectValue placeholder={t("selectType")} /></SelectTrigger>
                  <SelectContent>
                    {expenseTypes.map((et) => (
                      <SelectItem key={et.id} value={et.id}>{et.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isEditing && (
                <>
                  <div className="space-y-2">
                    <Label>{t("description")}</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("descriptionPlaceholder")} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("ticket")}</Label>
                    <Input type="file" accept="image/*,.pdf" onChange={handleFileChange} />
                    {existingTicketUrl && !file && (
                      <a href={existingTicketUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                        {t("viewTicket")}
                      </a>
                    )}
                    {extracting && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("analyzing")}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>{t("expenseDate")}</Label>
                      <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("totalAmount")} *</Label>
                      <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("documentNumber")}</Label>
                    <Input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder={t("documentNumberPlaceholder")} />
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 2: Description */}
          {step === 2 && !isEditing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("description")}</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* STEP 3: Document upload + OCR + fields */}
          {step === 3 && !isEditing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("uploadDocument")}</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <div className="flex justify-center gap-4 mb-3">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                    <FileUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{t("uploadHint")}</p>
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="max-w-xs mx-auto"
                  />
                </div>
                {file && (
                  <Badge variant="secondary" className="text-xs">
                    {file.name}
                  </Badge>
                )}
              </div>

              {extracting && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm">{t("analyzing")}</span>
                </div>
              )}

              {extracted && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-accent text-accent-foreground">
                  <Check className="h-4 w-4" />
                  <span className="text-sm">{t("dataExtracted")}</span>
                </div>
              )}

              {extractionFailed && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">{t("extractionFailedManual")}</span>
                </div>
              )}

              {/* Always show fields after extraction attempt or if no file */}
              {(extracted || extractionFailed || !file) && !extracting && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>{t("expenseDate")}</Label>
                      <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("totalAmount")} *</Label>
                      <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("documentNumber")}</Label>
                    <Input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder={t("documentNumberPlaceholder")} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          {!isEditing && step > 1 ? (
            <Button variant="outline" onClick={goBack}>
              <ChevronLeft className="h-4 w-4 mr-1" /> {t("common:back")}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common:cancel")}
            </Button>
          )}

          <div className="flex gap-2">
            {!isEditing && step < totalSteps && (
              <Button onClick={goNext} disabled={!canGoNext()}>
                {t("common:next")} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {(isEditing || step === totalSteps) && (
              <Button onClick={handleSave} disabled={saving || extracting}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t("common:save")}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
