import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  LogOut,
  MessageSquare,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const isMobile = useIsMobile();
  const { hasRole, signOut } = useAuth();
  const navigate = useNavigate();
  const isSuperadmin = hasRole("superadmin");
  const { t } = useTranslation("common");
  const { settings } = useAppSettings();

  const mainItems = [
    { title: t("nav.dashboard"), url: "/dashboard", icon: LayoutDashboard },
    { title: t("nav.projects"), url: "/dashboard/projects", icon: FolderKanban },
    { title: t("nav.messages", "Mensajes"), url: "/dashboard/messages", icon: MessageSquare },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const renderItems = (items: typeof mainItems) =>
    items.map((item) => (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild>
          <NavLink
            to={item.url}
            end={item.url === "/dashboard"}
            className="hover:bg-sidebar-accent/50"
            activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
          >
            <item.icon className="mr-2 h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon" className="sidebar-gradient border-r-0">
      <SidebarContent>
        {!collapsed && (
        <div className="flex flex-col items-center gap-2 px-3 py-5">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="w-full max-h-16 rounded object-contain brightness-0 invert" />
            ) : null}
            <span className="font-semibold text-sm text-sidebar-foreground tracking-tight uppercase">
              {settings.app_name}
            </span>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-[10px] uppercase tracking-widest">
            {t("nav.general")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(mainItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isSuperadmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-muted text-[10px] uppercase tracking-widest">
              {t("nav.system")}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderItems([{ title: t("nav.settings"), url: "/dashboard/settings", icon: Settings }])}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 pb-3 space-y-2">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{t("nav.logout")}</span>}
          </button>
          {!collapsed && (
            <p className="px-2 text-[10px] text-sidebar-muted">
              {t("projectManager")} {t("version")}
            </p>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
