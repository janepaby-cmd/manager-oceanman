import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export default function ProjectUsersDialog({ open, onOpenChange, projectId }: Props) {
  const [assignedUsers, setAssignedUsers] = useState<any[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  const fetchData = async () => {
    const [assignRes, profilesRes] = await Promise.all([
      supabase.from("project_users").select("*").eq("project_id", projectId),
      supabase.from("profiles").select("user_id, full_name, email"),
    ]);

    if (assignRes.data && profilesRes.data) {
      const profileMap = new Map(profilesRes.data.map((p: any) => [p.user_id, p]));
      setAssignedUsers(
        assignRes.data.map((a: any) => ({
          ...a,
          profile: profileMap.get(a.user_id),
        }))
      );
      setAllProfiles(profilesRes.data);
    }
  };

  useEffect(() => {
    if (open) fetchData();
  }, [open, projectId]);

  const assignUser = async () => {
    if (!selectedUserId) return;
    const { error } = await supabase.from("project_users").insert({ project_id: projectId, user_id: selectedUserId });
    if (error) {
      if (error.code === "23505") toast.error("Usuario ya asignado");
      else toast.error("Error al asignar");
      return;
    }
    toast.success("Usuario asignado");
    setSelectedUserId("");
    fetchData();
  };

  const removeUser = async (id: string) => {
    await supabase.from("project_users").delete().eq("id", id);
    toast.success("Usuario removido");
    fetchData();
  };

  const assignedIds = new Set(assignedUsers.map((u) => u.user_id));
  const availableProfiles = allProfiles.filter((p) => !assignedIds.has(p.user_id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Usuarios del Proyecto</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Seleccionar usuario" />
            </SelectTrigger>
            <SelectContent>
              {availableProfiles.map((p) => (
                <SelectItem key={p.user_id} value={p.user_id}>
                  {p.full_name || p.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={assignUser} disabled={!selectedUserId}>
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {assignedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No hay usuarios asignados</p>
          ) : (
            assignedUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-2 border rounded-md">
                <div>
                  <p className="text-sm font-medium">{u.profile?.full_name || "Sin nombre"}</p>
                  <p className="text-xs text-muted-foreground">{u.profile?.email}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeUser(u.id)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
