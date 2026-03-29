import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useUnreadCount } from "@/hooks/useMessages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Megaphone, ArrowRight, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useTranslation as useI18n } from "react-i18next";

export default function MessageWidget() {
  const { t, i18n } = useTranslation("messages");
  const navigate = useNavigate();
  const { data, isLoading } = useUnreadCount();
  const dateLocale = i18n.language === "es" ? es : enUS;

  if (isLoading || !data) return null;
  if (data.total === 0) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            {t("pendingMessages")}
          </CardTitle>
          <div className="flex items-center gap-2">
            {data.total > 0 && (
              <Badge variant="destructive" className="text-xs">
                {data.total}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" />
            {data.total} {t("unreadMessages")}
          </span>
          {data.announcements > 0 && (
            <span className="flex items-center gap-1">
              <Megaphone className="h-3.5 w-3.5" />
              {data.announcements} {t("unreadAnnouncements")}
            </span>
          )}
        </div>

        {data.messages.length > 0 && (
          <div className="space-y-1">
            {data.messages.slice(0, 5).map((msg: any) => (
              <div
                key={msg.id}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/5 cursor-pointer transition-colors"
                onClick={() => navigate(`/dashboard/messages/${msg.id}`)}
              >
                {msg.priority === "urgent" ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                ) : (
                  <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{msg.subject}</p>
                  <p className="text-xs text-muted-foreground">{msg.sender_name}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(msg.created_at), "dd MMM", { locale: dateLocale })}
                </span>
              </div>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => navigate("/dashboard/messages")}
        >
          {t("viewAll")} <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
