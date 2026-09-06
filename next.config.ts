import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "en.wikipedia.org", pathname: "/wiki/Special:FilePath/**" },
      { protocol: "https", hostname: "upload.wikimedia.org", pathname: "/**" },
    ],
  },
  // Allow accessing the dev server from other devices on the LAN (e.g. mobile testing).
  allowedDevOrigins: ["192.168.0.163"],
};

export default nextConfig;
