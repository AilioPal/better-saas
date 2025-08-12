import { createMDX } from 'fumadocs-mdx/next';
/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import './src/env';

const withNextIntl = createNextIntlPlugin();

// Only load bundle analyzer when explicitly requested
let withBundleAnalyzer = (config: any) => config;
if (process.env.ANALYZE === 'true') {
  try {
    withBundleAnalyzer = require('@next/bundle-analyzer')({
      enabled: true,
    });
  } catch (e) {
    // Bundle analyzer not available (e.g., in production), use pass-through
    console.log('Bundle analyzer not available, skipping...');
  }
}

const config: NextConfig = {
  devIndicators: false,
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  serverExternalPackages: ['@aws-sdk/client-s3'],
  output: 'standalone',
};

const withMDX = createMDX();
export default withBundleAnalyzer(withNextIntl(withMDX(config)));
