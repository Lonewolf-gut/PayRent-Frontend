const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");

const envPath = path.join(__dirname, "..", ".env");
const examplePath = path.join(__dirname, "..", ".env.example");

function generateSecret() {
  return crypto.randomBytes(32).toString("base64");
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
  if (/AUTH_SECRET=/.test(content)) {
    content = content.replace(
      /AUTH_SECRET=.*/,
      `AUTH_SECRET="${secret}"`
    );
  } else {
    content += `\nAUTH_SECRET="${secret}"\n`;
  }
  fs.writeFileSync(envPath, content);
  console.log("Generated AUTH_SECRET in .env");
}

console.log("");
console.log("Frontend .env is ready.");
console.log("IMPORTANT: Use the SAME AUTH_SECRET in PayRent-Backend/.env");
console.log("Copy the AUTH_SECRET line from this .env into the backend .env file.");
console.log("");
