import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: false, // keep SSE unbuffered
  async redirects() {
    return [{ source: "/", destination: "/fa", permanent: false }];
  },
};

export default nextConfig;
