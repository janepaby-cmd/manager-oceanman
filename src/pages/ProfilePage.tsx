import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getRoleLabel } from "@/lib/roleLabels";
import { KeyRound, Mail, User, Bell, Camera, Loader2, Trash2 } from "lucide-react";
import { ChangePasswordDialog } from "@/components/auth/ChangePasswordDialog";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { profile, roles, user, refreshProfile } = useAuth();
  const { t, i18n } = useTranslation(["common", "auth"]);
  const [changePwdOpen, setChangePwdOpen] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [commentNotifications, setCommentNotifications] = useState(true);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("email_notifications_enabled, email_comment_notifications_enabled")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setEmailNotifications(data.email_notifications_enabled);
          setCommentNotifications(data.email_comment_notifications_enabled);
        }
      });
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast({ title: t("common:error"), description: "JPG, PNG, WEBP or GIF only", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: t("common:error"), description: "Max 2MB", variant: "destructive" });
      return;
    }

    setUploadingAvatar(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: t("common:error"), description: uploadError.message, variant: "destructive" });
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("user_id", user.id);

    if (updateError) {
      toast({ title: t("common:error"), description: updateError.message, variant: "destructive" });
    } else {
      toast({ title: t("common:success") });
      refreshProfile();
    }
    setUploadingAvatar(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setUploadingAvatar(true);

    // List files in user folder and delete them
    const { data: files } = await supabase.storage.from("avatars").list(user.id);
    if (files?.length) {
      await supabase.storage.from("avatars").remove(files.map((f) => `${user.id}/${f.name}`));
    }

    await supabase.from("profiles").update({ avatar_url: null }).eq("user_id", user.id);
    refreshProfile();
    toast({ title: t("common:success") });
    setUploadingAvatar(false);
  };

  const handleToggleNotifications = async (checked: boolean) => {
    if (!user) return;
    setLoadingNotif(true);
    const updates: { email_notifications_enabled: boolean; email_comment_notifications_enabled?: boolean } = {
      email_notifications_enabled: checked,
    };
    if (!checked) updates.email_comment_notifications_enabled = false;
    const { error } = await supabase.from("profiles").update(updates).eq("user_id", user.id);
    if (error) {
      toast({ title: t("common:error"), description: error.message, variant: "destructive" });
    } else {
      setEmailNotifications(checked);
      if (!checked) setCommentNotifications(false);
      toast({ title: t("common:success") });
    }
    setLoadingNotif(false);
  };

  const handleToggleCommentNotifications = async (checked: boolean) => {
    if (!user) return;
    setLoadingNotif(true);
    const { error } = await supabase
      .from("profiles")
      .update({ email_comment_notifications_enabled: checked })
      .eq("user_id", user.id);
    if (error) {
      toast({ title: t("common:error"), description: error.message, variant: "destructive" });
    } else {
      setCommentNotifications(checked);
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
            <div className="relative group">
              <Avatar className="h-16 w-16 border border-border">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name || ""} />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg">{profile?.full_name || t("common:user")}</CardTitle>
              {roles.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {getRoleLabel(roles[0], i18n.language)}
                </Badge>
              )}
              <div className="flex gap-2 mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  <Camera className="h-3 w-3 mr-1" />
                  {t("common:profile.changeAvatar")}
                </Button>
                {profile?.avatar_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive"
                    onClick={handleRemoveAvatar}
                    disabled={uploadingAvatar}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    {t("common:profile.removeAvatar")}
                  </Button>
                )}
              </div>
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
          <CardContent className="space-y-4">
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
            <p className="text-xs text-muted-foreground">
              {t("common:profile.emailNotificationsDesc")}
            </p>
            <div className="ml-6 border-l-2 border-border pl-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="comment-notif" className="text-sm">
                  {t("common:profile.commentNotifications")}
                </Label>
                <Switch
                  id="comment-notif"
                  checked={commentNotifications}
                  onCheckedChange={handleToggleCommentNotifications}
                  disabled={loadingNotif || !emailNotifications}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("common:profile.commentNotificationsDesc")}
              </p>
            </div>
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
