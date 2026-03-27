import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phaseId: string;
  item: any | null;
  nextPosition: number;
  onSaved: () => void;
}

export default function ItemFormDialog({ open, onOpenChange, phaseId, item, nextPosition, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [itemTypeId, setItemTypeId] = useState("");
  const [itemTypes, setItemTypes] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("phase_item_types").select("*").order("name").then(({ data }) => {
      if (data) setItemTypes(data);
    });
  }, []);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description || "");
      setItemTypeId(item.item_type_id);
    } else {
      setTitle("");
      setDescription("");
      setItemTypeId(itemTypes[0]?.id || "");
    }
  }, [item, open, itemTypes]);

  const handleSave = async () => {
    if (!title.trim()) { toast.error("El título es requerido"); return; }
    if (!itemTypeId) { toast.error("Selecciona un tipo"); return; }
    setSaving(true);

    const data: any = {
      title: title.trim(),
      description: description.trim() || null,
      item_type_id: itemTypeId,
    };

    let error;
    if (item) {
      ({ error } = await supabase.from("phase_items").update(data).eq("id", item.id));
    } else {
      data.phase_id = phaseId;
      data.position = nextPosition;
      ({ error } = await supabase.from("phase_items").insert(data));
    }

    setSaving(false);
    if (error) { toast.error("Error: " + error.message); return; }
    toast.success(item ? "Item actualizado" : "Item creado");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Editar Item" : "Nuevo Item"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título del item" />
          </div>
          <div>
            <Label>Tipo *</Label>
            <Select value={itemTypeId} onValueChange={setItemTypeId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
              <SelectContent>
                {itemTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
