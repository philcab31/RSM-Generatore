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
  // Next emits `Cache-Control: s-maxage=31536000` on prerendered HTML pages.
  // The Hostinger CDN (hcdn) edge-caches that HTML for up to a year and keeps
  // serving stale HTML after a deploy -> it references old chunk hashes that
  // were removed by the `rsync --delete`, causing 404 on every /_next/static
  // chunk. Force HTML/API documents to be non-cacheable by shared caches while
  // leaving the immutable cache on /_next/static (matched by the negative
  // lookahead) untouched.
  async headers() {
    if (isStaticExport) return [];
    return [
      {
        source: "/((?!_next/).*)",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
