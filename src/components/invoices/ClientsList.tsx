import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import ClientFormDialog from "./ClientFormDialog";

export default function ClientsList() {
  const { t } = useTranslation("contacts");
  const { can } = usePermissions();
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState<any>(null);

  const canCreate = can("create", "contacts");
  const canEdit = can("update", "contacts");
  const canDelete = can("delete", "contacts");

  const fetch = useCallback(async () => {
    const { data } = await supabase.from("clients").select("*").order("name");
    if (data) setClients(data);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id: string) => {
    if (!confirm(t("delete_confirm_client"))) return;
    await supabase.from("clients").delete().eq("id", id);
    fetch();
  };

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.tax_id || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("clients_title")}</h3>
        {canCreate && (
          <Button size="sm" onClick={() => { setEditClient(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1" /> {t("new_client")}
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder={t("search")} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{t("no_clients")}</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("tax_id")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("email")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("phone")}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.tax_id || "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell">{c.email || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">{c.phone || "—"}</TableCell>
                  <TableCell className="text-right space-x-1">
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditClient(c); setShowForm(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c.id)}>
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

      <ClientFormDialog open={showForm} onOpenChange={setShowForm} client={editClient} onSaved={fetch} />
    </div>
  );
}
