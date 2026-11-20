import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Masar ERP | نظام مسار لإدارة الموارد",
    short_name: "Masar ERP",
    description: "نظام شامل لإدارة الموارد والمحاسبة والمخزون والمبيعات والمشتريات والرواتب",
    start_url: "/",
    display: "standalone",
    background_color: "#061a24",
    theme_color: "#0F766E",
    orientation: "any",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
