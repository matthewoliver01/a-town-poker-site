import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep optional tournament Markdown available in Amplify's server bundle too.
  outputFileTracingIncludes: {
    "/tournaments/*": ["./content/tournaments/*.md"],
  },
};

export default nextConfig;
