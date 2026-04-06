import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Paperclip, X, Send, Loader2, Languages } from "lucide-react";
import { toast } from "sonner";
import RecipientSelector from "./RecipientSelector";
import { notifyNewMessage } from "@/lib/notifyNewMessage";

const db = supabase as any;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "pdf", "doc", "docx", "xls", "xlsx", "txt", "csv", "zip"];

interface Props {
  replyTo?: { id: string; subject: string; sender_user_id: string; sender_name?: string } | null;
  onSent?: () => void;
}

export default function MessageCompose({ replyTo, onSent }: Props) {
  const { user, profile, hasRole } = useAuth();
  const { t } = useTranslation("messages");
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [subject, setSubject] = useState(replyTo ? `Re: ${replyTo.subject}` : "");
  const [body, setBody] = useState("");
  const [messageType, setMessageType] = useState(replyTo ? "private" : "private");
  const [priority, setPriority] = useState("normal");
  const [requireReadConfirmation, setRequireReadConfirmation] = useState(false);
  const [scopeType, setScopeType] = useState("user");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    replyTo ? [replyTo.sender_user_id] : []
  );
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [translating, setTranslating] = useState(false);

  const isAdmin = hasRole("superadmin") || hasRole("admin");
  const isManager = hasRole("manager");

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    for (const file of newFiles) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(t("fileTooLarge"));
        return;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        toast.error(t("fileTypeNotAllowed"));
        return;
      }
    }
    if (files.length + newFiles.length > MAX_FILES) {
      toast.error(t("maxFilesReached"));
      return;
    }
    setFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTranslate = async () => {
    if (!subject.trim() && !body.trim()) {
      toast.error(t("translateEmpty"));
      return;
    }
    setTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke("translate-message", {
        body: { subject: subject.trim(), body: body.trim() },
      });
      if (error) throw error;
      if (data?.subject) setSubject(data.subject);
      if (data?.body) setBody(data.body);
      toast.success(t("translateSuccess"));
    } catch (err) {
      console.error("Translate error:", err);
      toast.error(t("translateError"));
    } finally {
      setTranslating(false);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim() || selectedUserIds.length === 0) {
      toast.error(t("messageError"));
      return;
    }

    setSending(true);
    try {
      // 1. Create message
      const { data: msg, error: msgErr } = await db
        .from("messages")
        .insert({
          sender_user_id: user!.id,
          parent_message_id: replyTo?.id || null,
          subject: subject.trim(),
          body: body.trim(),
          message_type: messageType,
          priority,
          requires_read_confirmation: requireReadConfirmation,
          scope_type: scopeType,
          status: "active",
        })
        .select("id")
        .single();

      if (msgErr) throw msgErr;
      const messageId = msg.id;

      // 2. Create recipients
      const recipientRows = selectedUserIds.map((uid) => ({
        message_id: messageId,
        recipient_user_id: uid,
        recipient_role: scopeType === "role" ? selectedRoles.join(",") : null,
        recipient_project_id: null,
        delivery_type: "to",
        email_status: "pending",
      }));
      const { error: recErr } = await db.from("message_recipients").insert(recipientRows);
      if (recErr) throw recErr;

      // 3. Create project associations
      if (selectedProjectIds.length) {
        const projRows = selectedProjectIds.map((pid) => ({
          message_id: messageId,
          project_id: pid,
        }));
        await db.from("message_projects").insert(projRows);
      }

      // 4. Upload attachments
      for (const file of files) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        const storedName = `${crypto.randomUUID()}.${ext}`;
        const storagePath = `${user!.id}/${storedName}`;

        const { error: uploadErr } = await supabase.storage
          .from("message-attachments")
          .upload(storagePath, file);
        if (uploadErr) {
          console.error("File upload error:", uploadErr);
          continue;
        }

        await db.from("message_attachments").insert({
          message_id: messageId,
          uploaded_by_user_id: user!.id,
          original_name: file.name,
          stored_name: storedName,
          storage_key: storagePath,
          mime_type: file.type,
          extension: ext,
          file_size: file.size,
        });
      }

      // 5. Audit log
      await db.from("message_audit_logs").insert({
        message_id: messageId,
        user_id: user!.id,
        action: "created",
        metadata: {
          recipient_count: selectedUserIds.length,
          has_attachments: files.length > 0,
          scope_type: scopeType,
          message_type: messageType,
        },
      });

      // 6. Send email notifications (async, don't block)
      notifyNewMessage({
        messageId,
        subject: subject.trim(),
        bodyPreview: body.trim().substring(0, 200),
        senderName: profile?.full_name || "Usuario",
        recipientUserIds: selectedUserIds,
        projectIds: selectedProjectIds,
      });

      toast.success(t("messageSent"));
      qc.invalidateQueries({ queryKey: ["messages"] });

      // Reset form
      setSubject("");
      setBody("");
      setFiles([]);
      setSelectedUserIds([]);
      setSelectedProjectIds([]);
      setSelectedRoles([]);
      setScopeType("user");
      setMessageType("private");
      setPriority("normal");
      setRequireReadConfirmation(false);

      onSent?.();
    } catch (err) {
      console.error("Send error:", err);
      toast.error(t("messageError"));
    } finally {
      setSending(false);
    }
  };

  const typeOptions = isAdmin
    ? ["private", "announcement", "system", "project"]
    : isManager
    ? ["private", "announcement", "project"]
    : ["private"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {replyTo ? t("replyTo") : t("newMessage")}
          {replyTo && <span className="font-normal text-muted-foreground ml-2">{replyTo.sender_name}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!replyTo && (
          <RecipientSelector
            scopeType={scopeType}
            onScopeChange={setScopeType}
            selectedUserIds={selectedUserIds}
            onUsersChange={setSelectedUserIds}
            selectedProjectIds={selectedProjectIds}
            onProjectsChange={setSelectedProjectIds}
            selectedRoles={selectedRoles}
            onRolesChange={setSelectedRoles}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t("type")}</Label>
            <Select value={messageType} onValueChange={setMessageType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {typeOptions.map((type) => (
                  <SelectItem key={type} value={type}>{t(`types.${type}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("priority")}</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["normal", "important", "urgent"].map((p) => (
                  <SelectItem key={p} value={p}>{t(`priorities.${p}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>{t("subject")}</Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t("subject")}
            maxLength={255}
          />
        </div>

        <div>
          <Label>{t("body")}</Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("body")}
            rows={6}
            maxLength={10000}
          />
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={requireReadConfirmation}
            onCheckedChange={setRequireReadConfirmation}
          />
          <Label className="cursor-pointer">{t("requireReadConfirmation")}</Label>
        </div>

        {/* Attachments */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={files.length >= MAX_FILES}
            >
              <Paperclip className="h-4 w-4 mr-1" /> {t("addAttachment")}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={handleFileAdd}
              accept={ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",")}
            />
          </div>
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {files.map((f, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {f.name} ({(f.size / 1024).toFixed(0)}KB)
                  <button onClick={() => removeFile(i)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !body.trim() || selectedUserIds.length === 0}
          >
            {sending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("sending")}</>
            ) : (
              <><Send className="h-4 w-4 mr-2" /> {t("sendMessage")}</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
