import type { NextConfig } from "next";

const lifecycle = process.env.npm_lifecycle_event ?? "";
const isDevServer = lifecycle === "dev" || lifecycle === "dev:turbo";
const isProductionBuild = lifecycle === "build";
const isWindowsDev = process.platform === "win32" && isDevServer;
const useStandaloneOutput = isProductionBuild && process.env.STANDALONE_BUILD === "1";
const turboFsCacheEnabled = process.env.TURBOPACK_FS_CACHE === "1";
const apiOrigin = (process.env.API_URL ?? "http://localhost:3001").replace(/\/$/, "");
const s3PublicUrl =
  process.env.NEXT_PUBLIC_S3_PUBLIC_URL?.trim() || process.env.S3_PUBLIC_URL?.trim();

const nextConfig: NextConfig = {
  ...(useStandaloneOutput ? { output: "standalone" as const } : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(s3PublicUrl
        ? [{ protocol: "https" as const, hostname: new URL(s3PublicUrl).hostname }]
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
      beforeFiles: [
        ...backendAuthRoutes.map((path) => ({
          source: `/api/auth/${path}`,
          destination: `${apiOrigin}/api/auth/${path}`,
        })),
        {
          source: "/uploads/:path*",
          destination: `${apiOrigin}/uploads/:path*`,
        },
      ],
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