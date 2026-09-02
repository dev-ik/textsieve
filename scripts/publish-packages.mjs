import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const dryRun = process.argv.includes("--dry-run");
const skipNewUnscoped = process.argv.includes("--skip-new-unscoped");
const packagePaths = [
  "packages/core/package.json",
  "packages/en/package.json",
  "packages/ru/package.json",
  "packages/textsieve/package.json"
];

function run(args, stdio = "inherit") {
  return execFileSync(npm, args, { cwd: workspace, encoding: "utf8", stdio });
}

function isPublished(name, version) {
  try {
    const output = run(["view", `${name}@${version}`, "version", "--json"], "pipe");
    return JSON.parse(output) === version;
  } catch (error) {
    const stderr = String(error?.stderr ?? "");
    if (stderr.includes("E404")) return false;
    throw error;
  }
}

function packageExists(name) {
  try {
    return JSON.parse(run(["view", name, "name", "--json"], "pipe")) === name;
  } catch (error) {
    const stderr = String(error?.stderr ?? "");
    if (stderr.includes("E404")) return false;
    throw error;
  }
}

for (const relativePath of packagePaths) {
  const manifest = JSON.parse(readFileSync(resolve(workspace, relativePath), "utf8"));
  const { name, version } = manifest;

  if (!dryRun && skipNewUnscoped && !name.startsWith("@") && !packageExists(name)) {
    console.log(`${name} has not been bootstrapped; skipping its first publication`);
    continue;
  }

  if (!dryRun && isPublished(name, version)) {
    console.log(`${name}@${version} is already published; skipping`);
    continue;
  }

  const args = ["publish", `--workspace=${name}`, "--access=public"];
  if (dryRun) args.push("--dry-run", "--offline", "--cache", ".cache/npm");
  run(args);
}
