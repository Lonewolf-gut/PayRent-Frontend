import { headers } from "next/headers";
import { sanitizeCallbackUrl } from "@/lib/utils/auth-callback-url";

/** Read callbackUrl from the current request path (set by proxy middleware). */
export async function getRequestCallbackUrl(): Promise<string | null> {
  const headerList = await headers();
  const invokePath = headerList.get("x-invoke-path");
  if (!invokePath) return null;

  const queryIndex = invokePath.indexOf("?");
  if (queryIndex === -1) return null;

  const params = new URLSearchParams(invokePath.slice(queryIndex + 1));
  return sanitizeCallbackUrl(params.get("callbackUrl"));
}
