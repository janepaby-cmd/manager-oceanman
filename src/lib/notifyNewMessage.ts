import { supabase } from "@/integrations/supabase/client";
import i18n from "@/i18n";

interface NotifyParams {
  messageId: string;
  subject: string;
  bodyPreview: string;
  senderName: string;
  recipientUserIds: string[];
  projectIds: string[];
}

export async function notifyNewMessage({
  messageId,
  subject,
  bodyPreview,
  senderName,
  recipientUserIds,
  projectIds,
}: NotifyParams) {
  try {
    // Get profiles for all recipients
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, full_name, email_notifications_enabled")
      .in("user_id", recipientUserIds);
    if (!profiles?.length) return;

    // Get project name if applicable
    let projectName = "";
    if (projectIds.length === 1) {
      const { data: project } = await supabase
        .from("projects")
        .select("name")
        .eq("id", projectIds[0])
        .single();
      projectName = project?.name || "";
    } else if (projectIds.length > 1) {
      projectName = `${projectIds.length} proyectos`;
    }

    const lang = i18n.language?.startsWith("es") ? "es" : "en";

    for (const profile of profiles) {
      if (!profile.email || !profile.email_notifications_enabled) continue;

      supabase.functions
        .invoke("send-transactional-email", {
          body: {
            templateName: "new-message",
            recipientEmail: profile.email,
            idempotencyKey: `new-msg-${messageId}-${profile.user_id}`,
            templateData: {
              recipientName: profile.full_name || profile.email,
              senderName,
              subject,
              bodyPreview,
              projectName,
              messageUrl: `${window.location.origin}/dashboard/messages/${messageId}`,
              lang,
            },
          },
        })
        .then(async () => {
          // Update email_status for this recipient
          await (supabase as any)
            .from("message_recipients")
            .update({ email_status: "sent", email_sent_at: new Date().toISOString() })
            .eq("message_id", messageId)
            .eq("recipient_user_id", profile.user_id);
        })
        .catch(async (err: any) => {
          console.error("Email notify error:", err);
          await (supabase as any)
            .from("message_recipients")
            .update({ email_status: "error", email_error: String(err) })
            .eq("message_id", messageId)
            .eq("recipient_user_id", profile.user_id);
        });
    }
  } catch (err) {
    console.error("notifyNewMessage error:", err);
  }
}
