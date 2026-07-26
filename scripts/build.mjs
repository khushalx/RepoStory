import { spawnSync } from "node:child_process";

const isVercel = process.env.VERCEL === "1";
const command = process.platform === "win32" ? "npm.cmd" : "npm";
const target = isVercel ? "build:next" : "build:sites";

console.log(
  isVercel
    ? "Building the native Next.js output for Vercel…"
    : "Building the Vinext output for Sites…",
);

const result = spawnSync(command, ["run", target], {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
