import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.RAILWAY_ENVIRONMENT ? { output: "standalone" as const } : {}),
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
