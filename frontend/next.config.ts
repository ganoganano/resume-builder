import type { NextConfig } from "next";

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const publicApiUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
const internalApiUrl = (process.env.INTERNAL_API_URL || "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    if (isDemoMode) {
      return [];
    }

    // Prefer the container-internal backend address for server-side proxying.
    const apiBase = internalApiUrl || publicApiUrl || "http://localhost:8000";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiBase}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
