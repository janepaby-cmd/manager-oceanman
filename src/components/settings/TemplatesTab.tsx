import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Plus, Pencil, Trash2, ChevronDown, ChevronRight, GripVertical, ListChecks, Layers, Copy,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface Template {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface Phase {
  id: string;
  template_id: string;
  name: string;
  description: string | null;
  position: number;
}

interface Item {
  id: string;
  phase_id: string;
  title: string;
  description: string | null;
  item_type_code: string;
  position: number;
}

export function TemplatesTab() {
  const { toast } = useToast();
  const { t } = useTranslation("settings");

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  // Template dialog
  const [templateDialog, setTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [templateActive, setTemplateActive] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Phase dialog
  const [phaseDialog, setPhaseDialog] = useState(false);
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [phaseTemplateId, setPhaseTemplateId] = useState("");
  const [phaseName, setPhaseName] = useState("");
  const [phaseDesc, setPhaseDesc] = useState("");
  const [savingPhase, setSavingPhase] = useState(false);

  // Item dialog
  const [itemDialog, setItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [itemPhaseId, setItemPhaseId] = useState("");
  const [itemTitle, setItemTitle] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemTypeCode, setItemTypeCode] = useState("checkbox");
  const [savingItem, setSavingItem] = useState(false);

  // Delete dialogs
  const [deleteTemplate, setDeleteTemplate] = useState<Template | null>(null);
  const [deletePhase, setDeletePhase] = useState<Phase | null>(null);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);

  // Collapsible state
  const [openTemplates, setOpenTemplates] = useState<Set<string>>(new Set());
  const [openPhases, setOpenPhases] = useState<Set<string>>(new Set());

  // Item types from DB
  const [itemTypes, setItemTypes] = useState<{ code: string; name: string }[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [tRes, pRes, iRes, typesRes] = await Promise.all([
      supabase.from("checklist_templates").select("*").order("created_at", { ascending: false }),
      supabase.from("checklist_template_phases").select("*").order("position"),
      supabase.from("checklist_template_items").select("*").order("position"),
      supabase.from("phase_item_types").select("code, name").order("name"),
    ]);
    if (tRes.data) setTemplates(tRes.data);
    if (pRes.data) setPhases(pRes.data);
    if (iRes.data) setItems(iRes.data);
    if (typesRes.data) setItemTypes(typesRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ---- Template CRUD ----
  const openNewTemplate = () => {
    setEditingTemplate(null);
    setTemplateName("");
    setTemplateDesc("");
    setTemplateActive(true);
    setTemplateDialog(true);
  };
  const openEditTemplate = (tpl: Template) => {
    setEditingTemplate(tpl);
    setTemplateName(tpl.name);
    setTemplateDesc(tpl.description || "");
    setTemplateActive(tpl.is_active);
    setTemplateDialog(true);
  };
  const saveTemplate = async () => {
    if (!templateName.trim()) return;
    setSavingTemplate(true);
    if (editingTemplate) {
      const { error } = await supabase.from("checklist_templates").update({
        name: templateName.trim(),
        description: templateDesc.trim() || null,
        is_active: templateActive,
      }).eq("id", editingTemplate.id);
      if (error) { toast({ title: t("templates.saveError"), variant: "destructive" }); }
      else { toast({ title: t("templates.templateUpdated") }); }
    } else {
      const { error } = await supabase.from("checklist_templates").insert({
        name: templateName.trim(),
        description: templateDesc.trim() || null,
        is_active: templateActive,
      });
      if (error) { toast({ title: t("templates.saveError"), variant: "destructive" }); }
      else { toast({ title: t("templates.templateCreated") }); }
    }
    setSavingTemplate(false);
    setTemplateDialog(false);
    fetchAll();
  };
  const confirmDeleteTemplate = async () => {
    if (!deleteTemplate) return;
    const { error } = await supabase.from("checklist_templates").delete().eq("id", deleteTemplate.id);
    if (error) { toast({ title: t("templates.deleteError"), variant: "destructive" }); }
    else { toast({ title: t("templates.templateDeleted") }); }
    setDeleteTemplate(null);
    fetchAll();
  };

  // ---- Phase CRUD ----
  const openNewPhase = (templateId: string) => {
    setEditingPhase(null);
    setPhaseTemplateId(templateId);
    setPhaseName("");
    setPhaseDesc("");
    setPhaseDialog(true);
  };
  const openEditPhase = (phase: Phase) => {
    setEditingPhase(phase);
    setPhaseTemplateId(phase.template_id);
    setPhaseName(phase.name);
    setPhaseDesc(phase.description || "");
    setPhaseDialog(true);
  };
  const savePhase = async () => {
    if (!phaseName.trim()) return;
    setSavingPhase(true);
    if (editingPhase) {
      await supabase.from("checklist_template_phases").update({
        name: phaseName.trim(),
        description: phaseDesc.trim() || null,
      }).eq("id", editingPhase.id);
      toast({ title: t("templates.phaseUpdated") });
    } else {
      const maxPos = phases.filter(p => p.template_id === phaseTemplateId).length;
      await supabase.from("checklist_template_phases").insert({
        template_id: phaseTemplateId,
        name: phaseName.trim(),
        description: phaseDesc.trim() || null,
        position: maxPos,
      });
      toast({ title: t("templates.phaseCreated") });
    }
    setSavingPhase(false);
    setPhaseDialog(false);
    fetchAll();
  };
  const confirmDeletePhase = async () => {
    if (!deletePhase) return;
    // Delete items first
    await supabase.from("checklist_template_items").delete().eq("phase_id", deletePhase.id);
    await supabase.from("checklist_template_phases").delete().eq("id", deletePhase.id);
    toast({ title: t("templates.phaseDeleted") });
    setDeletePhase(null);
    fetchAll();
  };

  // ---- Item CRUD ----
  const openNewItem = (phaseId: string) => {
    setEditingItem(null);
    setItemPhaseId(phaseId);
    setItemTitle("");
    setItemDesc("");
    setItemTypeCode("checkbox");
    setItemDialog(true);
  };
  const openEditItem = (item: Item) => {
    setEditingItem(item);
    setItemPhaseId(item.phase_id);
    setItemTitle(item.title);
    setItemDesc(item.description || "");
    setItemTypeCode(item.item_type_code);
    setItemDialog(true);
  };
  const saveItem = async () => {
    if (!itemTitle.trim()) return;
    setSavingItem(true);
    if (editingItem) {
      await supabase.from("checklist_template_items").update({
        title: itemTitle.trim(),
        description: itemDesc.trim() || null,
        item_type_code: itemTypeCode,
      }).eq("id", editingItem.id);
      toast({ title: t("templates.itemUpdated") });
    } else {
      const maxPos = items.filter(i => i.phase_id === itemPhaseId).length;
      await supabase.from("checklist_template_items").insert({
        phase_id: itemPhaseId,
        title: itemTitle.trim(),
        description: itemDesc.trim() || null,
        item_type_code: itemTypeCode,
        position: maxPos,
      });
      toast({ title: t("templates.itemCreated") });
    }
    setSavingItem(false);
    setItemDialog(false);
    fetchAll();
  };
  const confirmDeleteItem = async () => {
    if (!deleteItem) return;
    await supabase.from("checklist_template_items").delete().eq("id", deleteItem.id);
    toast({ title: t("templates.itemDeleted") });
    setDeleteItem(null);
    fetchAll();
  };

  const cloneTemplate = async (tpl: Template) => {
    const tplPhases = phases.filter(p => p.template_id === tpl.id);
    const clonedName = `${tpl.name} (${t("templates.clonedSuffix")})`;
    const { data: newTpl, error } = await supabase.from("checklist_templates").insert({
      name: clonedName,
      description: tpl.description,
      is_active: tpl.is_active,
    }).select().single();
    if (error || !newTpl) {
      toast({ title: t("templates.cloneError"), variant: "destructive" });
      return;
    }
    for (const phase of tplPhases) {
      const { data: newPhase } = await supabase.from("checklist_template_phases").insert({
        template_id: newTpl.id,
        name: phase.name,
        description: phase.description,
        position: phase.position,
      }).select().single();
      if (!newPhase) continue;
      const phaseItems = items.filter(i => i.phase_id === phase.id);
      if (phaseItems.length > 0) {
        await supabase.from("checklist_template_items").insert(
          phaseItems.map(i => ({
            phase_id: newPhase.id,
            title: i.title,
            description: i.description,
            item_type_code: i.item_type_code,
            position: i.position,
          }))
        );
      }
    }
    toast({ title: t("templates.templateCloned") });
    fetchAll();
  };

  const toggleTemplate = (id: string) => {
    setOpenTemplates(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const togglePhase = (id: string) => {
    setOpenPhases(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("templates.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("templates.desc")}</p>
        </div>
        <Button onClick={openNewTemplate} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          {t("templates.newTemplate")}
        </Button>
      </div>

      {templates.length === 0 && (
        <p className="text-muted-foreground text-center py-8">{t("templates.noTemplates")}</p>
      )}

      <div className="space-y-3">
        {templates.map(tpl => {
          const tplPhases = phases.filter(p => p.template_id === tpl.id);
          const tplItems = items.filter(i => tplPhases.some(p => p.id === i.phase_id));
          const isOpen = openTemplates.has(tpl.id);

          return (
            <Card key={tpl.id}>
              <Collapsible open={isOpen} onOpenChange={() => toggleTemplate(tpl.id)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3 px-3 sm:px-6">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                        <Layers className="h-4 w-4 text-primary shrink-0" />
                        <CardTitle className="text-sm sm:text-base truncate">{tpl.name}</CardTitle>
                        <Badge variant={tpl.is_active ? "default" : "secondary"} className="shrink-0 text-[10px]">
                          {tpl.is_active ? t("templates.active") : t("templates.inactive")}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between ml-6" onClick={e => e.stopPropagation()}>
                        <span className="text-[11px] text-muted-foreground">
                          {tplPhases.length} {t("templates.phasesCount")} · {tplItems.length} {t("templates.itemsCount")}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => cloneTemplate(tpl)} title={t("templates.cloneTemplate")}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTemplate(tpl)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTemplate(tpl)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    {tpl.description && <CardDescription className="ml-6 text-xs">{tpl.description}</CardDescription>}
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-2">
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => openNewPhase(tpl.id)}>
                        <Plus className="h-3 w-3 mr-1" />
                        {t("templates.newPhase")}
                      </Button>
                    </div>

                    {tplPhases.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">{t("templates.noPhases")}</p>
                    )}

                    {tplPhases.map(phase => {
                      const phaseItems = items.filter(i => i.phase_id === phase.id);
                      const phaseOpen = openPhases.has(phase.id);

                      return (
                        <Collapsible key={phase.id} open={phaseOpen} onOpenChange={() => togglePhase(phase.id)}>
                          <div className="border rounded-md">
                            <CollapsibleTrigger asChild>
                              <div className="flex flex-col gap-1 p-2 sm:p-3 cursor-pointer hover:bg-muted/30 transition-colors">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {phaseOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span className="font-medium text-sm truncate">{phase.position + 1}. {phase.name}</span>
                                  <span className="text-[11px] text-muted-foreground shrink-0">({phaseItems.length})</span>
                                </div>
                                <div className="flex justify-end gap-0.5" onClick={e => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditPhase(phase)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeletePhase(phase)}>
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="border-t px-3 pb-3 space-y-1">
                                {phaseItems.map(item => (
                                  <div key={item.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/20 transition-colors gap-1">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      <ListChecks className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                      <span className="text-sm truncate">{item.title}</span>
                                      <Badge variant="outline" className="text-[10px] shrink-0">{item.item_type_code}</Badge>
                                    </div>
                                    <div className="flex items-center gap-0.5 shrink-0">
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditItem(item)}>
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteItem(item)}>
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                                <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => openNewItem(phase.id)}>
                                  <Plus className="h-3 w-3 mr-1" />
                                  {t("templates.newItem")}
                                </Button>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {/* Template Dialog */}
      <Dialog open={templateDialog} onOpenChange={setTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTemplate ? t("templates.editTemplate") : t("templates.newTemplate")}</DialogTitle>
            <DialogDescription>{t("templates.templateDialogDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("templates.templateName")}</Label>
              <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder={t("templates.templateNamePlaceholder")} />
            </div>
            <div>
              <Label>{t("templates.templateDescription")}</Label>
              <Textarea value={templateDesc} onChange={e => setTemplateDesc(e.target.value)} placeholder={t("templates.templateDescPlaceholder")} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={templateActive} onCheckedChange={setTemplateActive} />
              <Label>{t("templates.active")}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveTemplate} disabled={savingTemplate || !templateName.trim()}>
              {savingTemplate && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {t("templates.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phase Dialog */}
      <Dialog open={phaseDialog} onOpenChange={setPhaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPhase ? t("templates.editPhase") : t("templates.newPhase")}</DialogTitle>
            <DialogDescription>{t("templates.phaseDialogDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("templates.phaseName")}</Label>
              <Input value={phaseName} onChange={e => setPhaseName(e.target.value)} placeholder={t("templates.phaseNamePlaceholder")} />
            </div>
            <div>
              <Label>{t("templates.phaseDescription")}</Label>
              <Textarea value={phaseDesc} onChange={e => setPhaseDesc(e.target.value)} placeholder={t("templates.phaseDescPlaceholder")} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={savePhase} disabled={savingPhase || !phaseName.trim()}>
              {savingPhase && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {t("templates.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? t("templates.editItem") : t("templates.newItem")}</DialogTitle>
            <DialogDescription>{t("templates.itemDialogDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("templates.itemTitle")}</Label>
              <Input value={itemTitle} onChange={e => setItemTitle(e.target.value)} placeholder={t("templates.itemTitlePlaceholder")} />
            </div>
            <div>
              <Label>{t("templates.itemDescription")}</Label>
              <Textarea value={itemDesc} onChange={e => setItemDesc(e.target.value)} placeholder={t("templates.itemDescPlaceholder")} />
            </div>
            <div>
              <Label>{t("templates.itemType")}</Label>
              <Select value={itemTypeCode} onValueChange={setItemTypeCode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {itemTypes.map(it => (
                    <SelectItem key={it.code} value={it.code}>{it.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveItem} disabled={savingItem || !itemTitle.trim()}>
              {savingItem && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {t("templates.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialogs */}
      <AlertDialog open={!!deleteTemplate} onOpenChange={() => setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("templates.deleteTemplate")}</AlertDialogTitle>
            <AlertDialogDescription>{t("templates.deleteTemplateDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("templates.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTemplate}>{t("templates.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletePhase} onOpenChange={() => setDeletePhase(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("templates.deletePhase")}</AlertDialogTitle>
            <AlertDialogDescription>{t("templates.deletePhaseDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("templates.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePhase}>{t("templates.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("templates.deleteItem")}</AlertDialogTitle>
            <AlertDialogDescription>{t("templates.deleteItemDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("templates.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteItem}>{t("templates.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
