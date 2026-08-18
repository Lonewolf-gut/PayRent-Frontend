/**
 * Reinstall @next/swc-win32-x64-msvc to match the installed next version.
 * Fixes "not a valid Win32 application" without a full node_modules reinstall.
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.join(__dirname, "..");

if (process.platform !== "win32") {
  console.log("[fix-swc] Skipped (Windows only).");
  process.exit(0);
}

const nextPkgPath = path.join(projectRoot, "node_modules", "next", "package.json");
if (!fs.existsSync(nextPkgPath)) {
  console.error("[fix-swc] Run npm install first — next is not installed.");
  process.exit(1);
}

const nextVersion = JSON.parse(fs.readFileSync(nextPkgPath, "utf8")).version;
const swcPackage = `@next/swc-win32-x64-msvc@${nextVersion}`;
const swcDir = path.join(projectRoot, "node_modules", "@next", "swc-win32-x64-msvc");

console.log(`[fix-swc] Installing ${swcPackage} to match next@${nextVersion}...`);

if (fs.existsSync(swcDir)) {
  fs.rmSync(swcDir, { recursive: true, force: true });
}

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npmCmd, ["install", swcPackage, "--no-save"], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: false,
});

if (result.status !== 0) {
  console.error("[fix-swc] SWC reinstall failed. Try: npm run dev:fix");
  process.exit(result.status ?? 1);
}

console.log("[fix-swc] Done.");
process.exit(0);
