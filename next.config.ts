import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
    agentUpgrade: "security",
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  webpack: (config) => {
    for (const rule of config.module?.rules ?? []) {
      if (rule && typeof rule === "object" && Array.isArray(rule.oneOf)) {
        for (const oneOfRule of rule.oneOf) {
          if (
            oneOfRule &&
            typeof oneOfRule === "object" &&
            Array.isArray(oneOfRule.use) &&
            oneOfRule.use.some(
              (loader: unknown) =>
                typeof loader === "object" &&
                loader !== null &&
                "loader" in loader &&
                typeof (loader as { loader: unknown }).loader === "string" &&
                (loader as { loader: string }).loader.includes("postcss-loader")
            )
          ) {
            oneOfRule.use.push("@tailwindcss/turbopack");
          }
        }
      }
    }
    return config;
  },
};

export default nextConfig;
