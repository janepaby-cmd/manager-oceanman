import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Pencil, Trash2, Plus, CheckCircle2, Circle, Lock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import PhaseItemRow from "./PhaseItemRow";
import ItemFormDialog from "./ItemFormDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  phase: any;
  canManage: boolean;
  canDelete?: boolean;
  canCreateItems?: boolean;
  canCompleteItems?: boolean;
  isLocked?: boolean;
  maxFiles?: number;
  allowedExtensions?: string[];
  onEdit: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
}

export default function PhaseCard({ phase, canManage, canDelete = canManage, canCreateItems = canManage, canCompleteItems = false, isLocked = false, maxFiles, allowedExtensions, onEdit, onDeleted, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [showDelete, setShowDelete] = useState(false);
  const { t } = useTranslation(["projects", "common"]);

  const fetchItems = async () => {
    const { data } = await supabase
      .from("phase_items")
      .select("*, phase_item_types(name, code)")
      .eq("phase_id", phase.id)
      .order("position");
    if (data) {
      setItems(data);
      const allCompleted = data.length > 0 && data.every((i: any) => i.is_completed);
      if (allCompleted !== phase.is_completed) {
        await supabase.from("project_phases").update({ is_completed: allCompleted }).eq("id", phase.id);
        onUpdated();
      }
    }
  };

  useEffect(() => {
    if (open) fetchItems();
  }, [open, phase.id]);

  const handleDelete = async () => {
    const { error } = await supabase.from("project_phases").delete().eq("id", phase.id);
    if (error) toast.error(t("common:error"));
    else { toast.success(t("phaseDeleted")); onDeleted(); }
    setShowDelete(false);
  };

  const completedCount = items.filter(i => i.is_completed).length;

  return (
    <>
      <Card className={cn(
        phase.is_completed ? "border-green-500/50 bg-green-50/30" : "",
        isLocked ? "opacity-60" : ""
      )}>
        <Collapsible open={open} onOpenChange={(v) => { if (!isLocked) setOpen(v); }}>
          <CardHeader className="py-3">
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              {isLocked ? (
                <Lock className="h-5 w-5 text-muted-foreground" />
              ) : phase.is_completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              <CardTitle className="text-sm flex-1">{phase.name}</CardTitle>
              {items.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {completedCount}/{items.length} items
                </Badge>
              )}
              {canManage && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {canDelete && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowDelete(true)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              )}
            </div>
            {isLocked && (
              <p className="text-xs text-muted-foreground ml-8 italic">{t("phaseLocked")}</p>
            )}
            {phase.description && <p className="text-xs text-muted-foreground ml-8">{phase.description}</p>}
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-2">
              {items.map((item) => (
                <PhaseItemRow
                  key={item.id}
                  item={item}
                  canManage={canManage}
                  onUpdated={fetchItems}
                  onEdit={() => { setEditItem(item); setShowItemForm(true); }}
                  maxFiles={maxFiles}
                  allowedExtensions={allowedExtensions}
                />
              ))}
              {canCreateItems && (
                <Button variant="outline" size="sm" className="w-full" onClick={() => { setEditItem(null); setShowItemForm(true); }}>
                  <Plus className="h-3.5 w-3.5 mr-2" /> {t("addItem")}
                </Button>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <ItemFormDialog
        open={showItemForm}
        onOpenChange={setShowItemForm}
        phaseId={phase.id}
        item={editItem}
        nextPosition={items.length}
        onSaved={fetchItems}
      />

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deletePhase")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deletePhaseConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t("common:delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
