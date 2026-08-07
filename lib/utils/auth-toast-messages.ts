import type { ApiErrorJson } from "@/lib/utils/api-message";
import { getApiErrorMessage } from "@/lib/utils/api-message";

const SIGN_IN_MESSAGES: Record<string, string> = {
  missing_credentials: "Please enter your email address and password.",
  email_not_found:
    "No account found with this email address. Check the spelling or create a new account.",
  invalid_password: "Incorrect password. Please try again or reset your password.",
  account_suspended:
    "This account has been suspended. Contact support if you need help restoring access.",
  account_locked:
    "Your account is temporarily locked after too many failed sign-in attempts. Try again in 30 minutes.",
  two_factor_required:
    "Two-factor authentication is enabled. Enter the 6-digit code from your authenticator app.",
  invalid_two_factor:
    "That authentication code is invalid or expired. Check your app and try again.",
  wrong_role:
    "This email is registered under a different role. Go back and choose the correct sign-in option.",
  database_unavailable:
    "We can't reach the database. Start Docker Desktop, then run: docker compose up -d postgres redis",
};

const REGISTER_MESSAGES: Record<string, string> = {
  EMAIL_ALREADY_REGISTERED:
    "This email is already registered. Sign in instead or use a different email address.",
  RATE_LIMIT: "Too many attempts. Please wait a moment and try again.",
  DATABASE_UNAVAILABLE:
    "We can't reach the database. Start Docker Desktop, then run: docker compose up -d postgres redis",
  SCHEMA_MISMATCH:
    "The database needs to be updated. In your backend folder, run: npm run db:push",
  BACKEND_UNREACHABLE:
    "Cannot reach the backend API. Start PayRent-Backend on port 3001, then try again.",
};

export function getSignInErrorMessage(
  error?: string | null,
  code?: string | null
): string {
  if (code && SIGN_IN_MESSAGES[code]) {
    return SIGN_IN_MESSAGES[code];
  }

  const normalized = (error ?? "").toLowerCase();

  if (normalized.includes("locked")) {
    return SIGN_IN_MESSAGES.account_locked;
  }

  if (normalized.includes("suspend")) {
    return SIGN_IN_MESSAGES.account_suspended;
  }

  if (error && error !== "CredentialsSignin" && error !== "Configuration") {
    return error;
  }

  return "We couldn't sign you in. Check your email and password, then try again.";
}

export function getRegisterErrorMessage(
  json: ApiErrorJson,
  status?: number,
  fallback = "We couldn't create your account. Please check your details and try again."
): string {
  const errorCode = json.errors?.[0]?.code;
  if (errorCode && REGISTER_MESSAGES[errorCode]) {
    return REGISTER_MESSAGES[errorCode];
  }

  const apiMessage = getApiErrorMessage(json, "");

  if (status === 409) {
    return REGISTER_MESSAGES.EMAIL_ALREADY_REGISTERED;
  }

  if (status === 429) {
    return REGISTER_MESSAGES.RATE_LIMIT;
  }

  if (status === 503 && errorCode === "DATABASE_UNAVAILABLE") {
    return REGISTER_MESSAGES.DATABASE_UNAVAILABLE;
  }

  if (status === 503 && errorCode === "SCHEMA_MISMATCH") {
    return REGISTER_MESSAGES.SCHEMA_MISMATCH;
  }

  if (status === 503 && errorCode === "BACKEND_UNREACHABLE") {
    return REGISTER_MESSAGES.BACKEND_UNREACHABLE;
  }

  if (status === 503 && /cannot reach the backend api/i.test(apiMessage)) {
    return REGISTER_MESSAGES.BACKEND_UNREACHABLE;
  }

  if (status === 503 && /database|5432|postgres|docker/i.test(apiMessage)) {
    return REGISTER_MESSAGES.DATABASE_UNAVAILABLE;
  }

  if (
    apiMessage &&
    apiMessage !== "The server returned an empty response. Please try again."
  ) {
    if (/already registered/i.test(apiMessage)) {
      return REGISTER_MESSAGES.EMAIL_ALREADY_REGISTERED;
    }
    return apiMessage;
  }

  return fallback;
}

export function getPostRegisterSignInErrorMessage(
  error?: string | null,
  code?: string | null
): string {
  const message = getSignInErrorMessage(error, code);
  return `Your account was created, but automatic sign-in failed: ${message}`;
}
