import { useEffect } from "react";
import { useAppSettings } from "./useAppSettings";

function setOrCreateLink(rel: string, href: string, extras?: Record<string, string>) {
  const selector = `link[rel="${rel}"]${extras?.sizes ? `[sizes="${extras.sizes}"]` : ""}`;
  let link = document.querySelector<HTMLLinkElement>(selector);
  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    if (extras) {
      Object.entries(extras).forEach(([k, v]) => link!.setAttribute(k, v));
    }
    document.head.appendChild(link);
  }
  link.href = href;
}

export function useDynamicFavicon() {
  const { settings } = useAppSettings();

  useEffect(() => {
    const logoUrl = settings.logo_url;
    if (!logoUrl) return;

    const cleanUrl = logoUrl.split("?")[0];

    // Standard favicon
    setOrCreateLink("icon", cleanUrl, { type: "image/png" });

    // Apple touch icon (iOS home screen)
    setOrCreateLink("apple-touch-icon", cleanUrl);
    setOrCreateLink("apple-touch-icon", cleanUrl, { sizes: "180x180" });

    // Update manifest dynamically for Android bookmarks
    const manifest = {
      name: settings.app_name || "OceanMan Manager",
      short_name: settings.app_name || "OceanMan",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#0c4a6e",
      icons: [
        { src: cleanUrl, sizes: "192x192", type: "image/png" },
        { src: cleanUrl, sizes: "512x512", type: "image/png" },
      ],
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
    const manifestUrl = URL.createObjectURL(blob);
    setOrCreateLink("manifest", manifestUrl);

    return () => URL.revokeObjectURL(manifestUrl);
  }, [settings.logo_url, settings.app_name]);
}
