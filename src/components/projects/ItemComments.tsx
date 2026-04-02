import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  MessageSquare,
  Send,
  Reply,
  Pencil,
  X,
  AtSign,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  item_id: string;
  user_id: string;
  body: string;
  parent_comment_id: string | null;
  mentioned_user_ids: string[];
  created_at: string;
  updated_at: string;
}

interface ProjectUser {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface Props {
  itemId: string;
  projectId: string;
  commentCount: number;
  onCountChange: (count: number) => void;
}

export default function ItemComments({ itemId, projectId, commentCount, onCountChange }: Props) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation(["projects", "common"]);
  const locale = i18n.language === "es" ? es : enUS;

  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([]);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [sending, setSending] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionPos, setMentionPos] = useState<{ top: number; left: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      fetchComments();
      fetchProjectUsers();
    }
  }, [open, itemId]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from("phase_item_comments")
      .select("*")
      .eq("item_id", itemId)
      .order("created_at", { ascending: false });
    if (data) {
      setComments(data as Comment[]);
      onCountChange(data.length);
    }
  };

  const fetchProjectUsers = async () => {
    const { data } = await supabase
      .from("project_users")
      .select("user_id")
      .eq("project_id", projectId);
    if (!data) return;
    const userIds = data.map((d) => d.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", userIds);
    if (profiles) setProjectUsers(profiles);
  };

  const getUserName = (userId: string) => {
    const u = projectUsers.find((p) => p.user_id === userId);
    return u?.full_name || u?.email || userId.slice(0, 8);
  };

  const getInitials = (userId: string) => {
    const name = getUserName(userId);
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const extractMentions = (text: string): string[] => {
    const regex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const ids: string[] = [];
    let m;
    while ((m = regex.exec(text)) !== null) ids.push(m[2]);
    return ids;
  };

  const renderBody = (text: string) => {
    // Replace @[Name](id) with styled mention
    return text.replace(/@\[([^\]]+)\]\(([^)]+)\)/g, (_, name) => {
      return `<span class="text-primary font-medium">@${name}</span>`;
    });
  };

  const insertMention = (u: ProjectUser) => {
    const mention = `@[${u.full_name || u.email}](${u.user_id}) `;
    if (editingId) {
      setEditBody((prev) => prev + mention);
    } else {
      setBody((prev) => prev + mention);
    }
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const handleSend = async () => {
    if (!body.trim() || !user) return;
    setSending(true);
    const mentions = extractMentions(body);
    await supabase.from("phase_item_comments").insert({
      item_id: itemId,
      user_id: user.id,
      body: body.trim(),
      parent_comment_id: replyTo?.id || null,
      mentioned_user_ids: mentions,
    } as any);
    setBody("");
    setReplyTo(null);
    await fetchComments();
    setSending(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editBody.trim()) return;
    const mentions = extractMentions(editBody);
    await supabase
      .from("phase_item_comments")
      .update({ body: editBody.trim(), mentioned_user_ids: mentions, updated_at: new Date().toISOString() } as any)
      .eq("id", id);
    setEditingId(null);
    setEditBody("");
    await fetchComments();
  };

  const parentComments = comments.filter((c) => !c.parent_comment_id);
  const getReplies = (parentId: string) =>
    comments.filter((c) => c.parent_comment_id === parentId).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const getReferencedComment = (parentId: string | null) => {
    if (!parentId) return null;
    return comments.find((c) => c.id === parentId) || null;
  };

  const formatDate = (d: string) => format(new Date(d), "dd MMM yyyy HH:mm", { locale });

  const wasEdited = (c: Comment) => c.updated_at !== c.created_at;

  const MentionPopover = () => (
    <Popover open={showMentions} onOpenChange={setShowMentions}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" type="button">
          <AtSign className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1" align="start">
        <div className="max-h-40 overflow-y-auto">
          {projectUsers
            .filter((u) => u.user_id !== user?.id)
            .map((u) => (
              <button
                key={u.user_id}
                className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent truncate"
                onClick={() => insertMention(u)}
              >
                {u.full_name || u.email}
              </button>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  );

  const CommentBubble = ({ c }: { c: Comment }) => {
    const isOwn = c.user_id === user?.id;
    const ref = getReferencedComment(c.parent_comment_id);

    if (editingId === c.id) {
      return (
        <div className="flex flex-col gap-1 w-full">
          <Textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            className="min-h-[48px] text-xs resize-none"
            rows={2}
          />
          <div className="flex gap-1 justify-end">
            <MentionPopover />
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setEditingId(null)}>
              <X className="h-3 w-3 mr-1" /> {t("common:cancel")}
            </Button>
            <Button size="sm" className="h-6 text-xs" onClick={() => handleUpdate(c.id)}>
              <Check className="h-3 w-3 mr-1" /> {t("common:save")}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="group flex gap-2 w-full">
        <Avatar className="h-6 w-6 shrink-0 mt-0.5">
          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{getInitials(c.user_id)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-foreground">{getUserName(c.user_id)}</span>
            <span className="text-[10px] text-muted-foreground">{formatDate(c.created_at)}</span>
            {wasEdited(c) && (
              <span className="text-[10px] text-muted-foreground italic">({t("commentEdited")} {formatDate(c.updated_at)})</span>
            )}
          </div>
          {ref && (
            <div className="border-l-2 border-primary/30 pl-2 my-1 text-[11px] text-muted-foreground italic truncate">
              ↩ {getUserName(ref.user_id)}: {ref.body.replace(/@\[([^\]]+)\]\([^)]+\)/g, "@$1").slice(0, 60)}
            </div>
          )}
          <p
            className="text-xs text-foreground/90 whitespace-pre-wrap break-words mt-0.5"
            dangerouslySetInnerHTML={{ __html: renderBody(c.body) }}
          />
          <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[10px]"
              onClick={() => {
                setReplyTo(c);
                textareaRef.current?.focus();
              }}
            >
              <Reply className="h-3 w-3 mr-0.5" /> {t("commentReply")}
            </Button>
            {isOwn && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[10px]"
                onClick={() => {
                  setEditingId(c.id);
                  setEditBody(c.body);
                }}
              >
                <Pencil className="h-3 w-3 mr-0.5" /> {t("commentEdit")}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5">
          <MessageSquare className="h-3.5 w-3.5" />
          <span>{t("comments")}</span>
          <Badge variant="secondary" className="h-4 min-w-[16px] px-1 text-[10px] font-medium">
            {commentCount}
          </Badge>
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2 space-y-3 animate-in slide-in-from-top-1">
        {/* New comment input */}
        <div className="space-y-1.5">
          {replyTo && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 rounded px-2 py-1">
              <Reply className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {t("commentReplyingTo")} <strong>{getUserName(replyTo.user_id)}</strong>
              </span>
              <Button variant="ghost" size="icon" className="h-4 w-4 ml-auto shrink-0" onClick={() => setReplyTo(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          <div className="flex gap-1.5 items-end">
            <Textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("commentPlaceholder")}
              className="min-h-[36px] text-xs resize-none flex-1"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
              }}
            />
            <div className="flex flex-col gap-0.5">
              <MentionPopover />
              <Button size="icon" className="h-7 w-7 shrink-0" onClick={handleSend} disabled={!body.trim() || sending}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Comments list */}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {parentComments.map((c) => {
            const replies = getReplies(c.id);
            return (
              <div key={c.id} className="space-y-1.5">
                <CommentBubble c={c} />
                {replies.length > 0 && (
                  <div className="ml-8 space-y-1.5 border-l border-border pl-2">
                    {replies.map((r) => (
                      <CommentBubble key={r.id} c={r} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {comments.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">{t("noComments")}</p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
