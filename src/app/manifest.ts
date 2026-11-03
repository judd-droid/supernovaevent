import type { MetadataRoute } from "next";

// Add to Home Screen: the app is "FWS" (Financial Wellness Survey) on a device.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Financial Wellness Survey",
    short_name: "FWS",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7f8",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon.png", sizes: "180x180", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png", purpose: "maskable" },
    ],
  };
}
