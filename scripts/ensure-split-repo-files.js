/**
 * Ensures split-repo frontend files exist (PayRent-Frontend checkout gaps).
 * Safe to run on every build/dev — no-op when files are already present.
 */
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.join(__dirname, "..");

const requiredFiles = {
  "lib/utils/backend-api-url.ts": `/** Backend origin for split-repo API calls and uploaded public files. */
export function getBackendApiBaseUrl() {
  const url =
    process.env.INTERNAL_API_URL ??
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL;

  return url?.replace(/\\/$/, "") ?? "";
}

export function isSplitRepoFrontend() {
  return Boolean(getBackendApiBaseUrl());
}
`,
};

let created = 0;

for (const [relativePath, contents] of Object.entries(requiredFiles)) {
  const absolutePath = path.join(projectRoot, relativePath);
  if (fs.existsSync(absolutePath)) continue;

  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents, "utf8");
  console.log(`[split-repo] Created missing file: ${relativePath}`);
  created += 1;
}

if (created === 0) {
  console.log("[split-repo] Required frontend files are present.");
}
