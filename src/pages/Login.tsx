import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useAppSettings } from "@/hooks/useAppSettings";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation(["auth", "common"]);
  const { settings } = useAppSettings();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

    if (error) {
      toast({ title: t("auth:loginError"), description: error.message, variant: "destructive" });
    } else {
      navigate("/dashboard");
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({ title: t("auth:loginError"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("auth:resetEmailSent"), description: t("auth:resetEmailSentDesc") });
    }
    setResetLoading(false);
  };

  return (
    <div className="login-gradient flex min-h-[100dvh] items-center justify-center px-4">
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

        {forgotMode ? (
          <form onSubmit={handleForgotPassword} className="space-y-5 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-8">
            <p className="text-sm text-slate-400 text-center">{t("auth:forgotPasswordDesc")}</p>
            <div className="space-y-2">
              <Label htmlFor="resetEmail" className="text-slate-300 text-sm">{t("auth:emailLabel")}</Label>
              <Input
                id="resetEmail"
                type="email"
                placeholder={t("auth:emailPlaceholder")}
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                className="bg-white/10 border-white/15 text-white placeholder:text-slate-500 focus:border-primary focus:ring-primary"
              />
            </div>
            <Button type="submit" className="w-full" disabled={resetLoading}>
              {resetLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("auth:sendResetLink")}
            </Button>
            <button
              type="button"
              onClick={() => setForgotMode(false)}
              className="w-full text-sm text-slate-400 hover:text-white transition-colors"
            >
              {t("auth:backToLogin")}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-5 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-8">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300 text-sm">{t("auth:emailLabel")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("auth:emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/10 border-white/15 text-white placeholder:text-slate-500 focus:border-primary focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300 text-sm">{t("auth:passwordLabel")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("auth:passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white/10 border-white/15 text-white placeholder:text-slate-500 focus:border-primary focus:ring-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("auth:loginButton")}
            </Button>
            <button
              type="button"
              onClick={() => setForgotMode(true)}
              className="w-full text-xs text-slate-400 hover:text-white transition-colors"
            >
              {t("auth:forgotPassword")}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-slate-500">
          © {new Date().getFullYear()} {settings.app_name}
        </p>
      </div>
    </div>
  );
}
