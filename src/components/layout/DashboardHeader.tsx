import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "@/components/LanguageSelector";
import { getRoleLabel } from "@/lib/roleLabels";
import { useAppSettings } from "@/hooks/useAppSettings";

export function DashboardHeader() {
  const { profile, roles, signOut } = useAuth();
  const { t, i18n } = useTranslation("common");
  const { settings } = useAppSettings();

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 shrink-0">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        <div className="flex items-center gap-2">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="h-6 w-6 rounded object-contain" />
          ) : null}
          <span className="font-semibold text-sm text-foreground tracking-tight uppercase">{settings.app_name}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <LanguageSelector />
        {roles.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {getRoleLabel(roles[0], i18n.language)}
          </Badge>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <Avatar className="h-8 w-8 border border-border">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{profile?.full_name || t("user")}</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              {t("nav.myProfile")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {t("nav.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
