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
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";
import { notifyCommentPosted } from "@/lib/notifyCommentPosted";

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

  // Inline mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionIsEdit, setMentionIsEdit] = useState(false);

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
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  };

  const extractMentions = (text: string): string[] => {
    const regex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const ids: string[] = [];
    let m;
    while ((m = regex.exec(text)) !== null) ids.push(m[2]);
    return ids;
  };

  const renderBody = (text: string) => {
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const withMentions = escaped.replace(
      /@\[([^\]]+)\]\(([^)]+)\)/g,
      '<span class="text-primary font-medium">@$1</span>'
    );
    return DOMPurify.sanitize(withMentions, { ALLOWED_TAGS: ["span"], ALLOWED_ATTR: ["class"] });
  };

  // --- Mention logic ---
  const filteredMentionUsers = mentionQuery !== null
    ? projectUsers.filter((u) => {
        if (u.user_id === user?.id) return false;
        const q = mentionQuery.toLowerCase();
        if (!q) return true; // show all on empty query
        return (u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
      })
    : [];

  const insertMention = (u: ProjectUser, isEdit: boolean) => {
    const setter = isEdit ? setEditBody : setBody;
    const ref = isEdit ? editTextareaRef : textareaRef;
    const cursorPos = ref.current?.selectionStart ?? 0;

    setter((prev) => {
      const before = prev.slice(0, cursorPos);
      const atIdx = before.lastIndexOf("@");
      if (atIdx === -1) return prev;
      const after = prev.slice(cursorPos);
      const mentionText = `@[${u.full_name || u.email}](${u.user_id}) `;
      return before.slice(0, atIdx) + mentionText + after;
    });
    closeMentions();
    setTimeout(() => ref.current?.focus(), 0);
  };

  const closeMentions = () => {
    setMentionQuery(null);
    setMentionIndex(0);
  };

  const detectMention = (value: string, cursorPos: number) => {
    const before = value.slice(0, cursorPos);
    // Match @ preceded by start or whitespace, followed by word chars (the search query)
    const match = before.match(/(?:^|\s)@(\w{0,20})$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionIndex(0);
    } else {
      closeMentions();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>, isEdit: boolean) => {
    const value = e.target.value;
    if (isEdit) setEditBody(value);
    else setBody(value);
    setMentionIsEdit(isEdit);
    const cursorPos = e.target.selectionStart ?? value.length;
    detectMention(value, cursorPos);
  };

  const handleMentionKeyDown = (e: React.KeyboardEvent, isEdit: boolean) => {
    if (mentionQuery === null || filteredMentionUsers.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionIndex((i) => Math.min(i + 1, filteredMentionUsers.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(filteredMentionUsers[mentionIndex], isEdit);
    } else if (e.key === "Escape") {
      closeMentions();
    }
  };

  // --- CRUD ---
  const handleSend = async () => {
    if (!body.trim() || !user) return;
    setSending(true);
    const mentions = extractMentions(body);
    const commentId = crypto.randomUUID();
    await supabase.from("phase_item_comments").insert({
      id: commentId,
      item_id: itemId,
      user_id: user.id,
      body: body.trim(),
      parent_comment_id: replyTo?.id || null,
      mentioned_user_ids: mentions,
    } as any);

    // Get author name for notification
    const { data: authorProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    notifyCommentPosted({
      commentId,
      itemId,
      projectId,
      commentBody: body.trim(),
      commentAuthorName: authorProfile?.full_name || user.email || "",
      commentAuthorId: user.id,
      parentCommentId: replyTo?.id || null,
    }).catch((err) => console.error("Comment notification error:", err));

    setBody("");
    setReplyTo(null);
    closeMentions();
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
    closeMentions();
    await fetchComments();
  };

  // --- Helpers ---
  const parentComments = comments.filter((c) => !c.parent_comment_id);
  const getReplies = (parentId: string) =>
    comments.filter((c) => c.parent_comment_id === parentId).sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  const getReferencedComment = (parentId: string | null) =>
    parentId ? comments.find((c) => c.id === parentId) || null : null;
  const formatDate = (d: string) => format(new Date(d), "dd MMM yyyy HH:mm", { locale });
  const wasEdited = (c: Comment) => c.updated_at !== c.created_at;

  // --- Mention dropdown ---
  const MentionDropdown = () => {
    if (mentionQuery === null || filteredMentionUsers.length === 0) return null;
    return (
      <div className="absolute bottom-full left-0 mb-1 z-50 bg-popover border rounded-md shadow-md py-1 w-56 max-h-40 overflow-y-auto">
        {filteredMentionUsers.map((u, i) => (
          <button
            key={u.user_id}
            className={cn(
              "w-full text-left px-2 py-1.5 text-xs truncate",
              i === mentionIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent"
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              insertMention(u, mentionIsEdit);
            }}
          >
            <span className="font-medium">{u.full_name || u.email}</span>
            {u.full_name && u.email && (
              <span className="text-muted-foreground ml-1 text-[10px]">({u.email})</span>
            )}
          </button>
        ))}
      </div>
    );
  };

  // --- Comment bubble ---
  const CommentBubble = ({ c }: { c: Comment }) => {
    const isOwn = c.user_id === user?.id;
    const refComment = getReferencedComment(c.parent_comment_id);

    if (editingId === c.id) {
      return (
        <div className="flex flex-col gap-1 w-full relative">
          <div className="relative">
            <Textarea
              ref={editTextareaRef}
              value={editBody}
              onChange={(e) => handleTextChange(e, true)}
              onKeyDown={(e) => handleMentionKeyDown(e, true)}
              className="min-h-[48px] text-xs resize-none"
              rows={2}
            />
            {mentionIsEdit && <MentionDropdown />}
          </div>
          <div className="flex gap-1 justify-end">
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setEditingId(null); closeMentions(); }}>
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
          {refComment && (
            <div className="border-l-2 border-primary/30 pl-2 my-1 text-[11px] text-muted-foreground italic truncate">
              ↩ {getUserName(refComment.user_id)}: {refComment.body.replace(/@\[([^\]]+)\]\([^)]+\)/g, "@$1").slice(0, 60)}
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
              onClick={() => { setReplyTo(c); textareaRef.current?.focus(); }}
            >
              <Reply className="h-3 w-3 mr-0.5" /> {t("commentReply")}
            </Button>
            {isOwn && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[10px]"
                onClick={() => { setEditingId(c.id); setEditBody(c.body); }}
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
        <div className="space-y-1.5" ref={containerRef}>
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
          <div className="flex gap-1.5 items-end relative">
            <div className="relative flex-1">
              <Textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => handleTextChange(e, false)}
                onKeyDown={(e) => {
                  handleMentionKeyDown(e, false);
                  if (mentionQuery === null && e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
                }}
                placeholder={t("commentPlaceholder")}
                className="min-h-[36px] text-xs resize-none w-full"
                rows={1}
              />
              {!mentionIsEdit && <MentionDropdown />}
            </div>
            <Button size="icon" className="h-7 w-7 shrink-0" onClick={handleSend} disabled={!body.trim() || sending}>
              <Send className="h-3.5 w-3.5" />
            </Button>
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
