/**
 * Windows-friendly production build: repair SWC, ensure split-repo files, skip standalone.
 */
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const projectRoot = path.join(__dirname, "..");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

function run(label, args) {
  console.log(`\n[build:win] ${label}...`);
  const result = spawnSync(npmCmd, args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      NEXT_OUTPUT_STANDALONE: "0",
    },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("Ensuring split-repo files", ["run", "ensure:split-repo"]);
run("Fixing SWC binary", ["run", "fix:swc"]);
run("Building", ["run", "build"]);
