import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Anchor } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "@/components/LanguageSelector";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation(["auth", "common"]);

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

  return (
    <div className="login-gradient flex min-h-screen items-center justify-center px-4">
      <div className="absolute top-4 right-4">
        <LanguageSelector variant="minimal" />
      </div>
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20 border border-primary/30">
            <Anchor className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{t("common:appName")}</h1>
          <p className="text-sm text-slate-400">{t("auth:subtitle")}</p>
        </div>

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
            <Input
              id="password"
              type="password"
              placeholder={t("auth:passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-white/10 border-white/15 text-white placeholder:text-slate-500 focus:border-primary focus:ring-primary"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t("auth:loginButton")}
          </Button>
        </form>

        <p className="text-center text-xs text-slate-500">
          {t("common:copyright")}
        </p>
      </div>
    </div>
  );
}
