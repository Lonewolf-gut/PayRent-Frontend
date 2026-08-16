/** Backend origin for split-repo API calls and uploaded public files. */
export function getBackendApiBaseUrl() {
  const url =
    process.env.INTERNAL_API_URL ??
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL;

  return url?.replace(/\/$/, "") ?? "";
}

export function isSplitRepoFrontend() {
  return Boolean(getBackendApiBaseUrl());
}
