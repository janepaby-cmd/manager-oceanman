import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { MessageWithMeta } from "@/types/messages";

const db = supabase as any;

async function enrichWithProfiles(messages: any[]): Promise<MessageWithMeta[]> {
  if (!messages.length) return [];
  const senderIds = [...new Set(messages.map((m: any) => m.sender_user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, email")
    .in("user_id", senderIds);
  const map = new Map((profiles || []).map((p) => [p.user_id, p]));
  return messages.map((m: any) => ({
    ...m,
    sender_name: map.get(m.sender_user_id)?.full_name || "—",
    sender_email: map.get(m.sender_user_id)?.email || "",
  }));
}

export function useInboxMessages() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["messages", "inbox", user?.id],
    queryFn: async () => {
      const { data: recs } = await db
        .from("message_recipients")
        .select("*")
        .eq("recipient_user_id", user!.id)
        .eq("is_visible", true)
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (!recs?.length) return [];

      const msgIds = recs.map((r: any) => r.message_id);
      const { data: msgs } = await db
        .from("messages")
        .select("*")
        .in("id", msgIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (!msgs?.length) return [];

      const { data: atts } = await db
        .from("message_attachments")
        .select("message_id")
        .in("message_id", msgIds);
      const attSet = new Set((atts || []).map((a: any) => a.message_id));
      const recMap = new Map(recs.map((r: any) => [r.message_id, r]));

      const enriched = await enrichWithProfiles(msgs);
      return enriched.map((m) => {
        const rec = recMap.get(m.id) as any;
        return {
          ...m,
          has_attachments: attSet.has(m.id),
          recipient_status: {
            read_at: rec?.read_at ?? null,
            viewed_at: rec?.viewed_at ?? null,
            archived_at: rec?.archived_at ?? null,
            recipient_id: rec?.id ?? "",
          },
        };
      });
    },
    enabled: !!user?.id,
  });
}

export function useSentMessages() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["messages", "sent", user?.id],
    queryFn: async () => {
      const { data: msgs } = await db
        .from("messages")
        .select("*")
        .eq("sender_user_id", user!.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (!msgs?.length) return [];

      const msgIds = msgs.map((m: any) => m.id);
      const { data: recs } = await db
        .from("message_recipients")
        .select("message_id, read_at, email_status")
        .in("message_id", msgIds);

      const counts = new Map<string, { total: number; read: number }>();
      (recs || []).forEach((r: any) => {
        const c = counts.get(r.message_id) || { total: 0, read: 0 };
        c.total++;
        if (r.read_at) c.read++;
        counts.set(r.message_id, c);
      });

      const { data: atts } = await db
        .from("message_attachments")
        .select("message_id")
        .in("message_id", msgIds);
      const attSet = new Set((atts || []).map((a: any) => a.message_id));

      const enriched = await enrichWithProfiles(msgs);
      return enriched.map((m) => ({
        ...m,
        has_attachments: attSet.has(m.id),
        recipient_counts: counts.get(m.id) || { total: 0, read: 0 },
      }));
    },
    enabled: !!user?.id,
  });
}

export function useBoardMessages() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["messages", "board", user?.id],
    queryFn: async () => {
      const { data: recs } = await db
        .from("message_recipients")
        .select("*")
        .eq("recipient_user_id", user!.id)
        .eq("is_visible", true)
        .order("created_at", { ascending: false });
      if (!recs?.length) return [];

      const msgIds = recs.map((r: any) => r.message_id);
      const { data: msgs } = await db
        .from("messages")
        .select("*")
        .in("id", msgIds)
        .eq("message_type", "announcement")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (!msgs?.length) return [];

      const recMap = new Map(recs.map((r: any) => [r.message_id, r]));
      const enriched = await enrichWithProfiles(msgs);
      return enriched.map((m) => {
        const rec = recMap.get(m.id) as any;
        return {
          ...m,
          recipient_status: {
            read_at: rec?.read_at ?? null,
            viewed_at: rec?.viewed_at ?? null,
            archived_at: rec?.archived_at ?? null,
            recipient_id: rec?.id ?? "",
          },
        };
      });
    },
    enabled: !!user?.id,
  });
}

export function useUnreadCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["messages", "unread-count", user?.id],
    queryFn: async () => {
      const { data: recs } = await db
        .from("message_recipients")
        .select("id, message_id")
        .eq("recipient_user_id", user!.id)
        .eq("is_visible", true)
        .is("read_at", null);
      if (!recs?.length) return { total: 0, announcements: 0, messages: [] };

      const msgIds = recs.map((r: any) => r.message_id);
      const { data: msgs } = await db
        .from("messages")
        .select("id, subject, message_type, priority, created_at, sender_user_id")
        .in("id", msgIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(5);

      const announcements = (msgs || []).filter((m: any) => m.message_type === "announcement").length;
      const enriched = await enrichWithProfiles(msgs || []);
      return { total: recs.length, announcements, messages: enriched };
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
}

export function useMessageDetail(messageId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["messages", "detail", messageId],
    queryFn: async () => {
      const { data: msg } = await db
        .from("messages")
        .select("*")
        .eq("id", messageId)
        .single();
      if (!msg) throw new Error("Message not found");

      const [{ data: atts }, { data: recs }, { data: thread }] = await Promise.all([
        db.from("message_attachments").select("*").eq("message_id", messageId),
        db.from("message_recipients").select("*").eq("message_id", messageId),
        db.from("messages").select("*").eq("parent_message_id", messageId).is("deleted_at", null).order("created_at"),
      ]);

      // Get profiles for recipients
      const recipientIds = (recs || []).map((r: any) => r.recipient_user_id);
      const allUserIds = [...new Set([msg.sender_user_id, ...recipientIds])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", allUserIds);
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      const enrichedThread = await enrichWithProfiles(thread || []);

      // Mark as viewed/read for current user
      const myRec = (recs || []).find((r: any) => r.recipient_user_id === user!.id);
      if (myRec && !myRec.read_at) {
        const now = new Date().toISOString();
        await db
          .from("message_recipients")
          .update({ viewed_at: myRec.viewed_at || now, read_at: now })
          .eq("id", myRec.id);
      }

      // Audit log
      await db.from("message_audit_logs").insert({
        message_id: messageId,
        user_id: user!.id,
        action: "read",
        metadata: {},
      });

      return {
        ...msg,
        sender_name: profileMap.get(msg.sender_user_id)?.full_name || "—",
        sender_email: profileMap.get(msg.sender_user_id)?.email || "",
        attachments: atts || [],
        recipients: (recs || []).map((r: any) => ({
          ...r,
          recipient_name: profileMap.get(r.recipient_user_id)?.full_name || "—",
          recipient_email: profileMap.get(r.recipient_user_id)?.email || "",
        })),
        thread: enrichedThread,
      };
    },
    enabled: !!messageId && !!user?.id,
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ recipientId, read }: { recipientId: string; read: boolean }) => {
      await db
        .from("message_recipients")
        .update({ read_at: read ? new Date().toISOString() : null })
        .eq("id", recipientId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}

export function useArchiveMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recipientId: string) => {
      await db
        .from("message_recipients")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", recipientId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}

export function useAllMessages() {
  return useQuery({
    queryKey: ["messages", "all-admin"],
    queryFn: async () => {
      const { data: msgs } = await db
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (!msgs?.length) return [];

      const msgIds = msgs.map((m: any) => m.id);
      const { data: recs } = await db
        .from("message_recipients")
        .select("message_id, read_at, email_status")
        .in("message_id", msgIds);

      const counts = new Map<string, { total: number; read: number; emailOk: number; emailErr: number }>();
      (recs || []).forEach((r: any) => {
        const c = counts.get(r.message_id) || { total: 0, read: 0, emailOk: 0, emailErr: 0 };
        c.total++;
        if (r.read_at) c.read++;
        if (r.email_status === "sent") c.emailOk++;
        if (r.email_status === "error") c.emailErr++;
        counts.set(r.message_id, c);
      });

      const enriched = await enrichWithProfiles(msgs);
      return enriched.map((m) => ({
        ...m,
        recipient_counts: counts.get(m.id) || { total: 0, read: 0, emailOk: 0, emailErr: 0 },
      }));
    },
  });
}
