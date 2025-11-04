import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: 'output: export' is disabled to support API routes
  // Deploy to Vercel/Netlify which support serverless functions
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
