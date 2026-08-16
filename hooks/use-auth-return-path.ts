"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { buildAuthReturnPath } from "@/lib/utils/auth-callback-url";

export function useAuthReturnPath() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useMemo(
    () => buildAuthReturnPath(pathname, searchParams),
    [pathname, searchParams]
  );
}
