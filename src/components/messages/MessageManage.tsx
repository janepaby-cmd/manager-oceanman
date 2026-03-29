import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useAllMessages } from "@/hooks/useMessages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Eye, Clock, BarChart3, Mail, AlertCircle } from "lucide-react";
import MessageList from "./MessageList";

export default function MessageManage() {
  const { t } = useTranslation("messages");
  const { hasRole } = useAuth();
  const { data: messages = [], isLoading } = useAllMessages();

  const isAdmin = hasRole("superadmin") || hasRole("admin");
  if (!isAdmin) return <p className="text-muted-foreground p-4">{t("noPermission")}</p>;

  const totalSent = messages.length;
  const totalRecipients = messages.reduce((acc, m: any) => acc + (m.recipient_counts?.total || 0), 0);
  const totalRead = messages.reduce((acc, m: any) => acc + (m.recipient_counts?.read || 0), 0);
  const totalPending = totalRecipients - totalRead;
  const readRate = totalRecipients > 0 ? Math.round((totalRead / totalRecipients) * 100) : 0;
  const emailOk = messages.reduce((acc, m: any) => acc + (m.recipient_counts?.emailOk || 0), 0);
  const emailErr = messages.reduce((acc, m: any) => acc + (m.recipient_counts?.emailErr || 0), 0);

  const metrics = [
    { label: t("metrics.totalSent"), value: totalSent, icon: Send, color: "text-primary" },
    { label: t("metrics.totalRead"), value: totalRead, icon: Eye, color: "text-success" },
    { label: t("metrics.totalPending"), value: totalPending, icon: Clock, color: "text-warning" },
    { label: t("metrics.readRate"), value: `${readRate}%`, icon: BarChart3, color: "text-primary" },
    { label: t("metrics.emailSuccess"), value: emailOk, icon: Mail, color: "text-success" },
    { label: t("metrics.emailErrors"), value: emailErr, icon: AlertCircle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map((m, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex flex-col items-center text-center">
              <m.icon className={`h-5 w-5 ${m.color} mb-1`} />
              <span className="text-lg font-bold">{m.value}</span>
              <span className="text-xs text-muted-foreground">{m.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <MessageList
        messages={messages}
        isLoading={isLoading}
        mode="manage"
        emptyMessage={t("noMessages")}
      />
    </div>
  );
}
