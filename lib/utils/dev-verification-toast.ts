import { toast } from "sonner";

let lastToastedCodes: Record<"email" | "phone", string | null> = {
  email: null,
  phone: null,
};

function isDevEnvironment(apiSaysDev?: boolean) {
  if (apiSaysDev) return true;
  if (process.env.NEXT_PUBLIC_SHOW_DEV_OTP === "true") return true;
  if (process.env.NODE_ENV === "development") return true;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return true;
  }
  return false;
}

type DevVerificationToastOptions = {
  force?: boolean;
  isDevelopment?: boolean;
};

export function isDevOtpEnvironment(apiSaysDev?: boolean) {
  return isDevEnvironment(apiSaysDev);
}

/**
 * Local testing helper — shows OTP in a toast when email/SMS is not delivered.
 * Disabled in production builds. Remove this file when no longer needed.
 */
export function showDevVerificationCodeToast(
  code: string | null | undefined,
  channel: "email" | "phone",
  options?: DevVerificationToastOptions
) {
  if (!isDevEnvironment(options?.isDevelopment)) return;
  if (!code || code.length < 4) return;
  if (!options?.force && code === lastToastedCodes[channel]) return;

  lastToastedCodes[channel] = code;

  const label = channel === "email" ? "Email verification code" : "Phone verification code";

  toast.info(`${label}: ${code}`, {
    description: "Local testing only — use this code to verify.",
    duration: 60_000,
  });
}

export function resetDevVerificationToast(channel: "email" | "phone") {
  lastToastedCodes[channel] = null;
}
