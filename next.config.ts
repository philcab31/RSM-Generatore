import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_OUTPUT === "export";

const nextConfig: NextConfig = {
  output: isStaticExport ? "export" : "standalone",
  images: {
    unoptimized: true,
  },
  trailingSlash: isStaticExport,
  // Next.js file-tracing misses some transitive dependencies of jsdom (used at
  // runtime by /api/ai/scrape via @mozilla/readability). On the Hostinger
  // standalone deploy these packages are absent from node_modules, so jsdom
  // throws MODULE_NOT_FOUND -> 500. Force them (and their full subtrees) in.
  outputFileTracingIncludes: {
    "/api/ai/scrape": [
      "./node_modules/whatwg-mimetype/**/*",
      "./node_modules/tldts-core/**/*",
      "./node_modules/entities/**/*",
      "./node_modules/require-from-string/**/*",
    ],
  },
};

export default nextConfig;
