import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_OUTPUT === "export";

const nextConfig: NextConfig = {
  output: isStaticExport ? "export" : "standalone",
  images: {
    unoptimized: true,
  },
  trailingSlash: isStaticExport,
};

export default nextConfig;
