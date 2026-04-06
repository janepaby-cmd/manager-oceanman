import { useTranslation } from "react-i18next";
import { usePermissions } from "@/hooks/usePermissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, List, BarChart3 } from "lucide-react";
import BudgetConfiguration from "./BudgetConfiguration";
import BudgetEntries from "./BudgetEntries";
import BudgetAnalysis from "./BudgetAnalysis";

interface Props {
  projectId: string;
}

export default function BudgetModule({ projectId }: Props) {
  const { t } = useTranslation("budget");
  const { can } = usePermissions();

  const canCreate = can("create", "budget");
  const canEdit = can("update", "budget");
  const canDelete = can("delete", "budget");

  return (
    <div className="space-y-4">
      <Tabs defaultValue="entries">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configuration" className="flex items-center gap-1.5 text-xs">
            <Settings className="h-3.5 w-3.5" /> {t("tabs.configuration")}
          </TabsTrigger>
          <TabsTrigger value="entries" className="flex items-center gap-1.5 text-xs">
            <List className="h-3.5 w-3.5" /> {t("tabs.entries")}
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> {t("tabs.analysis")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configuration">
          <BudgetConfiguration projectId={projectId} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />
        </TabsContent>
        <TabsContent value="entries">
          <BudgetEntries projectId={projectId} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />
        </TabsContent>
        <TabsContent value="analysis">
          <BudgetAnalysis projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
