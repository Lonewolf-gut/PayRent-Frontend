import type { NextConfig } from "next";
import { getBackendApiBaseUrl } from "./lib/utils/backend-api-url";

const lifecycle = process.env.npm_lifecycle_event ?? "";
const isDevLifecycle =
  lifecycle === "dev" || lifecycle === "dev:turbo" || lifecycle === "dev:webpack";
const isProductionBuild = lifecycle === "build";
const isWindowsDev = process.platform === "win32" && isDevLifecycle;
const turboFsCacheEnabled = process.env.TURBOPACK_FS_CACHE === "1";

function uploadRemotePatterns() {
  const backendUrl = getBackendApiBaseUrl();
  if (!backendUrl) return [];

  try {
    const parsed = new URL(backendUrl);
    const protocol = parsed.protocol.replace(":", "") as "http" | "https";
    return [
      {
        protocol,
        hostname: parsed.hostname,
        ...(parsed.port ? { port: parsed.port } : {}),
        pathname: "/uploads/**",
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  distDir: isDevLifecycle ? ".next-dev" : ".next",
  ...(isProductionBuild ? { output: "standalone" as const } : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(process.env.S3_PUBLIC_URL
        ? [{ protocol: "https" as const, hostname: new URL(process.env.S3_PUBLIC_URL).hostname }]
        : []),
      ...uploadRemotePatterns(),
    ],
  },
  async rewrites() {
    const backendUrl = getBackendApiBaseUrl();
    if (!backendUrl) return [];

    // Property/profile uploads are stored on PayRent-Backend (public/uploads).
    return {
      beforeFiles: [
        {
          source: "/uploads/:path*",
          destination: `${backendUrl}/uploads/:path*`,
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
    // Next 16 enables Turbopack FS cache by default. On Windows it can mmap 200MB+ SST
    // files and crash with "paging file is too small" (os error 1455). Opt in with
    // TURBOPACK_FS_CACHE=1 if you have a large page file and want faster warm starts.
    ...(isWindowsDev && !turboFsCacheEnabled
      ? { turbopackFileSystemCacheForDev: false }
      : {}),
  },
};

export default nextConfig;
