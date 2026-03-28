import { useState, useEffect } from "react";
import { useAppSettings } from "@/hooks/useAppSettings";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Loader2, Upload, Trash2, Send, Image } from "lucide-react";

export function GeneralTab() {
  const { settings, isLoading, updateSetting } = useAppSettings();
  const { toast } = useToast();
  const { t } = useTranslation("settings");

  const [appName, setAppName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savingName, setSavingName] = useState(false);

  const [senderEmail, setSenderEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setAppName(settings.app_name || "");
      setLogoUrl(settings.logo_url);
      setSenderEmail(settings.brevo_sender_email || "");
      setSenderName(settings.brevo_sender_name || "");
    }
  }, [isLoading, settings]);

  const handleSaveName = async () => {
    if (!appName.trim()) return;
    setSavingName(true);
    try {
      await updateSetting.mutateAsync({ key: "app_name", value: appName.trim() });
      toast({ title: t("general.saved") });
    } catch {
      toast({ title: t("general.saveError"), variant: "destructive" });
    }
    setSavingName(false);
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `brand/logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("project-files")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage
        .from("project-files")
        .getPublicUrl(path);
      const url = urlData.publicUrl + "?t=" + Date.now();
      await updateSetting.mutateAsync({ key: "logo_url", value: url });
      setLogoUrl(url);
      toast({ title: t("general.logoUploaded") });
    } catch {
      toast({ title: t("general.uploadError"), variant: "destructive" });
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleRemoveLogo = async () => {
    try {
      await supabase.storage.from("project-files").remove(["brand/logo.png", "brand/logo.jpg", "brand/logo.svg", "brand/logo.webp"]);
      await updateSetting.mutateAsync({ key: "logo_url", value: null });
      setLogoUrl(null);
      toast({ title: t("general.logoRemoved") });
    } catch {
      toast({ title: t("general.saveError"), variant: "destructive" });
    }
  };

  const handleSaveEmail = async () => {
    setSavingEmail(true);
    try {
      await updateSetting.mutateAsync({ key: "brevo_sender_email", value: senderEmail.trim() || null });
      await updateSetting.mutateAsync({ key: "brevo_sender_name", value: senderName.trim() || null });
      toast({ title: t("general.saved") });
    } catch {
      toast({ title: t("general.saveError"), variant: "destructive" });
    }
    setSavingEmail(false);
  };

  const handleTestEmail = async () => {
    if (!testEmail.trim()) return;
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-brevo-email", {
        body: {
          to: testEmail.trim(),
          subject: `Test email from ${settings.app_name}`,
          htmlContent: `<html><body><h1>Test Email</h1><p>This is a test email from <strong>${settings.app_name}</strong>.</p><p>If you received this, your Brevo email configuration is working correctly.</p></body></html>`,
          senderEmail: senderEmail.trim(),
          senderName: senderName.trim() || settings.app_name,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: t("general.testSent") });
    } catch (err: any) {
      toast({ title: t("general.testError"), description: err.message, variant: "destructive" });
    }
    setSendingTest(false);
  };

  if (isLoading) return <div className="p-12 text-center text-muted-foreground">{t("general.loading")}</div>;

  return (
    <div className="space-y-6">
      {/* Brand Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            {t("general.brandTitle")}
          </CardTitle>
          <CardDescription>{t("general.brandDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo */}
          <div className="space-y-3">
            <Label>{t("general.logo")}</Label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="relative h-16 w-16 rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center">
                  <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-lg border border-dashed border-border flex items-center justify-center bg-muted">
                  <Image className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild disabled={uploading}>
                  <label className="cursor-pointer">
                    {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    {t("general.uploadLogo")}
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} />
                  </label>
                </Button>
                {logoUrl && (
                  <Button variant="outline" size="sm" onClick={handleRemoveLogo}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("general.removeLogo")}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* App Name */}
          <div className="space-y-2">
            <Label htmlFor="appName">{t("general.appName")}</Label>
            <div className="flex gap-2 max-w-md">
              <Input
                id="appName"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder={t("general.appNamePlaceholder")}
              />
              <Button onClick={handleSaveName} disabled={savingName || !appName.trim()}>
                {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : t("general.save")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("general.appNameHint")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Email Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            {t("general.emailTitle")}
          </CardTitle>
          <CardDescription>{t("general.emailDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="senderEmail">{t("general.senderEmail")}</Label>
              <Input
                id="senderEmail"
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="noreply@yourdomain.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senderName">{t("general.senderName")}</Label>
              <Input
                id="senderName"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder={settings.app_name}
              />
            </div>
            <Button onClick={handleSaveEmail} disabled={savingEmail}>
              {savingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("general.saveEmailConfig")}
            </Button>
          </div>

          <div className="border-t pt-4 space-y-3">
            <Label>{t("general.testEmailTitle")}</Label>
            <div className="flex gap-2 max-w-md">
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder={t("general.testEmailPlaceholder")}
              />
              <Button onClick={handleTestEmail} disabled={sendingTest || !testEmail.trim() || !senderEmail.trim()} variant="outline">
                {sendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {t("general.sendTest")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("general.testEmailHint")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
