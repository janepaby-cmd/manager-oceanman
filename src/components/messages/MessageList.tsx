import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Paperclip, Mail, MailOpen, AlertTriangle, AlertCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import type { MessageWithMeta } from "@/types/messages";

interface Props {
  messages: MessageWithMeta[];
  isLoading: boolean;
  mode: "inbox" | "sent" | "board" | "manage";
  emptyMessage: string;
}

const priorityIcons: Record<string, any> = {
  urgent: <AlertTriangle className="h-3.5 w-3.5 text-destructive" />,
  important: <AlertCircle className="h-3.5 w-3.5 text-warning" />,
};

const priorityColors: Record<string, string> = {
  urgent: "destructive",
  important: "outline",
};

export default function MessageList({ messages, isLoading, mode, emptyMessage }: Props) {
  const { t, i18n } = useTranslation("messages");
  const navigate = useNavigate();
  const dateLocale = i18n.language === "es" ? es : enUS;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    let list = messages;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.subject.toLowerCase().includes(q) ||
          (m.sender_name || "").toLowerCase().includes(q)
      );
    }
    if (filter === "unread") list = list.filter((m) => !m.recipient_status?.read_at);
    if (filter === "read") list = list.filter((m) => !!m.recipient_status?.read_at);
    if (filter === "attachments") list = list.filter((m) => m.has_attachments);
    return list;
  }, [messages, search, filter]);

  if (isLoading) {
    return (
      <div className="glass-card p-10 text-center">
        <p className="text-muted-foreground">{t("common:loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("filters.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {mode === "inbox" && (
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.all")}</SelectItem>
              <SelectItem value="unread">{t("filters.unread")}</SelectItem>
              <SelectItem value="read">{t("filters.read")}</SelectItem>
              <SelectItem value="attachments">{t("filters.withAttachments")}</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Mail className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((msg) => {
            const isUnread = mode === "inbox" && !msg.recipient_status?.read_at;
            return (
              <div
                key={msg.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent/5 ${
                  isUnread ? "bg-primary/5 border-primary/20 font-medium" : "bg-card border-border"
                }`}
                onClick={() => navigate(`/dashboard/messages/${msg.id}`)}
              >
                <div className="shrink-0">
                  {isUnread ? (
                    <Mail className="h-4 w-4 text-primary" />
                  ) : (
                    <MailOpen className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {priorityIcons[msg.priority]}
                    <span className={`text-sm truncate ${isUnread ? "font-semibold" : ""}`}>
                      {msg.subject}
                    </span>
                    {msg.has_attachments && <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />}
                    {msg.message_type === "announcement" && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">{t("types.announcement")}</Badge>
                    )}
                    {msg.priority !== "normal" && (
                      <Badge variant={priorityColors[msg.priority] as any} className="text-[10px] shrink-0">
                        {t(`priorities.${msg.priority}`)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {mode === "inbox" || mode === "board" ? (
                      <span>{t("from")}: {msg.sender_name}</span>
                    ) : mode === "sent" ? (
                      <span>
                        {msg.recipient_counts
                          ? `${msg.recipient_counts.read}/${msg.recipient_counts.total} ${t("read").toLowerCase()}`
                          : ""}
                      </span>
                    ) : (
                      <span>{msg.sender_name}</span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(msg.created_at), "dd MMM HH:mm", { locale: dateLocale })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
