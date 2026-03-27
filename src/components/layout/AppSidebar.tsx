import {
  LayoutDashboard,
  Users,
  Shield,
  FolderKanban,
  Settings,
  Anchor,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Proyectos", url: "/dashboard/projects", icon: FolderKanban },
];

const adminItems = [
  { title: "Usuarios", url: "/dashboard/users", icon: Users },
  { title: "Roles", url: "/dashboard/roles", icon: Shield },
];

const settingsItems = [
  { title: "Configuración", url: "/dashboard/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { hasRole } = useAuth();
  const isAdmin = hasRole("superadmin") || hasRole("admin");

  const renderItems = (items: typeof mainItems) =>
    items.map((item) => (
      <SidebarMenuItem key={item.title}>
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
        {/* Brand */}
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-4 py-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary/20">
              <Anchor className="h-4 w-4 text-sidebar-primary" />
            </div>
            <span className="font-semibold text-sm text-sidebar-foreground tracking-tight">
              OceanMan
            </span>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-[10px] uppercase tracking-widest">
            General
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(mainItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-muted text-[10px] uppercase tracking-widest">
              Administración
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(adminItems)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-[10px] uppercase tracking-widest">
            Sistema
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(settingsItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {!collapsed && (
          <p className="px-4 pb-4 text-[10px] text-sidebar-muted">
            Project Manager v1.0
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
