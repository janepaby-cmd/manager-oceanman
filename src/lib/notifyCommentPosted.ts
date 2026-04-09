import { supabase } from "@/integrations/supabase/client";
import i18n from "@/i18n";

interface NotifyCommentParams {
  commentId: string;
  itemId: string;
  projectId: string;
  commentBody: string;
  commentAuthorName: string;
  commentAuthorId: string;
  parentCommentId: string | null;
}

export async function notifyCommentPosted({
  commentId,
  itemId,
  projectId,
  commentBody,
  commentAuthorName,
  commentAuthorId,
  parentCommentId,
}: NotifyCommentParams) {
  try {
    // Get item + phase info
    const { data: item } = await supabase
      .from("phase_items")
      .select("title, phase_id")
      .eq("id", itemId)
      .single();
    if (!item) return;

    const { data: phase } = await supabase
      .from("project_phases")
      .select("name, project_id")
      .eq("id", item.phase_id)
      .single();
    if (!phase) return;

    const { data: project } = await supabase
      .from("projects")
      .select("name")
      .eq("id", phase.project_id)
      .single();
    if (!project) return;

    // Get parent comment author if it's a reply
    let parentAuthor = "";
    if (parentCommentId) {
      const { data: parentComment } = await supabase
        .from("phase_item_comments")
        .select("user_id")
        .eq("id", parentCommentId)
        .single();
      if (parentComment) {
        const { data: parentProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", parentComment.user_id)
          .single();
        parentAuthor = parentProfile?.full_name || "";
      }
    }

    // Get all project users
    const { data: projectUsers } = await supabase
      .from("project_users")
      .select("user_id")
      .eq("project_id", projectId);
    if (!projectUsers?.length) return;

    const userIds = projectUsers.map((pu) => pu.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("email, user_id, email_notifications_enabled, email_comment_notifications_enabled")
      .in("user_id", userIds);
    if (!profiles?.length) return;

    const lang = i18n.language?.startsWith("es") ? "es" : "en";

    // Strip mention markup for email display
    const cleanBody = commentBody.replace(/@\[([^\]]+)\]\([^)]+\)/g, "@$1");

    for (const profile of profiles) {
      // Skip author, skip if no email, skip if notifications or comment notifications disabled
      if (profile.user_id === commentAuthorId) continue;
      if (!profile.email) continue;
      if (!profile.email_notifications_enabled) continue;
      if (!profile.email_comment_notifications_enabled) continue;

      supabase.functions
        .invoke("send-transactional-email", {
          body: {
            templateName: "comment-notification",
            recipientEmail: profile.email,
            idempotencyKey: `comment-notif-${commentId}-${profile.user_id}`,
            templateData: {
              projectName: project.name,
              phaseName: phase.name,
              itemTitle: item.title,
              commentAuthor: commentAuthorName,
              commentBody: cleanBody,
              isReply: !!parentCommentId,
              parentAuthor,
              lang,
              itemUrl: `${window.location.origin}/dashboard/projects`,
            },
          },
        })
        .catch((err) => console.error("Comment email error:", err));
    }
  } catch (err) {
    console.error("notifyCommentPosted error:", err);
  }
}
