import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  user: any | null;
  onSaved: () => void;
}

export default function ExternalUserFormDialog({ open, onOpenChange, projectId, user, onSaved }: Props) {
  const { t } = useTranslation(["projects", "common"]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (user) {
        setFirstName(user.first_name || "");
        setLastName(user.last_name || "");
        setEmail(user.email || "");
        setPhone(user.phone || "");
        setCompany(user.company || "");
        setNotes(user.notes || "");
        setIsActive(user.is_active ?? true);
      } else {
        setFirstName(""); setLastName(""); setEmail(""); setPhone(""); setCompany(""); setNotes(""); setIsActive(true);
      }
    }
  }, [open, user]);

  const handleSave = async () => {
    if (!firstName.trim()) { toast.error(t("extUserNameRequired")); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) { toast.error(t("extUserEmailInvalid")); return; }

    setSaving(true);
    const payload = {
      project_id: projectId,
      first_name: firstName.trim(),
      last_name: lastName.trim() || null,
      email: email.trim().toLowerCase(),
      phone: phone.trim() || null,
      company: company.trim() || null,
      notes: notes.trim() || null,
      is_active: isActive,
    };

    if (user) {
      const { error } = await supabase.from("external_users").update(payload).eq("id", user.id);
      if (error) {
        if (error.code === "23505") toast.error(t("extUserEmailDuplicate"));
        else toast.error(t("common:error"));
        setSaving(false);
        return;
      }
      toast.success(t("extUserUpdated"));
    } else {
      const { error } = await supabase.from("external_users").insert(payload);
      if (error) {
        if (error.code === "23505") toast.error(t("extUserEmailDuplicate"));
        else toast.error(t("common:error"));
        setSaving(false);
        return;
      }
      toast.success(t("extUserCreated"));
    }

    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? t("extUserEdit") : t("extUserNew")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("extUserFirstName")} *</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <Label>{t("extUserLastName")}</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>{t("extUserEmail")} *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("extUserPhone")}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>{t("extUserCompany")}</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>{t("extUserNotes")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>{t("extUserActive")}</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common:cancel")}</Button>
          <Button onClick={handleSave} disabled={saving}>{t("common:save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
