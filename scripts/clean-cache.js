const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const targets = [
  ".next",
  ".next-dev",
  path.join("node_modules", ".cache"),
  path.join("node_modules", "@base-ui"),
];

for (const target of targets) {
  const fullPath = path.join(root, target);
  if (!fs.existsSync(fullPath)) continue;
  fs.rmSync(fullPath, { recursive: true, force: true });
  console.log(`Removed ${target}`);
}

console.log("Cache cleared. Run: npm install --legacy-peer-deps && npm run dev");
