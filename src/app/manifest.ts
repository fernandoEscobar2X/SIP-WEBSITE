import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.shortName,
    start_url: "/es",
    display: "standalone",
    background_color: "#011631",
    theme_color: "#011631",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/sip-avatar.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
