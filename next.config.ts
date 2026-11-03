import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Last year's Medicard Lifestyle Center version, kept as it was.
  async rewrites() {
    return [{ source: "/medicard", destination: "/medicard/index.html" }];
  },
};

export default nextConfig;
