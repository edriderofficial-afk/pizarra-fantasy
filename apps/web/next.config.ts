import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Internal workspace packages ship TypeScript source.
  transpilePackages: ['@pizarra/core', '@pizarra/data', '@pizarra/ui'],
  reactStrictMode: true,
};

export default nextConfig;
