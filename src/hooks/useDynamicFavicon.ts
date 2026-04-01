import { useEffect } from "react";
import { useAppSettings } from "./useAppSettings";

function setOrCreateLink(rel: string, href: string, sizes?: string) {
  let link = document.querySelector<HTMLLinkElement>(
    `link[rel="${rel}"]${sizes ? `[sizes="${sizes}"]` : ""}`
  );
  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    if (sizes) link.setAttribute("sizes", sizes);
    document.head.appendChild(link);
  }
  link.href = href;
}

export function useDynamicFavicon() {
  const { settings } = useAppSettings();

  useEffect(() => {
    const logoUrl = settings.logo_url;
    if (!logoUrl) return;

    // Strip cache-busting param for cleaner URL
    const cleanUrl = logoUrl.split("?")[0];

    // Standard favicon
    setOrCreateLink("icon", cleanUrl);

    // Apple touch icon (for iOS home screen bookmarks)
    setOrCreateLink("apple-touch-icon", cleanUrl);

    // Android / PWA icons
    setOrCreateLink("apple-touch-icon", cleanUrl, "180x180");
    setOrCreateLink("icon", cleanUrl, "192x192");
  }, [settings.logo_url]);
}
