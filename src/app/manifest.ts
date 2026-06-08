import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// This is the installable *staff app* manifest. We only register the service
// worker on /admin (see (admin)/layout.tsx), so only staff are ever prompted
// to install — hence start_url points straight at the admin dashboard.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} Staff`,
    short_name: SITE.name,
    description: `${SITE.name} staff app — create & manage orders, products and returns.`,
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: SITE.themeColor,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["business", "productivity"],
    lang: "en-NG",
    orientation: "portrait-primary",
  };
}
