import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, FolderOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  projectId: string;
  refreshKey?: number;
}

interface DocItem {
  id: string;
  item_title: string;
  file_url: string;
  file_name: string;
  file_extension: string;
  phase_name: string;
}

export default function ProjectDocuments({ projectId, refreshKey }: Props) {
  const { t } = useTranslation(["projects"]);
  const [docs, setDocs] = useState<DocItem[]>([]);

  const fetchDocs = useCallback(async () => {
    const { data: phases } = await supabase
      .from("project_phases")
      .select("id, name")
      .eq("project_id", projectId);

    if (!phases || phases.length === 0) { setDocs([]); return; }

    const phaseIds = phases.map((p) => p.id);
    const phaseMap = Object.fromEntries(phases.map((p) => [p.id, p.name]));

    // Get items for these phases
    const { data: items } = await supabase
      .from("phase_items")
      .select("id, title, phase_id")
      .in("phase_id", phaseIds);

    if (!items || items.length === 0) { setDocs([]); return; }

    const itemIds = items.map((i) => i.id);
    const itemMap = Object.fromEntries(items.map((i) => [i.id, { title: i.title, phase_id: i.phase_id }]));

    // Get all files
    const { data: files } = await supabase
      .from("phase_item_files")
      .select("id, item_id, file_url, file_name, file_extension")
      .in("item_id", itemIds)
      .order("created_at");

    if (!files) { setDocs([]); return; }

    const docItems: DocItem[] = files.map((f: any) => {
      const itemInfo = itemMap[f.item_id] || { title: "", phase_id: "" };
      return {
        id: f.id,
        item_title: itemInfo.title,
        file_url: f.file_url,
        file_name: f.file_name,
        file_extension: f.file_extension,
        phase_name: phaseMap[itemInfo.phase_id] || "",
      };
    });

    setDocs(docItems);
  }, [projectId]);

  useEffect(() => { fetchDocs(); }, [fetchDocs, refreshKey]);

  useEffect(() => {
    const channel = supabase
      .channel(`project-docs-${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "phase_item_files" }, () => {
        fetchDocs();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, fetchDocs]);

  const extBadgeColor = (ext: string) => {
    if (["pdf"].includes(ext)) return "destructive";
    if (["xlsx", "xls"].includes(ext)) return "default";
    if (["doc", "docx"].includes(ext)) return "secondary";
    if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "svg"].includes(ext)) return "outline";
    if (["kml", "kmz", "gpx"].includes(ext)) return "default";
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
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 p-2 rounded-md border bg-background">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.item_title}</p>
                  <p className="text-xs text-muted-foreground truncate">{doc.phase_name} · {doc.file_name}</p>
                </div>
                {doc.file_extension && (
                  <Badge variant={extBadgeColor(doc.file_extension) as any} className="text-xs uppercase shrink-0">
                    {doc.file_extension}
                  </Badge>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download>
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
