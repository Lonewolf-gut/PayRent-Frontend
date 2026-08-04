export function isStorageKey(value: string) {
  return value.startsWith("private/") || value.startsWith("public/");
}

export function stripProfileImageVersion(image: string | null | undefined) {
  if (!image) return null;
  return image.replace(/\?v=.*$/, "");
}
