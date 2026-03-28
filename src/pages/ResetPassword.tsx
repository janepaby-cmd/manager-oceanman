import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useAppSettings } from "@/hooks/useAppSettings";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation(["auth", "common"]);
  const { settings } = useAppSettings();

  useEffect(() => {
    // Check if we have a recovery session from the URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get("type");
    
    if (type === "recovery") {
      setValidSession(true);
    } else {
      // Also check via auth state
      supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          setValidSession(true);
        }
      });
      // Give it a moment to process
      setTimeout(() => {
        setValidSession((prev) => prev === null ? false : prev);
      }, 2000);
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: t("auth:passwordTooShort"), variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: t("auth:passwordsMismatch"), variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({ title: t("auth:passwordChangeError"), description: error.message, variant: "destructive" });
    } else {
      setSuccess(true);
      toast({ title: t("auth:passwordResetSuccess"), description: t("auth:passwordResetSuccessDesc") });
      setTimeout(() => navigate("/login"), 3000);
    }
    setLoading(false);
  };

  return (
    <div className="login-gradient flex min-h-screen items-center justify-center px-4">
      <div className="absolute top-4 right-4">
        <LanguageSelector variant="minimal" />
      </div>
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-3">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="h-16 object-contain brightness-0 invert" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 border border-primary/30">
              <span className="text-3xl font-bold text-primary">{settings.app_name.charAt(0)}</span>
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase">{settings.app_name}</h1>
        </div>

        {success ? (
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto" />
            <p className="text-white">{t("auth:passwordResetSuccess")}</p>
            <p className="text-sm text-slate-400">{t("auth:passwordResetSuccessDesc")}</p>
          </div>
        ) : validSession === false ? (
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-center space-y-4">
            <p className="text-white">{t("auth:invalidResetLink")}</p>
            <p className="text-sm text-slate-400">{t("auth:invalidResetLinkDesc")}</p>
            <Button onClick={() => navigate("/login")} variant="outline" className="mt-4">
              {t("auth:backToLogin")}
            </Button>
          </div>
        ) : validSession === null ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-5 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-8">
            <p className="text-sm text-slate-400 text-center">{t("auth:resetPasswordDesc")}</p>
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-slate-300 text-sm">{t("auth:newPassword")}</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-white/10 border-white/15 text-white placeholder:text-slate-500 focus:border-primary focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-300 text-sm">{t("auth:confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="bg-white/10 border-white/15 text-white placeholder:text-slate-500 focus:border-primary focus:ring-primary"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("auth:resetPassword")}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
