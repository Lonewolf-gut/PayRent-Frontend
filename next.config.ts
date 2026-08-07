import type { NextConfig } from "next";
const lifecycle = process.env.npm_lifecycle_event ?? "";
const isDevServer = lifecycle === "dev" || lifecycle === "dev:turbo";
const isProductionBuild = lifecycle === "build";
const isWindowsDev = process.platform === "win32" && isDevServer;
const useStandaloneOutput = isProductionBuild && process.env.STANDALONE_BUILD === "1";
const turboFsCacheEnabled = process.env.TURBOPACK_FS_CACHE === "1";
const apiOrigin = (process.env.API_URL ?? "http://localhost:3001").replace(/\/$/, "");
const nextConfig: NextConfig = {
  distDir: isDevServer ? ".next-dev" : ".next",
  ...(useStandaloneOutput ? { output: "standalone" as const } : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(process.env.S3_PUBLIC_URL
        ? [{ protocol: "https" as const, hostname: new URL(process.env.S3_PUBLIC_URL).hostname }]
        : []),
    ],
  },
  async rewrites() {
    const backendAuthRoutes = [
      "2fa",
      "2fa/request",
      "forgot-password",
      "login",
      "login-attempt",
      "refresh",
      "resend-verification",
      "reset-password",
    ];

    return {
      beforeFiles: backendAuthRoutes.map((path) => ({
        source: `/api/auth/${path}`,
        destination: `${apiOrigin}/api/auth/${path}`,
      })),
      fallback: [
  {
    source: "/api/:path*",
    destination: `${apiOrigin}/api/:path*`,
  },
],
    };
  },
  async redirects() {
    return [
      { source: "/dashboard/tenant/:path*", destination: "/dashboard/buyer/:path*", permanent: true },
      { source: "/dashboard/landlord/:path*", destination: "/dashboard/merchant/:path*", permanent: true },
      { source: "/dashboard/agent/:path*", destination: "/dashboard/marketer/:path*", permanent: true },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "date-fns",
      "recharts",
      "@radix-ui/react-tooltip",
    ],
    ...(isWindowsDev && !turboFsCacheEnabled
      ? { turbopackFileSystemCacheForDev: false }
      : {}),
  },
};

export default nextConfig;
