import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, UserPlus, Search, Users, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export default function ProjectUsersDialog({ open, onOpenChange, projectId }: Props) {
  const { t } = useTranslation(["projects", "common"]);
  const [assignedUsers, setAssignedUsers] = useState<any[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [comboOpen, setComboOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [assigning, setAssigning] = useState(false);

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
    if (open) {
      fetchData();
      setSearchFilter("");
    }
  }, [open, projectId]);

  const assignUser = async (userId: string) => {
    setAssigning(true);
    const { error } = await supabase.from("project_users").insert({ project_id: projectId, user_id: userId });
    if (error) {
      if (error.code === "23505") toast.error(t("userAlreadyAssigned"));
      else toast.error(t("assignError"));
      setAssigning(false);
      return;
    }
    toast.success(t("userAssigned"));
    setComboOpen(false);
    setAssigning(false);
    fetchData();
  };

  const removeUser = async (id: string) => {
    await supabase.from("project_users").delete().eq("id", id);
    toast.success(t("userRemoved"));
    fetchData();
  };

  const assignedIds = new Set(assignedUsers.map((u) => u.user_id));
  const availableProfiles = allProfiles.filter((p) => !assignedIds.has(p.user_id));

  const filteredAssigned = useMemo(() => {
    if (!searchFilter) return assignedUsers;
    const q = searchFilter.toLowerCase();
    return assignedUsers.filter(
      (u) =>
        u.profile?.full_name?.toLowerCase().includes(q) ||
        u.profile?.email?.toLowerCase().includes(q)
    );
  }, [assignedUsers, searchFilter]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t("projectUsers")}
            <Badge variant="secondary" className="ml-auto text-xs">
              {assignedUsers.length}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Add user combobox */}
        <div className="flex gap-2">
          <Popover open={comboOpen} onOpenChange={setComboOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={comboOpen}
                className="flex-1 justify-start text-muted-foreground font-normal"
              >
                <UserPlus className="h-4 w-4 mr-2 shrink-0" />
                {t("selectUser")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder={t("searchByName", { ns: "projects" })} />
                <CommandList>
                  <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
                    {t("noResults")}
                  </CommandEmpty>
                  <CommandGroup>
                    {availableProfiles.map((p) => (
                      <CommandItem
                        key={p.user_id}
                        value={`${p.full_name || ""} ${p.email || ""}`}
                        onSelect={() => assignUser(p.user_id)}
                        disabled={assigning}
                        className="flex items-center gap-3 py-2.5 cursor-pointer"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                          {(p.full_name || p.email || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium truncate">
                            {p.full_name || t("common:user")}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {p.email}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Search assigned users */}
        {assignedUsers.length > 3 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchByName", { ns: "projects" })}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        )}

        {/* Assigned users list */}
        <ScrollArea className="flex-1 max-h-[50vh] -mx-1 px-1">
          <div className="space-y-1.5">
            {assignedUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <UserPlus className="h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm">{t("noUsersAssigned")}</p>
              </div>
            ) : filteredAssigned.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t("noResults")}</p>
            ) : (
              filteredAssigned.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 p-2.5 border rounded-lg hover:bg-accent/50 transition-colors group"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold shrink-0">
                    {(u.profile?.full_name || u.profile?.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {u.profile?.full_name || t("common:user")}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{u.profile?.email}</p>
                  </div>
                  <UserCheck className="h-4 w-4 text-green-500 shrink-0 opacity-60" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeUser(u.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
