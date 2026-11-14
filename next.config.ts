import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "play-lh.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "img.magnific.com",
        pathname: "/free-vector/**",
      },
    ],
  },
};

export default nextConfig;
