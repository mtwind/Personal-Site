import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Image uploads: 5MB file cap + multipart overhead headroom.
      bodySizeLimit: "6mb",
    },
  },
  images: {
    remotePatterns: [
      // Supabase Storage public objects (about photo, media, custom icons)
      {
        protocol: "https",
        hostname: "nuzgxizfjbyppjmhzzaa.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
