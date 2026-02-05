import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three'],
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ['@react-three/fiber', '@react-three/drei'],
  },
};

export default nextConfig;
