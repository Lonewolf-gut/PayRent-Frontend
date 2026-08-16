export type ApiErrorJson = {
  success?: boolean;
  message?: string;
  errors?: { message?: string; code?: string }[] | null;
  error?: { message?: string; code?: string } | null;
  data?: {
    error?: string | {
      formErrors?: string[];
      fieldErrors?: Record<string, string[]>;
    };
  } | null;
};

export function getApiErrorMessage(
  json: ApiErrorJson,
  fallback = "Something went wrong. Please try again."
) {
  if (json.error?.message) return json.error.message;

  if (typeof json.data?.error === "string" && json.data.error.trim()) {
    return json.data.error;
  }

  const fieldErrors =
    json.data?.error && typeof json.data.error === "object"
      ? json.data.error.fieldErrors
      : undefined;
  if (fieldErrors) {
    const first = Object.values(fieldErrors).flat().find(Boolean);
    if (first) return first;
  }

  const formErrors =
    json.data?.error && typeof json.data.error === "object"
      ? json.data.error.formErrors
      : undefined;
  if (formErrors?.[0]) return formErrors[0];

  if (json.errors?.[0]?.message) return json.errors[0].message;

  if (
    json.message &&
    json.message !== "Request completed successfully." &&
    !json.message.toLowerCase().includes("invalid input")
  ) {
    return json.message;
  }

  return fallback;
}

export async function readApiJson(response: Response) {
  const text = await response.text();
  if (!text.trim()) {
    return {
      success: false,
      message: "The server returned an empty response. Please try again.",
      data: null,
      errors: null,
    };
  }

  try {
    return JSON.parse(text) as ApiErrorJson & { data?: unknown; success?: boolean };
  } catch {
    return {
      success: false,
      message: "We received an unexpected response from the server. Please try again.",
      data: null,
      errors: null,
    };
  }
}

/** Remove sensitive query params from the browser URL (e.g. leaked credentials). */
export function stripSensitiveQueryParams() {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  const sensitive = ["email", "password", "pass", "pwd", "token"];
  let changed = false;

  for (const key of sensitive) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }

  if (changed) {
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, "", next);
  }
}
