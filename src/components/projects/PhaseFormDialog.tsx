import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  phase: any | null;
  nextPosition: number;
  onSaved: () => void;
}

export default function PhaseFormDialog({ open, onOpenChange, projectId, phase, nextPosition, onSaved }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (phase) {
      setName(phase.name);
      setDescription(phase.description || "");
    } else {
      setName("");
      setDescription("");
    }
  }, [phase, open]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("El nombre es requerido"); return; }
    setSaving(true);

    const data: any = { name: name.trim(), description: description.trim() || null };

    let error;
    if (phase) {
      ({ error } = await supabase.from("project_phases").update(data).eq("id", phase.id));
    } else {
      data.project_id = projectId;
      data.position = nextPosition;
      ({ error } = await supabase.from("project_phases").insert(data));
    }

    setSaving(false);
    if (error) { toast.error("Error: " + error.message); return; }
    toast.success(phase ? "Fase actualizada" : "Fase creada");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{phase ? "Editar Fase" : "Nueva Fase"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nombre *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre de la fase" />
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción de la fase" />
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
