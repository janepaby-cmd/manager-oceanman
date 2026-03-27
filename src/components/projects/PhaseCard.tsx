import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Pencil, Trash2, Plus, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import PhaseItemRow from "./PhaseItemRow";
import ItemFormDialog from "./ItemFormDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  phase: any;
  canManage: boolean;
  onEdit: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
}

export default function PhaseCard({ phase, canManage, onEdit, onDeleted, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [showDelete, setShowDelete] = useState(false);

  const fetchItems = async () => {
    const { data } = await supabase
      .from("phase_items")
      .select("*, phase_item_types(name, code)")
      .eq("phase_id", phase.id)
      .order("position");
    if (data) {
      setItems(data);
      // Auto-complete phase if all items completed
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
    if (error) toast.error("Error al eliminar fase");
    else { toast.success("Fase eliminada"); onDeleted(); }
    setShowDelete(false);
  };

  const completedCount = items.filter(i => i.is_completed).length;

  return (
    <>
      <Card className={phase.is_completed ? "border-green-500/50 bg-green-50/30" : ""}>
        <Collapsible open={open} onOpenChange={setOpen}>
          <CardHeader className="py-3">
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              {phase.is_completed ? (
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
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowDelete(true)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
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
                />
              ))}
              {canManage && (
                <Button variant="outline" size="sm" className="w-full" onClick={() => { setEditItem(null); setShowItemForm(true); }}>
                  <Plus className="h-3.5 w-3.5 mr-2" /> Añadir Item
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
            <AlertDialogTitle>¿Eliminar fase?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminarán también todos los items asociados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
