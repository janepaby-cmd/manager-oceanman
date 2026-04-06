import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import TaxFormDialog from "./TaxFormDialog";

interface Props {
  projectId: string;
}

export default function InvoiceConfig({ projectId }: Props) {
  const { t } = useTranslation("taxes");
  const { can } = usePermissions();
  const canCreateTax = can("create", "taxes");
  const canEditTax = can("update", "taxes");
  const canDeleteTax = can("delete", "taxes");

  const currentYear = new Date().getFullYear();
  const [config, setConfig] = useState<any>(null);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [prefix, setPrefix] = useState("F-");
  const [digits, setDigits] = useState(3);
  const [fiscalYear, setFiscalYear] = useState(currentYear);
  const [nextNum, setNextNum] = useState(1);
  const [companyName, setCompanyName] = useState("");
  const [companyTaxId, setCompanyTaxId] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [showTaxForm, setShowTaxForm] = useState(false);
  const [editTax, setEditTax] = useState<any>(null);

  const preview = `${prefix}${fiscalYear}-${"0".repeat(Math.max(0, digits - String(nextNum).length))}${nextNum}`;

  const fetchConfig = useCallback(async () => {
    const { data } = await supabase
      .from("invoice_config")
      .select("*")
      .eq("project_id", projectId)
      .eq("fiscal_year", fiscalYear)
      .maybeSingle();
    if (data) {
      setConfig(data);
      setPrefix(data.series_prefix || "F-");
      setDigits(data.number_digits || 3);
      setNextNum(data.next_number || 1);
      setCompanyName(data.company_name || "");
      setCompanyTaxId(data.company_tax_id || "");
      setCompanyAddress(data.company_address || "");
      setCompanyEmail(data.company_email || "");
    } else {
      setConfig(null);
      setPrefix("F-");
      setDigits(3);
      setNextNum(1);
    }
  }, [projectId, fiscalYear]);

  const fetchTaxes = useCallback(async () => {
    const { data } = await supabase
      .from("invoice_taxes")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at");
    if (data) setTaxes(data);
  }, [projectId]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);
  useEffect(() => { fetchTaxes(); }, [fetchTaxes]);

  const saveConfig = async () => {
    const payload = {
      project_id: projectId,
      fiscal_year: fiscalYear,
      series_prefix: prefix,
      number_digits: digits,
      next_number: nextNum,
      company_name: companyName || null,
      company_tax_id: companyTaxId || null,
      company_address: companyAddress || null,
      company_email: companyEmail || null,
    };
    if (config) {
      await supabase.from("invoice_config").update(payload).eq("id", config.id);
    } else {
      await supabase.from("invoice_config").insert(payload);
    }
    toast.success(t("saved"));
    fetchConfig();
  };

  const toggleTax = async (tax: any) => {
    await supabase.from("invoice_taxes").update({ active: !tax.active }).eq("id", tax.id);
    fetchTaxes();
  };

  const deleteTax = async (id: string) => {
    if (!confirm(t("delete_confirm"))) return;
    await supabase.from("invoice_taxes").delete().eq("id", id);
    fetchTaxes();
  };

  return (
    <div className="space-y-6">
      {/* Invoice Numbering */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t("invoice_numbering")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><Label>{t("series_prefix")}</Label><Input value={prefix} onChange={e => setPrefix(e.target.value)} /></div>
            <div><Label>{t("number_digits")}</Label><Input type="number" min={1} max={10} value={digits} onChange={e => setDigits(Number(e.target.value))} /></div>
            <div><Label>{t("fiscal_year")}</Label><Input type="number" value={fiscalYear} onChange={e => setFiscalYear(Number(e.target.value))} /></div>
            <div><Label>{t("next_number")}</Label><Input type="number" min={1} value={nextNum} onChange={e => setNextNum(Number(e.target.value))} /></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("preview")}:</span>
            <Badge variant="secondary" className="font-mono text-sm">{preview}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Company Data */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t("company_data")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>{t("company_name")}</Label><Input value={companyName} onChange={e => setCompanyName(e.target.value)} /></div>
            <div><Label>{t("company_tax_id")}</Label><Input value={companyTaxId} onChange={e => setCompanyTaxId(e.target.value)} /></div>
            <div><Label>{t("company_address")}</Label><Input value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} /></div>
            <div><Label>{t("company_email")}</Label><Input value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} /></div>
          </div>
          {canEditTax && (
            <Button onClick={saveConfig} size="sm">{t("save")}</Button>
          )}
        </CardContent>
      </Card>

      {/* Tax Configuration */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t("title")}</CardTitle>
          {canCreateTax && (
            <Button size="sm" onClick={() => { setEditTax(null); setShowTaxForm(true); }}>
              <Plus className="h-4 w-4 mr-1" /> {t("new_tax")}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {taxes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("no_taxes")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("rate")}</TableHead>
                  <TableHead>{t("type")}</TableHead>
                  <TableHead>{t("active")}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxes.map(tax => (
                  <TableRow key={tax.id}>
                    <TableCell className="font-medium">{tax.name}</TableCell>
                    <TableCell>{tax.rate}%</TableCell>
                    <TableCell>
                      <Badge variant={tax.type === "addition" ? "default" : "destructive"}>
                        {t(tax.type === "addition" ? "type_addition" : "type_deduction")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch checked={tax.active} onCheckedChange={() => canEditTax && toggleTax(tax)} disabled={!canEditTax} />
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {canEditTax && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditTax(tax); setShowTaxForm(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {canDeleteTax && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTax(tax.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TaxFormDialog
        open={showTaxForm}
        onOpenChange={setShowTaxForm}
        projectId={projectId}
        tax={editTax}
        onSaved={fetchTaxes}
      />
    </div>
  );
}
