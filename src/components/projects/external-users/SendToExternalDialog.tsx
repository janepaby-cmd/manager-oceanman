import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Eye, Users } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { generateItemHtml, generateItemSubject } from "./generateItemHtml";

interface ExternalUser {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  company: string | null;
  is_active: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: any;
  projectId: string;
  phaseName: string;
  projectName: string;
}

export default function SendToExternalDialog({ open, onOpenChange, item, projectId, phaseName, projectName }: Props) {
  const { user, profile } = useAuth();
  const { t, i18n } = useTranslation(["projects", "common"]);
  const [externalUsers, setExternalUsers] = useState<ExternalUser[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [additionalMessage, setAdditionalMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState("select");

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setAdditionalMessage("");
      setTab("select");
      supabase
        .from("external_users")
        .select("id, first_name, last_name, email, company, is_active")
        .eq("project_id", projectId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("first_name")
        .then(({ data }) => {
          if (data) setExternalUsers(data as ExternalUser[]);
        });
    }
  }, [open, projectId]);

  const toggleUser = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === externalUsers.length) setSelected(new Set());
    else setSelected(new Set(externalUsers.map(u => u.id)));
  };

  const htmlContent = generateItemHtml({
    projectName, phaseName, item, additionalMessage, lang: i18n.language,
  });
  const subject = generateItemSubject({ projectName, itemTitle: item?.title, lang: i18n.language });

  const handleSend = async () => {
    if (selected.size === 0) { toast.error(t("extSendSelectUsers")); return; }
    setSending(true);

    const selectedUsers = externalUsers.filter(u => selected.has(u.id));
    let successCount = 0;
    let errorCount = 0;

    for (const extUser of selectedUsers) {
      try {
        // Send email via edge function (manual, not using internal notification queue)
        const { error: fnError } = await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "external-item-notification",
            recipientEmail: extUser.email,
            idempotencyKey: `ext-notif-${item.id}-${extUser.id}-${Date.now()}`,
            templateData: {
              projectName,
              phaseName,
              itemTitle: item.title,
              itemDescription: item.description || "",
              itemStatus: item.is_completed ? (i18n.language === "es" ? "Completado" : "Completed") : (i18n.language === "es" ? "Pendiente" : "Pending"),
              recipientName: `${extUser.first_name} ${extUser.last_name || ""}`.trim(),
              additionalMessage: additionalMessage.trim() || undefined,
              senderName: profile?.full_name || user?.email || "",
              lang: i18n.language,
            },
          },
        });

        const status = fnError ? "error" : "sent";
        if (!fnError) successCount++; else errorCount++;

        // Log the send
        await supabase.from("external_notification_logs").insert({
          project_id: projectId,
          item_id: item.id,
          phase_id: item.phase_id,
          sender_user_id: user!.id,
          external_user_id: extUser.id,
          email: extUser.email,
          subject,
          html_content_snapshot: htmlContent,
          status,
          error_message: fnError?.message || null,
          additional_message: additionalMessage.trim() || null,
        });
      } catch (err: any) {
        errorCount++;
        await supabase.from("external_notification_logs").insert({
          project_id: projectId,
          item_id: item.id,
          phase_id: item.phase_id,
          sender_user_id: user!.id,
          external_user_id: extUser.id,
          email: extUser.email,
          subject,
          html_content_snapshot: htmlContent,
          status: "error",
          error_message: err?.message || "Unknown error",
          additional_message: additionalMessage.trim() || null,
        });
      }
    }

    if (successCount > 0) toast.success(t("extSendSuccess", { count: successCount }));
    if (errorCount > 0) toast.error(t("extSendErrors", { count: errorCount }));

    setSending(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" /> {t("extSendTitle")}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full">
            <TabsTrigger value="select" className="flex-1">
              <Users className="h-4 w-4 mr-1" /> {t("extSendTabSelect")}
              {selected.size > 0 && <Badge variant="default" className="ml-1 text-xs">{selected.size}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex-1">
              <Eye className="h-4 w-4 mr-1" /> {t("extSendTabPreview")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="select" className="flex-1 overflow-hidden flex flex-col mt-2 space-y-3">
            <div>
              <Label>{t("extSendAdditionalMsg")}</Label>
              <Textarea
                value={additionalMessage}
                onChange={(e) => setAdditionalMessage(e.target.value)}
                rows={2}
                placeholder={t("extSendAdditionalMsgPlaceholder")}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{t("extSendSelectRecipients")}</Label>
              <Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs h-7">
                {selected.size === externalUsers.length ? t("extSendDeselectAll") : t("extSendSelectAll")}
              </Button>
            </div>

            <ScrollArea className="flex-1 border rounded-md max-h-[250px]">
              {externalUsers.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground text-center">{t("extUserNoUsers")}</p>
              ) : (
                <div className="divide-y">
                  {externalUsers.map(u => (
                    <label key={u.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50">
                      <Checkbox checked={selected.has(u.id)} onCheckedChange={() => toggleUser(u.id)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.first_name} {u.last_name || ""}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                      {u.company && <Badge variant="outline" className="text-[10px] shrink-0">{u.company}</Badge>}
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 overflow-hidden mt-2">
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">{t("extSendSubject")}:</span>{" "}
                <span className="text-muted-foreground">{subject}</span>
              </div>
              <ScrollArea className="border rounded-md max-h-[350px]">
                <div className="p-4" dangerouslySetInnerHTML={{ __html: htmlContent }} />
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common:cancel")}</Button>
          <Button onClick={handleSend} disabled={sending || selected.size === 0}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? t("extSending") : t("extSendBtn", { count: selected.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
