import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Upload, FileText, PenTool, Check, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import SignatureDialog from "./SignatureDialog";
import { notifyItemCompleted } from "@/lib/notifyItemCompleted";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ItemFile {
  id: string;
  file_url: string;
  file_name: string;
  file_extension: string;
}

interface Props {
  item: any;
  canManage: boolean;
  canComplete?: boolean;
  onUpdated: () => void;
  onEdit: () => void;
  maxFiles?: number;
  allowedExtensions?: string[];
}

export default function PhaseItemRow({ item, canManage, canComplete = false, onUpdated, onEdit, maxFiles = 5, allowedExtensions }: Props) {
  const { user, profile } = useAuth();
  const { t } = useTranslation(["projects", "common"]);
  const [showDelete, setShowDelete] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<ItemFile[]>([]);
  const typeCode = item.phase_item_types?.code;

  const acceptString = allowedExtensions?.length
    ? allowedExtensions.map(e => `.${e}`).join(",")
    : ".pdf,.xlsx,.xls,.doc,.docx,.ppt,.pptx,.zip,.gpx,.kml,.kmz,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.svg";

  const fetchFiles = async () => {
    const { data } = await supabase
      .from("phase_item_files")
      .select("id, file_url, file_name, file_extension")
      .eq("item_id", item.id)
      .order("created_at");
    if (data) setFiles(data);
  };

  useEffect(() => {
    fetchFiles();
  }, [item.id]);

  const hasFiles = files.length > 0;
  const canAddMoreFiles = files.length < maxFiles;

  const toggleCheckbox = async () => {
    if (!canComplete && !canManage) return;
    const completed = !item.is_completed;
    if (completed && item.requires_file && !hasFiles) {
      toast.error(t("fileRequiredToComplete"));
      return;
    }
    const updateData: any = {
      is_completed: completed,
      completed_by: completed ? user!.id : null,
      completed_at: completed ? new Date().toISOString() : null,
    };
    await supabase.from("phase_items").update(updateData).eq("id", item.id);
    if (completed) {
      notifyItemCompleted({
        itemId: item.id,
        itemTitle: item.title,
        phaseId: item.phase_id,
        completedByName: profile?.full_name || user!.email || "—",
      });
    }
    onUpdated();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    setUploading(true);

    const filesToUpload = Array.from(selectedFiles).slice(0, maxFiles - files.length);

    for (const file of filesToUpload) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (allowedExtensions?.length && !allowedExtensions.includes(ext)) {
        toast.error(`${t("fileTypeNotAllowed")}: .${ext}`);
        continue;
      }

      const path = `${item.phase_id}/${item.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("project-files").upload(path, file, { upsert: true });
      if (upErr) { toast.error(t("fileUploadError")); continue; }
      const { data: urlData } = supabase.storage.from("project-files").getPublicUrl(path);

      await supabase.from("phase_item_files").insert({
        item_id: item.id,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_extension: ext,
        file_size: file.size,
        uploaded_by: user!.id,
      });
    }

    // For file-type items, mark as completed
    if (typeCode === "file") {
      await supabase.from("phase_items").update({
        is_completed: true,
        completed_by: user!.id,
        completed_at: new Date().toISOString(),
      }).eq("id", item.id);
      notifyItemCompleted({
        itemId: item.id,
        itemTitle: item.title,
        phaseId: item.phase_id,
        completedByName: profile?.full_name || user!.email || "—",
      });
    }

    toast.success(t("fileUploaded"));
    setUploading(false);
    // Reset file input
    if (fileRef.current) fileRef.current.value = "";
    await fetchFiles();
    onUpdated();
  };

  const handleRemoveFile = async (fileId: string) => {
    await supabase.from("phase_item_files").delete().eq("id", fileId);
    toast.success(t("fileRemoved"));
    await fetchFiles();
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
    toast.success(t("signatureSaved"));
    notifyItemCompleted({
      itemId: item.id,
      itemTitle: item.title,
      phaseId: item.phase_id,
      completedByName: profile?.full_name || user!.email || "—",
    });
    setShowSignature(false);
    onUpdated();
  };

  const handleDelete = async () => {
    await supabase.from("phase_items").delete().eq("id", item.id);
    toast.success(t("itemDeleted"));
    setShowDelete(false);
    onUpdated();
  };

  return (
    <>
      <div className="flex flex-col gap-2 p-2 rounded-md border bg-background">
        {/* Row 1: checkbox/icon + title + manage buttons */}
        <div className="flex items-start gap-2">
          <div className="pt-0.5 shrink-0">
            {typeCode === "checkbox" && (
              <Checkbox checked={item.is_completed} onCheckedChange={toggleCheckbox} disabled={!canComplete && !canManage} />
            )}
            {typeCode === "file" && (
              item.is_completed ? <Check className="h-4 w-4 text-green-500" /> : <FileText className="h-4 w-4 text-muted-foreground" />
            )}
            {typeCode === "signature" && (
              item.is_completed ? <Check className="h-4 w-4 text-green-500" /> : <PenTool className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className={`text-sm ${item.is_completed ? "line-through text-muted-foreground" : ""}`}>{item.title}</p>
            {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
          </div>

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

        {/* Row 2: badges + action buttons */}
        {(item.requires_file || typeCode === "signature" || ((typeCode === "checkbox" && item.requires_file) || (typeCode === "file" && !item.is_completed)) && canAddMoreFiles) && (
          <div className="flex flex-wrap items-center gap-2 ml-6">
            {item.requires_file && (
              <Badge variant="secondary" className="text-xs">
                <Paperclip className="h-3 w-3 mr-1" /> {t("requiresFile")}
              </Badge>
            )}

            {((typeCode === "checkbox" && item.requires_file) || (typeCode === "file" && !item.is_completed)) && canAddMoreFiles && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept={acceptString}
                  className="hidden"
                  onChange={handleFileUpload}
                  multiple={maxFiles > 1}
                />
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Paperclip className="h-3 w-3 mr-1" />
                  {uploading ? t("uploading") : t("attachFile")}
                  {maxFiles > 1 && <span className="ml-1 text-muted-foreground">({files.length}/{maxFiles})</span>}
                </Button>
              </>
            )}

            {typeCode === "signature" && !item.is_completed && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowSignature(true)}>
                <PenTool className="h-3 w-3 mr-1" /> {t("sign")}
              </Button>
            )}
          </div>
        )}

        {/* Row 3: attached files */}
        {hasFiles && (
          <div className="flex flex-col gap-1 ml-6">
            {files.map((f) => (
              <div key={f.id} className="flex items-center gap-1.5 bg-muted/50 rounded px-2 py-1 text-xs">
                <a href={f.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:underline text-foreground min-w-0 flex-1">
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate">{f.file_name}</span>
                  {f.file_extension && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 uppercase shrink-0">{f.file_extension}</Badge>
                  )}
                </a>
                <Button variant="ghost" size="icon" className="h-5 w-5 p-0 shrink-0" onClick={() => handleRemoveFile(f.id)}>
                  <X className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <SignatureDialog open={showSignature} onOpenChange={setShowSignature} onSave={handleSignatureSaved} />

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteItem")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteItemConfirm")}</AlertDialogDescription>
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
