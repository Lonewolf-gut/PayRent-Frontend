const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");

const envPath = path.join(__dirname, "..", ".env");
const examplePath = path.join(__dirname, "..", ".env.example");

function generateSecret() {
  return crypto.randomBytes(32).toString("base64");
}

function readEnvValue(envContent, key) {
  const match = envContent.match(new RegExp(`^\\s*${key}=(.+)$`, "m"));
  if (!match) return null;
  return match[1].trim();
}

function upsertEnvValue(content, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^\\s*${key}=.*$`, "m");
  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }
  return `${content.trimEnd()}\n${line}\n`;
}

function findBackendEnvPath() {
  const candidates = [
    path.join(__dirname, "..", "..", "PayRent-Backend", ".env"),
    path.join(__dirname, "..", "..", "payrent-backend", ".env"),
    path.join(__dirname, "..", "PayRent-Backend", ".env"),
    path.join(__dirname, "..", "backend", ".env"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function syncDatabaseUrl(content) {
  const current = readEnvValue(content, "DATABASE_URL");
  if (current && current !== '""' && current !== "''") {
    return { content, synced: false };
  }

  const backendEnvPath = findBackendEnvPath();
  if (!backendEnvPath) {
    return { content, synced: false };
  }

  const backendEnv = fs.readFileSync(backendEnvPath, "utf8");
  const databaseUrl = readEnvValue(backendEnv, "DATABASE_URL");
  if (!databaseUrl || databaseUrl === '""' || databaseUrl === "''") {
    return { content, synced: false };
  }

  return {
    content: upsertEnvValue(content, "DATABASE_URL", databaseUrl),
    synced: true,
    source: backendEnvPath,
  };
}

if (!fs.existsSync(envPath)) {
  if (!fs.existsSync(examplePath)) {
    console.error("Missing .env.example");
    process.exit(1);
  }
  fs.copyFileSync(examplePath, envPath);
  console.log("Created .env from .env.example");
}

let content = fs.readFileSync(envPath, "utf8");
const secret = generateSecret();

if (
  !/^\s*AUTH_SECRET=.+$/m.test(content) ||
  /AUTH_SECRET="replace-with-openssl-rand-base64-32"/.test(content) ||
  /AUTH_SECRET=replace-with-openssl-rand-base64-32/.test(content)
) {
  content = upsertEnvValue(content, "AUTH_SECRET", `"${secret}"`);
  fs.writeFileSync(envPath, content);
  console.log("Generated AUTH_SECRET in .env");
}

const databaseSync = syncDatabaseUrl(content);
if (databaseSync.synced) {
  content = databaseSync.content;
  fs.writeFileSync(envPath, content);
  console.log(`Copied DATABASE_URL from ${databaseSync.source}`);
}

if (!readEnvValue(content, "NEXT_PUBLIC_SHOW_DEV_OTP")) {
  content = upsertEnvValue(content, "NEXT_PUBLIC_SHOW_DEV_OTP", '"true"');
  fs.writeFileSync(envPath, content);
  console.log("Enabled NEXT_PUBLIC_SHOW_DEV_OTP for local phone verification codes.");
}

console.log("");
console.log("Frontend .env is ready.");
console.log("IMPORTANT: Use the SAME AUTH_SECRET in PayRent-Backend/.env");
console.log("Copy the AUTH_SECRET line from this .env into the backend .env file.");
if (!readEnvValue(content, "DATABASE_URL")) {
  console.log("");
  console.log("For local phone OTP toasts, add DATABASE_URL to this .env");
  console.log("(copy the same line from PayRent-Backend/.env), or run setup:env");
  console.log("after placing the backend repo next to this frontend folder.");
}
console.log("");
