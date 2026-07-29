#!/usr/bin/env node

import { codex_debug, codex_spec } from "./index.mjs";

function parseArgs(raw) {
  const result = {};
  for (let index = 0; index < raw.length; index += 1) {
    const token = raw[index];
    if (!token.startsWith("--")) continue;
    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    const value =
      inlineValue ??
      (raw[index + 1] && !raw[index + 1].startsWith("--")
        ? raw[(index += 1)]
        : "true");
    result[rawKey] = value;
  }
  return result;
}

function usage(mode) {
  if (mode === "debug") {
    return [
      "Usage:",
      '  npm run codex:debug -- --system LeaguePilot --symptom "..." --expected "..."',
      "",
      "Optional: --reproduction, --evidence, --allowedChanges",
    ].join("\n");
  }
  return [
    "Usage:",
    '  npm run codex:spec -- --system LeaguePilot --goal "..."',
    "",
    "Optional: --scope, --constraints, --authority, --proofLevel, --validation",
  ].join("\n");
}

const mode = process.argv[2];
if (!["spec", "debug"].includes(mode)) {
  console.log("Use `spec` or `debug`.");
  process.exitCode = 1;
} else {
  const args = parseArgs(process.argv.slice(3));
  const required = mode === "spec" ? ["system", "goal"] : ["system", "symptom", "expected"];
  if (required.some((key) => !args[key])) {
    console.log(usage(mode));
  } else {
    try {
      console.log(mode === "spec" ? codex_spec(args) : codex_debug(args));
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
