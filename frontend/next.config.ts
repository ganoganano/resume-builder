import type { NextConfig } from "next";

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    if (isDemoMode) {
      return [];
    }

    const apiBase = apiUrl || "http://localhost:8000";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiBase}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
