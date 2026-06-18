import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BUCKET = "project-files";
const PUBLIC_MARKER = "/project-files/";

/**
 * Resolves a stored value (either a legacy full public URL or a plain storage path)
 * into the storage object path used by the private bucket.
 */
export function extractProjectFilePath(value: string): string {
  if (!value) return value;
  const idx = value.indexOf(PUBLIC_MARKER);
  if (idx === -1) return value; // already a storage path
  return decodeURIComponent(value.substring(idx + PUBLIC_MARKER.length));
}

/** Creates a short-lived signed URL for a project file. */
export async function getProjectFileSignedUrl(value: string, expiresIn = 3600): Promise<string | null> {
  const path = extractProjectFilePath(value);
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Opens a project file in a new tab using a freshly generated signed URL. */
export async function openProjectFile(value: string): Promise<void> {
  const url = await getProjectFileSignedUrl(value);
  if (url) {
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    toast.error("No se pudo abrir el archivo");
  }
}
