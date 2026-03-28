import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phaseId: string;
  item: any | null;
  nextPosition: number;
  onSaved: () => void;
}

export default function ItemFormDialog({ open, onOpenChange, phaseId, item, nextPosition, onSaved }: Props) {
  const { t } = useTranslation(["projects", "common"]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [itemTypeId, setItemTypeId] = useState("");
  const [requiresFile, setRequiresFile] = useState(false);
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
      setRequiresFile(item.requires_file || false);
    } else {
      setTitle("");
      setDescription("");
      setItemTypeId(itemTypes[0]?.id || "");
      setRequiresFile(false);
    }
  }, [item, open, itemTypes]);

  const handleSave = async () => {
    if (!title.trim()) { toast.error(t("titleRequired")); return; }
    if (!itemTypeId) { toast.error(t("selectTypeRequired")); return; }
    setSaving(true);

    const data: any = {
      title: title.trim(),
      description: description.trim() || null,
      item_type_id: itemTypeId,
      requires_file: requiresFile,
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
    if (error) { toast.error(t("common:error") + ": " + error.message); return; }
    toast.success(item ? t("itemUpdated") : t("itemCreated"));
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? t("editItem") : t("newItem")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t("itemTitle")} *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("itemTitle")} />
          </div>
          <div>
            <Label>{t("itemType")} *</Label>
            <Select value={itemTypeId} onValueChange={setItemTypeId}>
              <SelectTrigger><SelectValue placeholder={t("selectType")} /></SelectTrigger>
              <SelectContent>
                {itemTypes.map((t_) => (
                  <SelectItem key={t_.id} value={t_.id}>{t_.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("common:description")}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("common:description")} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="requires-file" checked={requiresFile} onCheckedChange={(c) => setRequiresFile(!!c)} />
            <div>
              <label htmlFor="requires-file" className="text-sm font-medium cursor-pointer">{t("requiresFile")}</label>
              <p className="text-xs text-muted-foreground">{t("requiresFileHint")}</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common:cancel")}</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? t("common:saving") : t("common:save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
