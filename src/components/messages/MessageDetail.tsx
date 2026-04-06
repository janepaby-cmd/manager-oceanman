import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMessageDetail, useMarkAsRead, useArchiveMessage } from "@/hooks/useMessages";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Reply, Archive, Download, Paperclip,
  Mail, MailOpen, Clock, AlertTriangle, AlertCircle, Loader2, Languages,
} from "lucide-react";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { toast } from "sonner";
import MessageCompose from "./MessageCompose";

interface Props {
  messageId: string;
}

export default function MessageDetail({ messageId }: Props) {
  const { t, i18n } = useTranslation("messages");
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { data: message, isLoading } = useMessageDetail(messageId);
  const markAsRead = useMarkAsRead();
  const archiveMsg = useArchiveMessage();
  const dateLocale = i18n.language === "es" ? es : enUS;
  const [showReply, setShowReply] = useState(false);
  const [translatedSubject, setTranslatedSubject] = useState<string | null>(null);
  const [translatedBody, setTranslatedBody] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);

  const isAdmin = hasRole("superadmin") || hasRole("admin");
  const isManager = hasRole("manager");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!message) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t("noMessages")}</p>
      </div>
    );
  }

  const isSender = message.sender_user_id === user?.id;
  const myRecipient = message.recipients?.find((r: any) => r.recipient_user_id === user?.id);
  const canReply = !!myRecipient || isSender;

  const handleDownload = async (att: any) => {
    const { data } = await supabase.storage
      .from("message-attachments")
      .createSignedUrl(att.storage_key, 300);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }

    // Audit log
    await (supabase as any).from("message_audit_logs").insert({
      message_id: messageId,
      user_id: user!.id,
      action: "download_attachment",
      metadata: { attachment_id: att.id, original_name: att.original_name },
    });
  };

  const handleTranslate = async () => {
    if (isTranslated) {
      setTranslatedSubject(null);
      setTranslatedBody(null);
      setIsTranslated(false);
      return;
    }
    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke("translate-message", {
        body: { subject: message.subject, body: message.body },
      });
      if (error) throw error;
      setTranslatedSubject(data.subject);
      setTranslatedBody(data.body);
      setIsTranslated(true);
      toast.success(t("translateSuccess"));
    } catch {
      toast.error(t("translateError"));
    } finally {
      setIsTranslating(false);
    }
  };

  const priorityIcon =
    message.priority === "urgent" ? <AlertTriangle className="h-4 w-4 text-destructive" /> :
    message.priority === "important" ? <AlertCircle className="h-4 w-4 text-warning" /> : null;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/messages")}>
        <ArrowLeft className="h-4 w-4 mr-2" /> {t("backToMessages")}
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {priorityIcon}
                <CardTitle className="text-xl">{translatedSubject ?? message.subject}</CardTitle>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{t("from")}: <strong>{message.sender_name}</strong></span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(message.created_at), "dd MMM yyyy HH:mm", { locale: dateLocale })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {message.message_type !== "private" && (
                <Badge variant="secondary">{t(`types.${message.message_type}`)}</Badge>
              )}
              {message.priority !== "normal" && (
                <Badge variant={message.priority === "urgent" ? "destructive" : "outline"}>
                  {t(`priorities.${message.priority}`)}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground">
            {message.body}
          </div>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-1">
                  <Paperclip className="h-4 w-4" /> {t("attachments")} ({message.attachments.length})
                </h4>
                <div className="space-y-1">
                  {message.attachments.map((att: any) => (
                    <div key={att.id} className="flex items-center gap-3 p-2 rounded-md border bg-background">
                      <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{att.original_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(att.file_size / 1024).toFixed(0)} KB · {att.extension.toUpperCase()}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(att)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Recipients (sender/admin view) */}
          {(isSender || isAdmin) && message.recipients && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium">{t("recipientList")} ({message.recipients.length})</h4>
                <div className="grid gap-1">
                  {message.recipients.map((r: any) => (
                    <div key={r.id} className="flex items-center gap-2 text-sm p-1">
                      {r.read_at ? (
                        <MailOpen className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <Mail className="h-3.5 w-3.5 text-primary" />
                      )}
                      <span className="font-medium">{r.recipient_name}</span>
                      <span className="text-muted-foreground">{r.recipient_email}</span>
                      {r.read_at && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          {t("readAt")} {format(new Date(r.read_at), "dd/MM HH:mm")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <Separator />
          <div className="flex items-center gap-2">
            {canReply && (
              <Button variant="outline" size="sm" onClick={() => setShowReply(!showReply)}>
                <Reply className="h-4 w-4 mr-1" /> {t("reply")}
              </Button>
            )}
            {myRecipient && (
              <>
                {!myRecipient.read_at ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markAsRead.mutate({ recipientId: myRecipient.id, read: true })}
                  >
                    <MailOpen className="h-4 w-4 mr-1" /> {t("markAsRead")}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markAsRead.mutate({ recipientId: myRecipient.id, read: false })}
                  >
                    <Mail className="h-4 w-4 mr-1" /> {t("markAsUnread")}
                  </Button>
                )}
                {!myRecipient.archived_at && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => archiveMsg.mutate(myRecipient.id)}
                  >
                    <Archive className="h-4 w-4 mr-1" /> {t("archive")}
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Thread */}
      {message.thread && message.thread.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">{t("thread")}</h3>
          {message.thread.map((reply: any) => (
            <Card key={reply.id} className="border-l-4 border-l-primary/20">
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <strong>{reply.sender_name}</strong>
                  <span>{format(new Date(reply.created_at), "dd MMM HH:mm", { locale: dateLocale })}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{reply.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reply form */}
      {showReply && (
        <MessageCompose
          replyTo={{
            id: message.id,
            subject: message.subject,
            sender_user_id: message.sender_user_id,
            sender_name: message.sender_name,
          }}
          onSent={() => {
            setShowReply(false);
            // Refetch will happen via query invalidation
          }}
        />
      )}
    </div>
  );
}
