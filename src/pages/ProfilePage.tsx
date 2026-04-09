import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getRoleLabel } from "@/lib/roleLabels";
import { KeyRound, Mail, User, Bell } from "lucide-react";
import { ChangePasswordDialog } from "@/components/auth/ChangePasswordDialog";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { profile, roles, user } = useAuth();
  const { t, i18n } = useTranslation(["common", "auth"]);
  const [changePwdOpen, setChangePwdOpen] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("email_notifications_enabled")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setEmailNotifications(data.email_notifications_enabled);
      });
  }, [user]);

  const handleToggleNotifications = async (checked: boolean) => {
    if (!user) return;
    setLoadingNotif(true);
    const { error } = await supabase
      .from("profiles")
      .update({ email_notifications_enabled: checked })
      .eq("user_id", user.id);
    if (error) {
      toast({ title: t("common:error"), description: error.message, variant: "destructive" });
    } else {
      setEmailNotifications(checked);
      toast({ title: t("common:success") });
    }
    setLoadingNotif(false);
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{t("common:nav.myProfile")}</h1>

        <Card>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <Avatar className="h-16 w-16 border border-border">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <CardTitle className="text-lg">{profile?.full_name || t("common:user")}</CardTitle>
              {roles.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {getRoleLabel(roles[0], i18n.language)}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("common:email")}:</span>
              <span className="font-medium text-foreground">{profile?.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("common:name")}:</span>
              <span className="font-medium text-foreground">{profile?.full_name}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              {t("common:profile.notifications")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notif" className="text-sm">
                {t("common:profile.emailNotifications")}
              </Label>
              <Switch
                id="email-notif"
                checked={emailNotifications}
                onCheckedChange={handleToggleNotifications}
                disabled={loadingNotif}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t("common:profile.emailNotificationsDesc")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("auth:changePassword")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setChangePwdOpen(true)} variant="outline">
              <KeyRound className="mr-2 h-4 w-4" />
              {t("auth:changePassword")}
            </Button>
          </CardContent>
        </Card>
      </div>

      <ChangePasswordDialog open={changePwdOpen} onOpenChange={setChangePwdOpen} />
    </DashboardLayout>
  );
}
