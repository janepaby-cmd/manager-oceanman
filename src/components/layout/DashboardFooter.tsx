import { useTranslation } from "react-i18next";

export function DashboardFooter() {
  const { t } = useTranslation("common");

  return (
    <footer className="h-10 flex items-center justify-between border-t border-border bg-card px-6 shrink-0">
      <p className="text-xs text-muted-foreground">{t("copyright")}</p>
      <p className="text-xs text-muted-foreground">{t("version")}</p>
    </footer>
  );
}
