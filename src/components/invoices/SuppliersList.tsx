import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import SupplierFormDialog from "./SupplierFormDialog";

export default function SuppliersList() {
  const { t } = useTranslation("contacts");
  const { can } = usePermissions();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState<any>(null);

  const canCreate = can("create", "contacts");
  const canEdit = can("update", "contacts");
  const canDelete = can("delete", "contacts");

  const fetch = useCallback(async () => {
    const { data } = await supabase.from("suppliers").select("*").order("name");
    if (data) setSuppliers(data);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id: string) => {
    if (!confirm(t("delete_confirm_supplier"))) return;
    await supabase.from("suppliers").delete().eq("id", id);
    fetch();
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.tax_id || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("suppliers_title")}</h3>
        {canCreate && (
          <Button size="sm" onClick={() => { setEditSupplier(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1" /> {t("new_supplier")}
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder={t("search")} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{t("no_suppliers")}</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("tax_id")}</TableHead>
                <TableHead>{t("supplier_type")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("email")}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.tax_id || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{t(s.supplier_type === "creditor" ? "type_creditor" : "type_supplier")}</Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{s.email || "—"}</TableCell>
                  <TableCell className="text-right space-x-1">
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditSupplier(s); setShowForm(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(s.id)}>
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

      <SupplierFormDialog open={showForm} onOpenChange={setShowForm} supplier={editSupplier} onSaved={fetch} />
    </div>
  );
}
