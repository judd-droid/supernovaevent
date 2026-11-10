import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Browser protections for every page: no framing by other sites (clickjacking), no
  // content-type guessing, only the site's origin sent onward, and no camera or mic.
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
  // Last year's Medicard Lifestyle Center version, kept as it was.
  // Standard browser protections: no framing by other sites (clickjacking), no MIME
  // sniffing, and links to other sites don't carry the full address (personal QR
  // links include the advisor's name and signature).
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
  async rewrites() {
    return [{ source: "/medicard", destination: "/medicard/index.html" }];
  },
};

export default nextConfig;
