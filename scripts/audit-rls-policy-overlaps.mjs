#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const COMMANDS = ["SELECT", "INSERT", "UPDATE", "DELETE"];
const EXPECTED = Object.freeze({
  policies: 156,
  overlapGroups: 35,
  selectGroups: 34,
  updateGroups: 1,
  serviceOnlyGroups: 7,
});

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function unquoteIdentifier(value) {
  const trimmed = value.trim();
  return trimmed.startsWith('"')
    ? trimmed.slice(1, -1).replaceAll('""', '"')
    : trimmed.toLowerCase();
}

function truncatePgIdentifier(value) {
  const bytes = Buffer.from(value, "utf8");
  if (bytes.length <= 63) return value;
  let end = 63;
  while (end > 0 && (bytes[end] & 0xc0) === 0x80) end -= 1;
  return bytes.subarray(0, end).toString("utf8");
}

function canonicalIdentifier(value) {
  return truncatePgIdentifier(unquoteIdentifier(value));
}

const IDENT = String.raw`(?:"(?:[^"]|"")*"|[a-zA-Z_][a-zA-Z0-9_$]*)`;

function parseQualifiedName(value) {
  const match = value
    .trim()
    .match(new RegExp(`^(${IDENT})(?:\\s*\\.\\s*(${IDENT}))?$`, "i"));
  if (!match) throw new Error(`Unsupported qualified identifier: ${value}`);
  return match[2]
    ? { schema: canonicalIdentifier(match[1]), table: canonicalIdentifier(match[2]) }
    : { schema: "public", table: canonicalIdentifier(match[1]) };
}

function stripSqlComments(sql) {
  let output = "";
  let state = "normal";
  let dollarTag = "";
  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];
    if (state === "line-comment") {
      if (char === "\n") {
        state = "normal";
        output += "\n";
      } else {
        output += " ";
      }
      continue;
    }
    if (state === "block-comment") {
      if (char === "*" && next === "/") {
        output += "  ";
        index += 1;
        state = "normal";
      } else {
        output += char === "\n" ? "\n" : " ";
      }
      continue;
    }
    if (state === "single") {
      output += char;
      if (char === "'" && next === "'") {
        output += next;
        index += 1;
      } else if (char === "'") {
        state = "normal";
      }
      continue;
    }
    if (state === "double") {
      output += char;
      if (char === '"' && next === '"') {
        output += next;
        index += 1;
      } else if (char === '"') {
        state = "normal";
      }
      continue;
    }
    if (state === "dollar") {
      if (sql.startsWith(dollarTag, index)) {
        output += dollarTag;
        index += dollarTag.length - 1;
        state = "normal";
      } else {
        output += char;
      }
      continue;
    }
    if (char === "-" && next === "-") {
      output += "  ";
      index += 1;
      state = "line-comment";
    } else if (char === "/" && next === "*") {
      output += "  ";
      index += 1;
      state = "block-comment";
    } else if (char === "'") {
      output += char;
      state = "single";
    } else if (char === '"') {
      output += char;
      state = "double";
    } else if (char === "$") {
      const tag = sql.slice(index).match(/^\$[a-zA-Z_][a-zA-Z0-9_]*\$|^\$\$/)?.[0];
      if (tag) {
        output += tag;
        index += tag.length - 1;
        dollarTag = tag;
        state = "dollar";
      } else {
        output += char;
      }
    } else {
      output += char;
    }
  }
  if (state !== "normal" && state !== "line-comment") {
    throw new Error(`Unterminated SQL ${state}`);
  }
  return output;
}

export function splitSqlStatements(sql, source = "<sql>") {
  const clean = stripSqlComments(sql);
  const statements = [];
  let start = 0;
  let startLine = 1;
  let line = 1;
  let state = "normal";
  let dollarTag = "";
  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    const next = clean[index + 1];
    if (char === "\n") line += 1;
    if (state === "single") {
      if (char === "'" && next === "'") index += 1;
      else if (char === "'") state = "normal";
      continue;
    }
    if (state === "double") {
      if (char === '"' && next === '"') index += 1;
      else if (char === '"') state = "normal";
      continue;
    }
    if (state === "dollar") {
      if (clean.startsWith(dollarTag, index)) {
        index += dollarTag.length - 1;
        state = "normal";
      }
      continue;
    }
    if (char === "'") state = "single";
    else if (char === '"') state = "double";
    else if (char === "$") {
      const tag = clean.slice(index).match(/^\$[a-zA-Z_][a-zA-Z0-9_]*\$|^\$\$/)?.[0];
      if (tag) {
        dollarTag = tag;
        index += tag.length - 1;
        state = "dollar";
      }
    } else if (char === ";") {
      const text = clean.slice(start, index).trim();
      if (text) statements.push({ source, line: startLine, text });
      start = index + 1;
      startLine = line;
    }
  }
  const trailing = clean.slice(start).trim();
  if (trailing) statements.push({ source, line: startLine, text: trailing });
  return statements;
}

function balancedClause(statement, keyword) {
  const lower = statement.toLowerCase();
  let index = lower.indexOf(keyword.toLowerCase());
  if (index < 0) return null;
  const keywordStart = index;
  index += keyword.length;
  while (/\s/.test(statement[index] ?? "")) index += 1;
  if (statement[index] !== "(") {
    throw new Error(`Expected parenthesized ${keyword} clause`);
  }
  const start = index;
  let depth = 0;
  let state = "normal";
  for (; index < statement.length; index += 1) {
    const char = statement[index];
    const next = statement[index + 1];
    if (state === "single") {
      if (char === "'" && next === "'") index += 1;
      else if (char === "'") state = "normal";
      continue;
    }
    if (state === "double") {
      if (char === '"' && next === '"') index += 1;
      else if (char === '"') state = "normal";
      continue;
    }
    if (char === "'") state = "single";
    else if (char === '"') state = "double";
    else if (char === "(") depth += 1;
    else if (char === ")" && --depth === 0) {
      return {
        expression: normalizeWhitespace(statement.slice(start, index + 1)),
        start: keywordStart,
        end: index + 1,
      };
    }
  }
  throw new Error(`Unbalanced ${keyword} clause`);
}

function findBalancedClause(statement, keyword) {
  return balancedClause(statement, keyword)?.expression ?? null;
}

function assertPolicyTailParsed(tail, kind) {
  let remainder = tail;
  for (const keyword of ["with check", "using"]) {
    const clause = balancedClause(remainder, keyword);
    if (clause) {
      remainder = `${remainder.slice(0, clause.start)} ${remainder.slice(clause.end)}`;
    }
  }
  if (kind === "create") {
    remainder = remainder
      .replace(/\bas\s+(?:permissive|restrictive)\b/i, " ")
      .replace(/\bfor\s+(?:all|select|insert|update|delete)\b/i, " ");
  }
  remainder = remainder.replace(
    new RegExp(`\\bto\\s+${IDENT}(?:\\s*,\\s*${IDENT})*`, "i"),
    " ",
  );
  if (normalizeWhitespace(remainder)) {
    throw new Error(`Unsupported ${kind.toUpperCase()} POLICY clause: ${normalizeWhitespace(remainder)}`);
  }
}

function parseRoles(statement) {
  const match = statement.match(
    /\bto\s+([\s\S]*?)(?=\s+(?:using|with\s+check)\s*\(|$)/i,
  );
  if (!match) return ["public"];
  return match[1]
    .split(",")
    .map((role) => canonicalIdentifier(role))
    .sort();
}

function policyKey(schema, table, name) {
  return `${schema}.${table}.${name}`;
}

function parsePolicyStatement(statement) {
  const text = statement.text;
  const create = text.match(
    new RegExp(
      `^create\\s+(?:(permissive|restrictive)\\s+)?policy\\s+(${IDENT})\\s+on\\s+(?:only\\s+)?((${IDENT})(?:\\s*\\.\\s*(${IDENT}))?)\\s*([\\s\\S]*)$`,
      "i",
    ),
  );
  if (create) {
    const target = parseQualifiedName(create[3]);
    const tail = create[6];
    assertPolicyTailParsed(tail, "create");
    const asMode = tail.match(/\bas\s+(permissive|restrictive)\b/i)?.[1];
    return {
      kind: "create",
      policy: {
        ...target,
        name: canonicalIdentifier(create[2]),
        permissive:
          (asMode ?? create[1] ?? "permissive").toUpperCase() === "PERMISSIVE",
        command: (tail.match(/\bfor\s+(all|select|insert|update|delete)\b/i)?.[1] ?? "all").toUpperCase(),
        roles: parseRoles(tail),
        using: findBalancedClause(tail, "using"),
        withCheck: findBalancedClause(tail, "with check"),
        createdIn: statement.source,
        createdLine: statement.line,
        lastChangedIn: statement.source,
        lastChangedLine: statement.line,
      },
    };
  }
  const alter = text.match(
    new RegExp(
      `^alter\\s+policy\\s+(${IDENT})\\s+on\\s+(?:only\\s+)?((${IDENT})(?:\\s*\\.\\s*(${IDENT}))?)\\s*([\\s\\S]*)$`,
      "i",
    ),
  );
  if (alter) {
    const target = parseQualifiedName(alter[2]);
    const tail = alter[5];
    assertPolicyTailParsed(tail, "alter");
    return {
      kind: "alter",
      target: { ...target, name: canonicalIdentifier(alter[1]) },
      changes: {
        roles: /\bto\b/i.test(tail) ? parseRoles(tail) : undefined,
        using: /\busing\s*\(/i.test(tail) ? findBalancedClause(tail, "using") : undefined,
        withCheck: /\bwith\s+check\s*\(/i.test(tail)
          ? findBalancedClause(tail, "with check")
          : undefined,
      },
    };
  }
  const drop = text.match(
    new RegExp(
      `^drop\\s+policy\\s+(if\\s+exists\\s+)?(${IDENT})\\s+on\\s+(?:only\\s+)?((${IDENT})(?:\\s*\\.\\s*(${IDENT}))?)(?:\\s+(?:cascade|restrict))?$`,
      "i",
    ),
  );
  if (drop) {
    return {
      kind: "drop",
      ifExists: Boolean(drop[1]),
      target: {
        ...parseQualifiedName(drop[3]),
        name: canonicalIdentifier(drop[2]),
      },
    };
  }
  return null;
}

function splitIdentifierList(value) {
  return value.split(",").map((item) => parseQualifiedName(item.trim()));
}

function parseTablePrivilegeStatement(statement) {
  const match = statement.text.match(
    /^(grant|revoke)\s+([\s\S]*?)\s+on\s+(?:(table|function|sequence)\s+)?([\s\S]*?)\s+(to|from)\s+([\s\S]+)$/i,
  );
  if (!match) return null;
  if (match[3] && match[3].toLowerCase() !== "table") return null;
  const privileges = match[2]
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .sort();
  if (!privileges.every((value) => value === "ALL" || COMMANDS.includes(value))) {
    return null;
  }
  return {
    kind: match[1].toLowerCase(),
    privileges,
    tables: splitIdentifierList(match[4]),
    roles: match[6].split(",").map((role) => canonicalIdentifier(role)),
  };
}

function expandedCommands(command) {
  return command === "ALL" ? COMMANDS : [command];
}

function groupId(schema, table, command, actor) {
  return `${schema}.${table}:${command.toLowerCase()}:${actor}`;
}

function stablePolicy(policy) {
  return {
    schema: policy.schema,
    table: policy.table,
    name: policy.name,
    permissive: policy.permissive,
    command: policy.command,
    roles: [...policy.roles],
    using: policy.using,
    withCheck: policy.withCheck,
    createdIn: policy.createdIn,
    createdLine: policy.createdLine,
    lastChangedIn: policy.lastChangedIn,
    lastChangedLine: policy.lastChangedLine,
  };
}

export function reconstructCatalog(migrationFiles) {
  const policies = new Map();
  const grants = new Map();
  const operations = [];
  for (const migration of migrationFiles) {
    const statements = splitSqlStatements(migration.sql, migration.path);
    for (const statement of statements) {
      const beginsPolicyDdl =
        /^(?:create\s+(?:(?:permissive|restrictive)\s+)?policy|alter\s+policy|drop\s+policy)\b/i.test(
          statement.text,
        );
      const operation = parsePolicyStatement(statement);
      if (beginsPolicyDdl && !operation) {
        throw new Error(
          `Unparsed policy-changing DDL at ${statement.source}:${statement.line}: ${normalizeWhitespace(statement.text).slice(0, 180)}`,
        );
      }
      if (operation) {
        operations.push({ ...operation, source: statement.source, line: statement.line });
        if (operation.kind === "create") {
          const key = policyKey(
            operation.policy.schema,
            operation.policy.table,
            operation.policy.name,
          );
          if (policies.has(key)) {
            throw new Error(`Duplicate CREATE POLICY ${key} at ${statement.source}:${statement.line}`);
          }
          policies.set(key, operation.policy);
        } else if (operation.kind === "drop") {
          const key = policyKey(
            operation.target.schema,
            operation.target.table,
            operation.target.name,
          );
          if (!policies.delete(key) && !operation.ifExists) {
            throw new Error(`DROP POLICY did not match ${key} at ${statement.source}:${statement.line}`);
          }
        } else {
          const key = policyKey(
            operation.target.schema,
            operation.target.table,
            operation.target.name,
          );
          const existing = policies.get(key);
          if (!existing) {
            throw new Error(`ALTER POLICY did not match ${key} at ${statement.source}:${statement.line}`);
          }
          if (operation.changes.roles !== undefined) existing.roles = operation.changes.roles;
          if (operation.changes.using !== undefined) existing.using = operation.changes.using;
          if (operation.changes.withCheck !== undefined) {
            existing.withCheck = operation.changes.withCheck;
          }
          existing.lastChangedIn = statement.source;
          existing.lastChangedLine = statement.line;
        }
        continue;
      }
      const privilege = parseTablePrivilegeStatement(statement);
      if (!privilege) continue;
      for (const table of privilege.tables) {
        const key = `${table.schema}.${table.table}`;
        const tableGrants = grants.get(key) ?? new Map();
        for (const role of privilege.roles) {
          const roleGrants = tableGrants.get(role) ?? new Set();
          const affected = privilege.privileges.includes("ALL")
            ? COMMANDS
            : privilege.privileges;
          for (const command of affected) {
            if (privilege.kind === "grant") roleGrants.add(command);
            else roleGrants.delete(command);
          }
          tableGrants.set(role, roleGrants);
        }
        grants.set(key, tableGrants);
      }
    }
  }

  const finalPolicies = [...policies.values()]
    .map(stablePolicy)
    .sort((a, b) =>
      [a.schema, a.table, a.command, a.name].join("\0").localeCompare(
        [b.schema, b.table, b.command, b.name].join("\0"),
      ),
    );
  const overlapCandidates = new Map();
  for (const policy of finalPolicies.filter((item) => item.permissive)) {
    for (const command of expandedCommands(policy.command)) {
      for (const actor of policy.roles) {
        const id = groupId(policy.schema, policy.table, command, actor);
        const group = overlapCandidates.get(id) ?? {
          id,
          schema: policy.schema,
          table: policy.table,
          command,
          effectiveActor: actor,
          policies: [],
        };
        group.policies.push(policy);
        overlapCandidates.set(id, group);
      }
    }
  }

  const overlapGroups = [...overlapCandidates.values()]
    .filter((group) => group.policies.length > 1)
    .map((group) => {
      const tableGrants = grants.get(`${group.schema}.${group.table}`) ?? new Map();
      const browserRoles = ["anon", "authenticated"].filter((role) =>
        tableGrants.get(role)?.has(group.command),
      );
      const dataApiScope =
        browserRoles.length === 0 ? "service-role-only" : `Data API: ${browserRoles.join(", ")}`;
      const disposition =
        browserRoles.length === 0 || group.command === "UPDATE"
          ? "intentional separation"
          : "candidate consolidation";
      const rationale =
        browserRoles.length === 0
          ? "Browser-role table privileges were revoked; overlapping policies remain defense-in-depth semantics for non-bypass direct roles and do not expose application rows through anon/authenticated Data API grants."
          : group.command === "UPDATE"
            ? "The write paths have distinct USING/WITH CHECK responsibilities; retain separation unless live-role and mutation proof shows an equivalent consolidated predicate."
            : "The table is browser-granted and multiple permissive read predicates OR together for the same effective actor; a single OR-composed SELECT policy is a review candidate, not an approved migration."
      return {
        ...group,
        policies: group.policies.sort((a, b) => a.name.localeCompare(b.name)),
        browserRoles,
        dataApiScope,
        disposition,
        rationale,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    migrations: migrationFiles.map((file) => file.path),
    operations,
    policies: finalPolicies,
    overlapGroups,
  };
}

export function loadMigrationFiles(rootDir) {
  const migrationDir = resolve(rootDir, "supabase/migrations");
  return readdirSync(migrationDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => {
      const path = `supabase/migrations/${name}`;
      return { path, sql: readFileSync(resolve(rootDir, path), "utf8") };
    });
}

export function verifyCatalog(catalog) {
  const actual = {
    policies: catalog.policies.length,
    overlapGroups: catalog.overlapGroups.length,
    selectGroups: catalog.overlapGroups.filter((group) => group.command === "SELECT").length,
    updateGroups: catalog.overlapGroups.filter((group) => group.command === "UPDATE").length,
    serviceOnlyGroups: catalog.overlapGroups.filter(
      (group) => group.dataApiScope === "service-role-only",
    ).length,
  };
  const mismatches = Object.entries(EXPECTED)
    .filter(([key, expected]) => actual[key] !== expected)
    .map(([key, expected]) => `${key}: expected ${expected}, got ${actual[key]}`);
  if (mismatches.length) {
    throw new Error(`Static RLS catalog verification failed:\n- ${mismatches.join("\n- ")}`);
  }
  return actual;
}

function markdownCell(value) {
  return String(value ?? "—").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

export function renderMarkdown(catalog) {
  const counts = {
    policies: catalog.policies.length,
    groups: catalog.overlapGroups.length,
    select: catalog.overlapGroups.filter((group) => group.command === "SELECT").length,
    update: catalog.overlapGroups.filter((group) => group.command === "UPDATE").length,
    serviceOnly: catalog.overlapGroups.filter(
      (group) => group.dataApiScope === "service-role-only",
    ).length,
  };
  const lines = [
    "# Static RLS permissive-policy overlap matrix",
    "",
    `Reconstructed from ${catalog.migrations.length} ordered migrations: **${counts.policies} final policies** and **${counts.groups} overlap groups** (${counts.select} SELECT, ${counts.update} UPDATE). ${counts.serviceOnly} groups are service-role-only by final table grants.`,
    "",
    "| Group ID | Scope | Actor | Action | Policies and predicates | Disposition | Evidence-backed rationale |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const group of catalog.overlapGroups) {
    const policies = group.policies
      .map(
        (policy) =>
          `\`${policy.name}\` — USING \`${policy.using ?? "—"}\`; WITH CHECK \`${policy.withCheck ?? "—"}\``,
      )
      .join("<br>");
    lines.push(
      `| \`${markdownCell(group.id)}\` | ${markdownCell(group.dataApiScope)} | \`${markdownCell(group.effectiveActor)}\` | ${group.command} | ${markdownCell(policies)} | **${group.disposition}** | ${markdownCell(group.rationale)} |`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function machineReadableCatalog(catalog) {
  return {
    summary: {
      migrationCount: catalog.migrations.length,
      finalPolicyCount: catalog.policies.length,
      overlapGroupCount: catalog.overlapGroups.length,
      overlapByCommand: Object.fromEntries(
        COMMANDS.map((command) => [
          command,
          catalog.overlapGroups.filter((group) => group.command === command).length,
        ]),
      ),
      serviceRoleOnlyGroupCount: catalog.overlapGroups.filter(
        (group) => group.dataApiScope === "service-role-only",
      ).length,
    },
    migrations: catalog.migrations,
    policies: catalog.policies,
    overlapGroups: catalog.overlapGroups,
  };
}

function parseArgs(argv) {
  const options = { format: "json", verify: false };
  for (const arg of argv) {
    if (arg === "--verify") options.verify = true;
    else if (arg === "--markdown" || arg === "--format=markdown") options.format = "markdown";
    else if (arg === "--json" || arg === "--format=json") options.format = "json";
    else if (arg === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

export function runCli(argv, rootDir) {
  const options = parseArgs(argv);
  if (options.help) {
    return "Usage: node scripts/audit-rls-policy-overlaps.mjs [--verify] [--json|--markdown]\n";
  }
  const catalog = reconstructCatalog(loadMigrationFiles(rootDir));
  const verified = options.verify ? verifyCatalog(catalog) : null;
  if (options.verify) {
    const reviewPath = resolve(rootDir, "docs/rls-policy-overlap-review-2026-07-27.md");
    const review = readFileSync(reviewPath, "utf8");
    const missing = catalog.overlapGroups
      .map((group) => group.id)
      .filter((id) => !review.includes(`\`${id}\``));
    if (missing.length) {
      throw new Error(`Checked-in review is missing overlap groups: ${missing.join(", ")}`);
    }
    for (const disposition of [
      "intentional separation",
      "candidate consolidation",
      "needs hosted/live-role proof",
    ]) {
      if (!review.includes(disposition)) {
        throw new Error(`Checked-in review does not define disposition: ${disposition}`);
      }
    }
  }
  if (options.format === "markdown") return renderMarkdown(catalog);
  return `${JSON.stringify({ verified, ...machineReadableCatalog(catalog) }, null, 2)}\n`;
}

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  try {
    const rootDir = resolve(dirname(modulePath), "..");
    process.stdout.write(runCli(process.argv.slice(2), rootDir));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
