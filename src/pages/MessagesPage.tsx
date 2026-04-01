import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useTranslation } from "react-i18next";
import { useInboxMessages, useSentMessages, useBoardMessages } from "@/hooks/useMessages";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Inbox, Send, Megaphone, PenSquare, Settings2 } from "lucide-react";
import MessageList from "@/components/messages/MessageList";
import MessageCompose from "@/components/messages/MessageCompose";
import MessageManage from "@/components/messages/MessageManage";

export default function MessagesPage() {
  const { hasRole } = useAuth();
  const { can } = usePermissions();
  const { t } = useTranslation("messages");
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "inbox";

  const { data: inboxData = [], isLoading: inboxLoading } = useInboxMessages();
  const { data: sentData = [], isLoading: sentLoading } = useSentMessages();
  const { data: boardData = [], isLoading: boardLoading } = useBoardMessages();

  const isAdmin = hasRole("superadmin") || hasRole("admin");
  const canCompose = can("create", "messages");

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const unreadCount = inboxData.filter((m: any) => !m.recipient_status?.read_at).length;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>

        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${isAdmin ? 5 : 4}, 1fr)` }}>
            <TabsTrigger value="inbox" className="gap-1.5 text-xs sm:text-sm">
              <Inbox className="h-4 w-4" />
              <span className="hidden sm:inline">{t("inbox")}</span>
              {unreadCount > 0 && (
                <span className="bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="gap-1.5 text-xs sm:text-sm">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">{t("sent")}</span>
            </TabsTrigger>
            <TabsTrigger value="board" className="gap-1.5 text-xs sm:text-sm">
              <Megaphone className="h-4 w-4" />
              <span className="hidden sm:inline">{t("board")}</span>
            </TabsTrigger>
            {canCompose && (
              <TabsTrigger value="compose" className="gap-1.5 text-xs sm:text-sm">
                <PenSquare className="h-4 w-4" />
                <span className="hidden sm:inline">{t("compose")}</span>
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="manage" className="gap-1.5 text-xs sm:text-sm">
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">{t("manage")}</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="inbox">
            <MessageList
              messages={inboxData}
              isLoading={inboxLoading}
              mode="inbox"
              emptyMessage={t("noMessagesDesc")}
            />
          </TabsContent>

          <TabsContent value="sent">
            <MessageList
              messages={sentData}
              isLoading={sentLoading}
              mode="sent"
              emptyMessage={t("noSentMessages")}
            />
          </TabsContent>

          <TabsContent value="board">
            <MessageList
              messages={boardData}
              isLoading={boardLoading}
              mode="board"
              emptyMessage={t("noAnnouncements")}
            />
          </TabsContent>

          <TabsContent value="compose">
            <MessageCompose onSent={() => handleTabChange("sent")} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="manage">
              <MessageManage />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
