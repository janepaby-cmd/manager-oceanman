import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Menu } from "lucide-react";
import { UsersTab } from "@/components/settings/UsersTab";
import { RolesTab } from "@/components/settings/RolesTab";
import { GeneralTab } from "@/components/settings/GeneralTab";
import { TemplatesTab } from "@/components/settings/TemplatesTab";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const TAB_KEYS = ["general", "users", "roles", "templates"] as const;

export default function SettingsPage() {
  const { hasRole, loading } = useAuth();
  const { t } = useTranslation("settings");
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<string>("general");

  if (!loading && !hasRole("superadmin")) {
    return <Navigate to="/dashboard" replace />;
  }

  const tabLabels: Record<string, string> = {
    general: t("tabs.general"),
    users: t("tabs.users"),
    roles: t("tabs.roles"),
    templates: t("tabs.templates"),
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {isMobile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>{tabLabels[activeTab]}</span>
                  <Menu className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[calc(100vw-2rem)]">
                {TAB_KEYS.map((key) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={activeTab === key ? "bg-accent font-medium" : ""}
                  >
                    {tabLabels[key]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <TabsList>
              {TAB_KEYS.map((key) => (
                <TabsTrigger key={key} value={key}>{tabLabels[key]}</TabsTrigger>
              ))}
            </TabsList>
          )}

          <TabsContent value="general">
            <GeneralTab />
          </TabsContent>

          <TabsContent value="users">
            <UsersTab />
          </TabsContent>

          <TabsContent value="roles">
            <RolesTab />
          </TabsContent>

          <TabsContent value="templates">
            <TemplatesTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
