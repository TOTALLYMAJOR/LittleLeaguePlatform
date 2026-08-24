#!/usr/bin/env node

/**
 * Governance authority checker.
 *
 * Enforces the contract in `docs/AUTHORITY.md`: every question this repository
 * answers has exactly one owning document, no governance document is orphaned,
 * and automation and prose agree about which file is the execution queue.
 *
 * Repository-source only. Performs no hosted, provider, network, database, or
 * production action, and makes no claim about hosted or production acceptance.
 *
 * Reporting mode by default (exit 0). Pass --enforce to fail on errors.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

export const AUTHORITY_REGISTER = "docs/AUTHORITY.md";

export const VALID_AUTHORITY = ["active", "contested", "historical", "evidence", "reference"];

/** Root-level files that carry governance weight. */
export const ROOT_GOVERNANCE_FILES = [
  "AGENTS.md",
  "BACKLOG.md",
  "CONTRIBUTING.md",
  "README.md",
  "SECURITY.md",
  "WORKSHOP.md"
];

/**
 * Phrases that assert documentary authority. Only counted when the surrounding
 * window also mentions a document, so domain sentences such as "the approved
 * guardian-link record is authoritative for access" are not flagged.
 */
export const AUTHORITY_PHRASES = [
  "is now authoritative",
  "is authoritative",
  "remains authoritative",
  "source of truth",
  "sole current",
  "canonical owner"
];

const DOCUMENT_NOUNS = /\.md\b|\bfile\b|\bdocument\b|\bledger\b|\bqueue\b|\bboard\b|\btracker\b|\bmatrix\b/i;

/** Parses flat YAML front matter. Supports scalars, null, and inline arrays. */
export function parseFrontMatter(source) {
  if (!source.startsWith("---")) return null;
  const end = source.indexOf("\n---", 3);
  if (end === -1) return null;
  const body = source.slice(source.indexOf("\n") + 1, end);
  const result = {};
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (value.startsWith("#")) value = "";
    value = value.replace(/\s+#.*$/, "").trim();
    if (value === "" || value === "null" || value === "~") {
      result[key] = null;
    } else if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      result[key] = inner
        ? inner.split(",").map((item) => item.trim().replace(/^["']|["']$/g, "")).filter(Boolean)
        : [];
    } else {
      result[key] = value.replace(/^["']|["']$/g, "");
    }
  }
  return result;
}

/** Registered owner paths named in the authority register's tables. */
export function parseRegisteredOwners(registerSource) {
  const owners = new Set();
  for (const match of registerSource.matchAll(/`([A-Za-z0-9._/-]+\.(?:md|ts|tsx|css|yaml|sql))`|`([A-Za-z0-9._/-]+\/)`/g)) {
    const value = match[1] ?? match[2];
    if (!value) continue;
    owners.add(value);
    const base = value.replace(/\/$/, "").split("/").pop();
    if (base) owners.add(base);
  }
  return owners;
}

/**
 * Finds authority claims that are NOT compliant.
 *
 * A claim is compliant when it defers to a path the register already names as
 * an owner — "migrations remain source of truth" is the behavior we want, not a
 * competing claim. Only claims naming no registered owner are returned.
 */
export function findDocumentAuthorityClaims(source, phrases = AUTHORITY_PHRASES, registeredOwners = new Set()) {
  const claims = [];
  const haystack = source.toLowerCase();
  for (const phrase of phrases) {
    let index = 0;
    while ((index = haystack.indexOf(phrase, index)) !== -1) {
      const window = source.slice(Math.max(0, index - 160), Math.min(source.length, index + 160));
      const defersToOwner = [...registeredOwners].some((owner) => owner.length > 3 && window.includes(owner));
      if (DOCUMENT_NOUNS.test(window) && !defersToOwner) {
        claims.push({ phrase, line: source.slice(0, index).split("\n").length });
      }
      index += phrase.length;
    }
  }
  return claims;
}

/** Extracts the `lp-ux-NNN` prefix from a filename, or null. */
export function lpUxNumber(name) {
  const match = /^lp-ux-(\d{3})\b/.exec(name);
  return match ? match[1] : null;
}

/** Reads `backlog.path` out of .agentflow.yaml without a YAML dependency. */
export function readAgentflowBacklogPath(source) {
  const match = /^backlog:\s*$([\s\S]*?)(?=^\S|\Z)/m.exec(source);
  if (!match) return null;
  const pathMatch = /^\s+path:\s*(.+)$/m.exec(match[1]);
  return pathMatch ? pathMatch[1].trim().replace(/^["']|["']$/g, "") : null;
}

function walkMarkdown(directory, collected = []) {
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      walkMarkdown(full, collected);
    } else if (entry.endsWith(".md")) {
      collected.push(full);
    }
  }
  return collected;
}

export function collectGovernanceDocuments(root = REPO_ROOT) {
  const documents = [];
  const docsDirectory = join(root, "docs");
  const paths = existsSync(docsDirectory) ? walkMarkdown(docsDirectory) : [];
  for (const name of ROOT_GOVERNANCE_FILES) {
    const full = join(root, name);
    if (existsSync(full)) paths.push(full);
  }
  for (const full of paths.sort()) {
    const source = readFileSync(full, "utf8");
    documents.push({
      path: relative(root, full).split("\\").join("/"),
      source,
      frontMatter: parseFrontMatter(source)
    });
  }
  return documents;
}

/** Applies every rule. Returns findings; the caller decides exit behavior. */
export function evaluateGovernance(input) {
  const { documents, agentflowBacklogPath, registerSource } = input;
  const registeredOwners = parseRegisteredOwners(registerSource ?? "");
  const findings = [];
  const add = (level, rule, path, message) => findings.push({ level, rule, path, message });

  const known = new Set(documents.map((document) => document.path));
  const classified = documents.filter((document) => document.frontMatter);

  // R1 — front matter present.
  for (const document of documents) {
    if (!document.frontMatter) {
      add("warn", "R1", document.path, "No front matter; authority is unclassified.");
      continue;
    }
    const { authority, answers } = document.frontMatter;
    if (!VALID_AUTHORITY.includes(authority)) {
      add("error", "R1", document.path, `Invalid authority "${authority}". Use one of: ${VALID_AUTHORITY.join(", ")}.`);
    }
    if (answers === undefined) {
      add("error", "R1", document.path, "Missing `answers`. Use a slug, or null when the document owns no question.");
    }
  }

  // R2 — at most one active owner per question.
  const activeByQuestion = new Map();
  for (const document of classified) {
    const { authority, answers } = document.frontMatter;
    if (authority !== "active" || !answers) continue;
    if (!activeByQuestion.has(answers)) activeByQuestion.set(answers, []);
    activeByQuestion.get(answers).push(document.path);
  }
  for (const [question, owners] of activeByQuestion) {
    if (owners.length > 1) {
      add("error", "R2", owners.join(", "), `${owners.length} documents are active owners of "${question}". Exactly one is permitted.`);
    }
  }

  // R2b — contested clusters are defects awaiting a decision.
  const contestedByQuestion = new Map();
  for (const document of classified) {
    const { authority, answers } = document.frontMatter;
    if (authority !== "contested" || !answers) continue;
    if (!contestedByQuestion.has(answers)) contestedByQuestion.set(answers, []);
    contestedByQuestion.get(answers).push(document.path);
  }
  for (const [question, candidates] of contestedByQuestion) {
    add("warn", "R2b", candidates.join(", "), `"${question}" is contested between ${candidates.length} documents. Promote one to active and demote the rest.`);
  }

  // R3 — historical requires a resolvable superseded_by.
  for (const document of classified) {
    if (document.frontMatter.authority !== "historical") continue;
    const target = document.frontMatter.superseded_by;
    if (!target) {
      add("error", "R3", document.path, "Historical documents must declare `superseded_by`.");
    } else if (!known.has(target) && !existsSync(join(REPO_ROOT, target))) {
      add("error", "R3", document.path, `\`superseded_by: ${target}\` does not resolve.`);
    }
  }

  // R4 — every declared path resolves.
  for (const document of classified) {
    const targets = [
      ...(Array.isArray(document.frontMatter.supersedes) ? document.frontMatter.supersedes : []),
      ...(document.frontMatter.superseded_by ? [document.frontMatter.superseded_by] : [])
    ];
    for (const target of targets) {
      if (!known.has(target) && !existsSync(join(REPO_ROOT, target))) {
        add("error", "R4", document.path, `Declared path "${target}" does not exist.`);
      }
    }
  }

  // R5 — documentary authority prose only in the active owner.
  for (const document of classified) {
    const { authority } = document.frontMatter;
    if (authority === "active" || document.path === AUTHORITY_REGISTER) continue;
    const claims = findDocumentAuthorityClaims(document.source, AUTHORITY_PHRASES, registeredOwners);
    for (const claim of claims) {
      add("warn", "R5", `${document.path}:${claim.line}`, `Asserts authority ("${claim.phrase}") without naming a registered owner.`);
    }
  }

  // R6 — one primary lp-ux entry per number.
  const lpUxPrimaries = new Map();
  for (const document of documents) {
    const name = document.path.split("/").pop();
    const number = lpUxNumber(name);
    if (!number) continue;
    const answers = document.frontMatter ? document.frontMatter.answers : undefined;
    if (answers === null) continue;
    if (!lpUxPrimaries.has(number)) lpUxPrimaries.set(number, []);
    lpUxPrimaries.get(number).push(document.path);
  }
  for (const [number, entries] of lpUxPrimaries) {
    if (entries.length > 1) {
      add("warn", "R6", entries.join(", "), `lp-ux-${number} has ${entries.length} primary entries. AGENTS.md routes agents by highest number, which is ambiguous here.`);
    }
  }

  // R7 — automation and prose agree on the execution queue.
  const queueOwners = activeByQuestion.get("execution-queue") ?? [];
  if (!agentflowBacklogPath) {
    add("error", "R7", ".agentflow.yaml", "Could not read `backlog.path`.");
  } else if (queueOwners.length === 1 && queueOwners[0] !== agentflowBacklogPath) {
    add("error", "R7", ".agentflow.yaml", `Machine reads "${agentflowBacklogPath}" but the active execution-queue owner is "${queueOwners[0]}".`);
  } else if (queueOwners.length === 0) {
    add("warn", "R7", ".agentflow.yaml", `Machine reads "${agentflowBacklogPath}" but no document is the active execution-queue owner.`);
  }

  // R8 — reachable from the register, unless evidence or reference.
  for (const document of classified) {
    const { authority } = document.frontMatter;
    if (authority === "evidence" || authority === "reference" || document.path === AUTHORITY_REGISTER) continue;
    const name = document.path.split("/").pop();
    if (!registerSource.includes(document.path) && !registerSource.includes(name)) {
      add("warn", "R8", document.path, "Not reachable from the authority register.");
    }
  }

  return findings;
}

export function summarize(findings) {
  return {
    errors: findings.filter((finding) => finding.level === "error").length,
    warnings: findings.filter((finding) => finding.level === "warn").length
  };
}

function main() {
  const enforce = process.argv.includes("--enforce");
  const registerPath = join(REPO_ROOT, AUTHORITY_REGISTER);
  if (!existsSync(registerPath)) {
    console.error(`Missing ${AUTHORITY_REGISTER}. The authority register is required.`);
    process.exitCode = 1;
    return;
  }

  const agentflowPath = join(REPO_ROOT, ".agentflow.yaml");
  const findings = evaluateGovernance({
    documents: collectGovernanceDocuments(),
    agentflowBacklogPath: existsSync(agentflowPath)
      ? readAgentflowBacklogPath(readFileSync(agentflowPath, "utf8"))
      : null,
    registerSource: readFileSync(registerPath, "utf8")
  });

  const { errors, warnings } = summarize(findings);
  const byRule = new Map();
  for (const finding of findings) {
    if (!byRule.has(finding.rule)) byRule.set(finding.rule, []);
    byRule.get(finding.rule).push(finding);
  }

  console.log("Governance authority check — repository source only.\n");
  for (const rule of [...byRule.keys()].sort()) {
    const group = byRule.get(rule);
    console.log(`${rule} — ${group.length} finding${group.length === 1 ? "" : "s"}`);
    for (const finding of group) {
      console.log(`  [${finding.level}] ${finding.path}`);
      console.log(`         ${finding.message}`);
    }
    console.log("");
  }

  console.log(`${errors} error${errors === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}.`);
  if (!enforce) {
    console.log("Reporting mode: exiting 0. Pass --enforce to fail on errors.");
    return;
  }
  if (errors > 0) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main();
}
