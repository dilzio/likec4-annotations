#!/usr/bin/env node
// Verifies the lockstep version is identical across the three files that
// each carry their own literal version string (see design.md - "Where sync
// is enforced"): packages/cli/package.json, the plugin's own manifest, and
// its entry in the root marketplace manifest.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function readJson(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  return JSON.parse(readFileSync(absolutePath, "utf8"));
}

const cliPackage = readJson("packages/cli/package.json");
const pluginManifest = readJson(
  "packages/claude-plugin/.claude-plugin/plugin.json",
);
const marketplace = readJson(".claude-plugin/marketplace.json");
const marketplacePlugin = marketplace.plugins.find(
  (plugin) => plugin.name === pluginManifest.name,
);

if (!marketplacePlugin) {
  console.error(
    `check-version-sync: no marketplace.json plugin entry named "${pluginManifest.name}"`,
  );
  process.exit(1);
}

const requiredFieldErrors = [];
for (const field of ["name", "version", "description"]) {
  if (!pluginManifest[field]) {
    requiredFieldErrors.push(
      `packages/claude-plugin/.claude-plugin/plugin.json is missing required field "${field}"`,
    );
  }
}
for (const field of ["name", "version", "description", "source"]) {
  if (!marketplacePlugin[field]) {
    requiredFieldErrors.push(
      `.claude-plugin/marketplace.json plugin entry is missing required field "${field}"`,
    );
  }
}

if (requiredFieldErrors.length > 0) {
  console.error("check-version-sync: manifest validation failed:");
  for (const error of requiredFieldErrors) {
    console.error(`  ${error}`);
  }
  process.exit(1);
}

const versions = {
  "packages/cli/package.json": cliPackage.version,
  "packages/claude-plugin/.claude-plugin/plugin.json": pluginManifest.version,
  ".claude-plugin/marketplace.json (plugins[].version)":
    marketplacePlugin.version,
};

const distinctVersions = new Set(Object.values(versions));

if (distinctVersions.size > 1) {
  console.error("check-version-sync: version mismatch across files:");
  for (const [file, version] of Object.entries(versions)) {
    console.error(`  ${file}: ${version}`);
  }
  process.exit(1);
}

console.log(`check-version-sync: all files match at ${cliPackage.version}`);
