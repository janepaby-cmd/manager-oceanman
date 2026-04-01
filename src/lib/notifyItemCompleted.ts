import { supabase } from "@/integrations/supabase/client";
import i18n from "@/i18n";

interface NotifyItemCompletedParams {
  itemId: string;
  itemTitle: string;
  phaseId: string;
  completedByName: string;
}

export async function notifyItemCompleted({
  itemId,
  itemTitle,
  phaseId,
  completedByName,
}: NotifyItemCompletedParams) {
  try {
    // Get phase + project info
    const { data: phase } = await supabase
      .from("project_phases")
      .select("name, project_id")
      .eq("id", phaseId)
      .single();
    if (!phase) return;

    const { data: project } = await supabase
      .from("projects")
      .select("name")
      .eq("id", phase.project_id)
      .single();
    if (!project) return;

    // Get attached files for this item
    const { data: files } = await supabase
      .from("phase_item_files")
      .select("file_name, file_url, file_extension")
      .eq("item_id", itemId)
      .order("created_at");

    const attachedFiles = (files || []).map((f) => ({
      name: f.file_name,
      url: f.file_url,
      extension: f.file_extension,
    }));

    // Get all project users' emails
    const { data: projectUsers } = await supabase
      .from("project_users")
      .select("user_id")
      .eq("project_id", phase.project_id);
    if (!projectUsers?.length) return;

    const userIds = projectUsers.map((pu) => pu.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("email, user_id")
      .in("user_id", userIds);
    if (!profiles?.length) return;

    const lang = i18n.language?.startsWith("es") ? "es" : "en";
    const now = new Date().toLocaleString(lang === "es" ? "es-ES" : "en-US", {
      dateStyle: "short",
      timeStyle: "short",
    });

    // Send one email per user
    for (const profile of profiles) {
      if (!profile.email) continue;
      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "item-completed",
          recipientEmail: profile.email,
          idempotencyKey: `item-completed-${itemId}-${profile.user_id}`,
          templateData: {
            projectName: project.name,
            phaseName: phase.name,
            itemTitle,
            completedBy: completedByName,
            completedAt: now,
            lang,
            attachedFiles,
          },
        },
      }).catch((err) => console.error("Email send error:", err));
    }
  } catch (err) {
    console.error("notifyItemCompleted error:", err);
  }
}
