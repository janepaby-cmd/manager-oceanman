import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, FolderOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  projectId: string;
}

interface DocItem {
  id: string;
  title: string;
  file_url: string;
  phase_name: string;
  type_name: string;
  type_code: string;
}

function getFileExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split(".").pop()?.toLowerCase() || "";
    return ext;
  } catch {
    return "";
  }
}

function getFileName(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    return decodeURIComponent(pathname.split("/").pop() || "file");
  } catch {
    return "file";
  }
}

export default function ProjectDocuments({ projectId }: Props) {
  const { t } = useTranslation(["projects"]);
  const [docs, setDocs] = useState<DocItem[]>([]);

  const fetchDocs = useCallback(async () => {
    // Get all phases for this project
    const { data: phases } = await supabase
      .from("project_phases")
      .select("id, name")
      .eq("project_id", projectId);

    if (!phases || phases.length === 0) {
      setDocs([]);
      return;
    }

    const phaseIds = phases.map((p) => p.id);
    const phaseMap = Object.fromEntries(phases.map((p) => [p.id, p.name]));

    // Get all items with file_url
    const { data: items } = await supabase
      .from("phase_items")
      .select("id, title, file_url, phase_id, phase_item_types(name, code)")
      .in("phase_id", phaseIds)
      .not("file_url", "is", null);

    if (!items) {
      setDocs([]);
      return;
    }

    const docItems: DocItem[] = items
      .filter((item: any) => item.file_url)
      .map((item: any) => ({
        id: item.id,
        title: item.title,
        file_url: item.file_url,
        phase_name: phaseMap[item.phase_id] || "",
        type_name: item.phase_item_types?.name || "",
        type_code: item.phase_item_types?.code || "",
      }));

    setDocs(docItems);
  }, [projectId]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  // Also refetch when storage changes (listen to phase_items changes)
  useEffect(() => {
    const channel = supabase
      .channel(`project-docs-${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "phase_items" }, () => {
        fetchDocs();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId, fetchDocs]);

  const extBadgeColor = (ext: string) => {
    if (["pdf"].includes(ext)) return "destructive";
    if (["xlsx", "xls"].includes(ext)) return "default";
    if (["doc", "docx"].includes(ext)) return "secondary";
    if (["ppt", "pptx"].includes(ext)) return "outline";
    if (["gpx", "kml", "kmz"].includes(ext)) return "default";
    if (["zip"].includes(ext)) return "secondary";
    return "outline";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FolderOpen className="h-5 w-5" />
          {t("documents")}
          {docs.length > 0 && (
            <Badge variant="secondary" className="ml-2">{docs.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t("noDocuments")}</p>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => {
              const ext = getFileExtension(doc.file_url);
              const fileName = getFileName(doc.file_url);
              return (
                <div key={doc.id} className="flex items-center gap-3 p-2 rounded-md border bg-background">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{doc.phase_name} · {fileName}</p>
                  </div>
                  {ext && (
                    <Badge variant={extBadgeColor(ext) as any} className="text-xs uppercase shrink-0">
                      {ext}
                    </Badge>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download>
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}