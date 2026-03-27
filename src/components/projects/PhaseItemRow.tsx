import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Upload, FileText, PenTool, Check } from "lucide-react";
import { toast } from "sonner";
import SignatureDialog from "./SignatureDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  item: any;
  canManage: boolean;
  onUpdated: () => void;
  onEdit: () => void;
}

export default function PhaseItemRow({ item, canManage, onUpdated, onEdit }: Props) {
  const { user } = useAuth();
  const [showDelete, setShowDelete] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const typeCode = item.phase_item_types?.code;

  const toggleCheckbox = async () => {
    const completed = !item.is_completed;
    await supabase.from("phase_items").update({
      is_completed: completed,
      completed_by: completed ? user!.id : null,
      completed_at: completed ? new Date().toISOString() : null,
    }).eq("id", item.id);
    onUpdated();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${item.phase_id}/${item.id}/${file.name}`;
    const { error: upErr } = await supabase.storage.from("project-files").upload(path, file, { upsert: true });
    if (upErr) { toast.error("Error al subir archivo"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("project-files").getPublicUrl(path);
    await supabase.from("phase_items").update({
      file_url: urlData.publicUrl,
      is_completed: true,
      completed_by: user!.id,
      completed_at: new Date().toISOString(),
    }).eq("id", item.id);
    toast.success("Archivo subido");
    setUploading(false);
    onUpdated();
  };

  const handleSignatureSaved = async (signatureData: string) => {
    await supabase.from("phase_items").update({
      signature_data: signatureData,
      signature_confirmed: true,
      signature_confirmed_by: user!.id,
      signature_confirmed_at: new Date().toISOString(),
      is_completed: true,
      completed_by: user!.id,
      completed_at: new Date().toISOString(),
    }).eq("id", item.id);
    toast.success("Firma guardada");
    setShowSignature(false);
    onUpdated();
  };

  const handleDelete = async () => {
    await supabase.from("phase_items").delete().eq("id", item.id);
    toast.success("Item eliminado");
    setShowDelete(false);
    onUpdated();
  };

  return (
    <>
      <div className="flex items-center gap-3 p-2 rounded-md border bg-background">
        {typeCode === "checkbox" && (
          <Checkbox checked={item.is_completed} onCheckedChange={toggleCheckbox} />
        )}
        {typeCode === "file" && (
          item.is_completed ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground" />
          )
        )}
        {typeCode === "signature" && (
          item.is_completed ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <PenTool className="h-4 w-4 text-muted-foreground" />
          )
        )}

        <div className="flex-1 min-w-0">
          <p className={`text-sm ${item.is_completed ? "line-through text-muted-foreground" : ""}`}>{item.title}</p>
          {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
        </div>

        <Badge variant="outline" className="text-xs shrink-0">
          {item.phase_item_types?.name}
        </Badge>

        {typeCode === "file" && !item.is_completed && (
          <>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload className="h-3.5 w-3.5 mr-1" /> {uploading ? "Subiendo..." : "Adjuntar"}
            </Button>
          </>
        )}
        {typeCode === "file" && item.file_url && (
          <Button variant="ghost" size="sm" asChild>
            <a href={item.file_url} target="_blank" rel="noopener noreferrer">
              <FileText className="h-3.5 w-3.5" />
            </a>
          </Button>
        )}

        {typeCode === "signature" && !item.is_completed && (
          <Button variant="outline" size="sm" onClick={() => setShowSignature(true)}>
            <PenTool className="h-3.5 w-3.5 mr-1" /> Firmar
          </Button>
        )}

        {canManage && (
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowDelete(true)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        )}
      </div>

      <SignatureDialog open={showSignature} onOpenChange={setShowSignature} onSave={handleSignatureSaved} />

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar item?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
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
