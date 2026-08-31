import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

const nextConfig: NextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  output: "standalone",
  outputFileTracingIncludes: {
    "/**": ["./public/locales/**/*"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "api.iconify.design",
      },
      {
        protocol: "https",
        hostname: "api.simplesvg.com",
      },
      {
        protocol: "https",
        hostname: "api.unisvg.com",
      },
    ],
  },
  // 配置 FFmpeg.wasm 等 ESM 模块
  experimental: {
    esmExternals: true,
  },
  serverExternalPackages: ['@ffmpeg/ffmpeg', '@ffmpeg/util', '@ffmpeg/core'],
  // 提供独立的 FFmpeg 测试页面
  rewrites: () => [
    {
      source: '/ffmpeg-test-standalone',
      destination: '/ffmpeg-test-standalone.html',
    },
    {
      source: '/ffmpeg-export-standalone',
      destination: '/ffmpeg-export-standalone.html',
    },
  ],
  // FFmpeg.wasm 需要 SharedArrayBuffer，配置 COOP/COEP 头
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ]
  },
};

export default withBotId(nextConfig);
