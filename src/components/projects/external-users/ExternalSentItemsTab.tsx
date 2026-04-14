import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Send, CheckCircle, XCircle, Eye, Mail, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useTranslation } from "react-i18next";

interface LogEntry {
  id: string;
  item_id: string;
  phase_id: string;
  sender_user_id: string;
  external_user_id: string;
  email: string;
  subject: string;
  html_content_snapshot: string;
  status: string;
  error_message: string | null;
  additional_message: string | null;
  sent_at: string;
}

interface Props {
  projectId: string;
}

export default function ExternalSentItemsTab({ projectId }: Props) {
  const { t, i18n } = useTranslation(["projects", "common"]);
  const dateLocale = i18n.language === "es" ? es : undefined;
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [phases, setPhases] = useState<{ id: string; name: string }[]>([]);
  const [extUsers, setExtUsers] = useState<{ id: string; first_name: string; last_name: string | null; email: string }[]>([]);
  const [profiles, setProfiles] = useState<{ user_id: string; full_name: string | null }[]>([]);
  const [items, setItems] = useState<{ id: string; title: string }[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [filterExtUser, setFilterExtUser] = useState("all");
  const [filterPhase, setFilterPhase] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [previewLog, setPreviewLog] = useState<LogEntry | null>(null);

  const fetchData = useCallback(async () => {
    const [logsRes, phasesRes, extUsersRes] = await Promise.all([
      supabase.from("external_notification_logs").select("*").eq("project_id", projectId).order("sent_at", { ascending: false }),
      supabase.from("project_phases").select("id, name").eq("project_id", projectId),
      supabase.from("external_users").select("id, first_name, last_name, email").eq("project_id", projectId).is("deleted_at", null),
    ]);

    if (logsRes.data) setLogs(logsRes.data as LogEntry[]);
    if (phasesRes.data) setPhases(phasesRes.data);
    if (extUsersRes.data) setExtUsers(extUsersRes.data);

    // Fetch unique sender profiles and items
    if (logsRes.data && logsRes.data.length > 0) {
      const senderIds = [...new Set(logsRes.data.map((l: any) => l.sender_user_id))];
      const itemIds = [...new Set(logsRes.data.map((l: any) => l.item_id))];

      const [profilesRes, itemsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name").in("user_id", senderIds),
        supabase.from("phase_items").select("id, title").in("id", itemIds),
      ]);
      if (profilesRes.data) setProfiles(profilesRes.data);
      if (itemsRes.data) setItems(itemsRes.data);
    }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Lookup helpers
  const getPhaseName = (id: string) => phases.find(p => p.id === id)?.name || "—";
  const getExtUserName = (id: string) => {
    const u = extUsers.find(e => e.id === id);
    return u ? `${u.first_name} ${u.last_name || ""}`.trim() : "—";
  };
  const getSenderName = (id: string) => profiles.find(p => p.user_id === id)?.full_name || "—";
  const getItemTitle = (id: string) => items.find(i => i.id === id)?.title || "—";

  // Filter
  const filtered = logs.filter(l => {
    if (filterExtUser !== "all" && l.external_user_id !== filterExtUser) return false;
    if (filterPhase !== "all" && l.phase_id !== filterPhase) return false;
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (search) {
      const needle = search.toLowerCase();
      const extName = getExtUserName(l.external_user_id).toLowerCase();
      const itemTitle = getItemTitle(l.item_id).toLowerCase();
      if (!extName.includes(needle) && !l.email.toLowerCase().includes(needle) && !itemTitle.includes(needle)) return false;
    }
    return true;
  });

  // KPIs
  const totalSent = logs.length;
  const totalSuccess = logs.filter(l => l.status === "sent").length;
  const totalError = logs.filter(l => l.status === "error").length;
  const uniqueExtUsers = new Set(logs.map(l => l.external_user_id)).size;

  // Group by ext user for summary
  const byExtUser = logs.reduce<Record<string, number>>((acc, l) => {
    acc[l.external_user_id] = (acc[l.external_user_id] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{t("extSentTitle")}</h3>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            <div>
              <p className="text-[10px] text-muted-foreground leading-none">{t("extSentTotal")}</p>
              <p className="text-lg font-bold">{totalSent}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-[10px] text-muted-foreground leading-none">{t("extSentSuccess")}</p>
              <p className="text-lg font-bold">{totalSuccess}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" />
            <div>
              <p className="text-[10px] text-muted-foreground leading-none">{t("extSentErrors")}</p>
              <p className="text-lg font-bold">{totalError}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-[10px] text-muted-foreground leading-none">{t("extSentUniqueUsers")}</p>
              <p className="text-lg font-bold">{uniqueExtUsers}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("extSentSearchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={filterExtUser} onValueChange={setFilterExtUser}>
          <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue placeholder={t("extSentFilterUser")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("extSentFilterAllUsers")}</SelectItem>
            {extUsers.map(u => (
              <SelectItem key={u.id} value={u.id}>
                {u.first_name} {u.last_name || ""} {byExtUser[u.id] ? `(${byExtUser[u.id]})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPhase} onValueChange={setFilterPhase}>
          <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder={t("extSentFilterPhase")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("extSentFilterAllPhases")}</SelectItem>
            {phases.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[120px] h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("extSentFilterAllStatus")}</SelectItem>
            <SelectItem value="sent">{t("extSentStatusSent")}</SelectItem>
            <SelectItem value="error">{t("extSentStatusError")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{t("extSentNoResults")}</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("extSentColItem")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("extSentColPhase")}</TableHead>
                <TableHead>{t("extSentColRecipient")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("extSentColSender")}</TableHead>
                <TableHead>{t("extSentColDate")}</TableHead>
                <TableHead>{t("extSentColStatus")}</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium text-sm">{getItemTitle(l.item_id)}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{getPhaseName(l.phase_id)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{getExtUserName(l.external_user_id)}</p>
                      <p className="text-xs text-muted-foreground">{l.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{getSenderName(l.sender_user_id)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(l.sent_at), "dd/MM/yy HH:mm", { locale: dateLocale })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={l.status === "sent" ? "default" : "destructive"} className="text-xs">
                      {l.status === "sent" ? t("extSentStatusSent") : t("extSentStatusError")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewLog(l)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewLog} onOpenChange={(o) => !o && setPreviewLog(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("extSentPreviewTitle")}</DialogTitle>
          </DialogHeader>
          {previewLog && (
            <div className="space-y-2 text-sm">
              <p><strong>{t("extSendSubject")}:</strong> {previewLog.subject}</p>
              <p><strong>{t("extUserEmail")}:</strong> {previewLog.email}</p>
              <p><strong>{t("extSentColDate")}:</strong> {format(new Date(previewLog.sent_at), "dd/MM/yyyy HH:mm:ss", { locale: dateLocale })}</p>
              {previewLog.error_message && <p className="text-destructive"><strong>Error:</strong> {previewLog.error_message}</p>}
              <ScrollArea className="border rounded-md max-h-[350px]">
                <div className="p-4" dangerouslySetInnerHTML={{ __html: previewLog.html_content_snapshot }} />
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
