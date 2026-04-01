import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AppSettings {
  app_name: string;
  logo_url: string | null;
  email_sender_name: string;
  email_sender_address: string;
  email_reply_to: string | null;
}

const DEFAULTS: AppSettings = {
  app_name: "OceanMan",
  logo_url: null,
  email_sender_name: "OceanMan",
  email_sender_address: "noreply@manager.oceanmanswim.com",
  email_reply_to: null,
};

export function useAppSettings() {
  const queryClient = useQueryClient();

  const { data: settings = DEFAULTS, isLoading } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings" as any)
        .select("key, value");
      if (error) throw error;
      const result = { ...DEFAULTS };
      (data as any[])?.forEach((row: { key: string; value: string | null }) => {
        if (row.key in result) {
          (result as any)[row.key] = row.value;
        }
      });
      return result;
    },
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string | null }) => {
      const { error } = await supabase
        .from("app_settings" as any)
        .update({ value, updated_at: new Date().toISOString() } as any)
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    },
  });

  return { settings, isLoading, updateSetting };
}
