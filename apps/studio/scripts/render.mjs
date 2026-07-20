#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const studioDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(studioDir, "..", "..");

const jsonPathArg = process.argv[2];
if (!jsonPathArg) {
  console.error("Usage: pnpm render <path-to-video-input.json>");
  process.exit(1);
}

// pnpm sets INIT_CWD to the directory the user actually ran the command from,
// which is what a user-supplied relative path should resolve against.
const invocationDir = process.env.INIT_CWD ?? process.cwd();
const jsonPath = path.resolve(invocationDir, jsonPathArg);

if (!fs.existsSync(jsonPath)) {
  console.error(`Cannot find JSON file at ${jsonPath}`);
  process.exit(1);
}

const input = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
const slug = (input?.meta?.title ?? "output")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "");
const compositionId = input?.meta?.aspect === "9:16" ? "ComparisonShort9x16" : "Comparison16x9";

const outputDir = path.resolve(repoRoot, "output");
fs.mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `${slug}.mp4`);

console.log(
  `Rendering "${input?.meta?.title ?? jsonPath}" (${compositionId}) -> ${path.relative(repoRoot, outputPath)}`,
);

execFileSync(
  "npx",
  ["remotion", "render", "src/index.ts", compositionId, outputPath, `--props=${jsonPath}`],
  { stdio: "inherit", cwd: studioDir },
);

console.log(`\nDone: ${outputPath}`);
