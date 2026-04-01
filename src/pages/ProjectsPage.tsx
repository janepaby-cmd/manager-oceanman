import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FolderKanban } from "lucide-react";
import ProjectList from "@/components/projects/ProjectList";
import ProjectDetail from "@/components/projects/ProjectDetail";
import { useTranslation } from "react-i18next";

export default function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { t } = useTranslation("projects");

  useEffect(() => {
    const openId = searchParams.get("open");
    if (openId) {
      setSelectedProjectId(openId);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        </div>
        {selectedProjectId ? (
          <ProjectDetail projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />
        ) : (
          <ProjectList onSelectProject={setSelectedProjectId} />
        )}
      </div>
    </DashboardLayout>
  );
}
