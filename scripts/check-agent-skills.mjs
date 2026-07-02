#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";

const requiredSkills = [
  {
    name: "leaguepilot-api-runtime-resilience",
    why: "LeaguePilot API, Supabase, RLS, provider-boundary, and runtime resilience reviews"
  },
  {
    name: "nextjs",
    why: "Next.js App Router routing, server/client boundary, and deployment guidance"
  },
  {
    name: "react-best-practices",
    why: "React component, hook, accessibility, TypeScript, and rendering guidance"
  },
  {
    name: "playwright",
    why: "browser automation, route reachability, screenshots, and UI-flow debugging"
  },
  {
    name: "playwright-testing",
    why: "Playwright E2E structure and CI-oriented browser validation"
  },
  {
    name: "design-taste-frontend",
    why: "frontend quality checks for route, dashboard, and parent/coach/admin UX work"
  },
  {
    name: "openai-docs",
    why: "OpenAI Responses API and review-only AI Coach provider work"
  },
  {
    name: "twilio-compliance-traffic",
    why: "messaging consent, compliance, and provider-send guardrails"
  },
  {
    name: "twilio-sms-send-message",
    why: "SMS/MMS implementation guidance when approved provider sends are in scope"
  },
  {
    name: "twilio-sendgrid-webhooks",
    why: "email delivery webhook and engagement event handling"
  },
  {
    name: "stripe-best-practices",
    why: "sponsor billing, checkout, invoice, payment proof, and settlement boundaries"
  },
  {
    name: "vercel-deploy",
    why: "Vercel deployment and hosted proof work"
  },
  {
    name: "github",
    why: "GitHub repository, PR, issue, and CI orientation"
  },
  {
    name: "yeet",
    why: "scoped commit, push, and PR publishing from a dirty tree"
  }
];

const recommendedSkills = [
  {
    name: "supabase",
    why: "Supabase Auth, Postgres, RLS, migrations, and edge/runtime guidance",
    install: "npx skills add supabase/agent-skills@supabase -g -y"
  }
];

const repoRoot = process.cwd();
const skillRoots = [
  path.join(repoRoot, ".agents", "skills"),
  path.join(homedir(), ".agents", "skills"),
  path.join(homedir(), ".codex", "skills"),
  path.join(homedir(), ".codex", "plugins", "cache")
];

const logLine = (message = "") => process.stdout.write(`${message}\n`);
const errorLine = (message = "") => process.stderr.write(`${message}\n`);

function parseSkillName(skillMarkdown) {
  const match = skillMarkdown.match(/^name:\s*["']?([^"'\n]+)["']?\s*$/m);
  return match?.[1]?.trim() ?? null;
}

function readLockedSkillNames() {
  const lockPath = path.join(repoRoot, "skills-lock.json");
  if (!existsSync(lockPath)) {
    return new Set();
  }

  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  return new Set(Object.keys(lock.skills ?? {}));
}

function collectSkillNames(root, found = new Map(), depth = 0) {
  if (!existsSync(root) || depth > 14) {
    return found;
  }

  const entries = readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      const skillPath = path.join(absolutePath, "SKILL.md");
      if (existsSync(skillPath) && statSync(skillPath).isFile()) {
        const name = parseSkillName(readFileSync(skillPath, "utf8"));
        if (name && !found.has(name)) {
          found.set(name, skillPath);
        }
        continue;
      }

      collectSkillNames(absolutePath, found, depth + 1);
    }
  }

  return found;
}

const lockedNames = readLockedSkillNames();
const foundSkills = new Map();
for (const root of skillRoots) {
  collectSkillNames(root, foundSkills);
}

for (const lockedName of lockedNames) {
  if (!foundSkills.has(lockedName)) {
    foundSkills.set(lockedName, "skills-lock.json");
  }
}

const missing = requiredSkills.filter((skill) => !foundSkills.has(skill.name));
const missingRecommended = recommendedSkills.filter((skill) => !foundSkills.has(skill.name));

if (missing.length > 0) {
  errorLine("Missing required LeaguePilot agent skills:");
  errorLine();
  for (const skill of missing) {
    errorLine(`- ${skill.name}: ${skill.why}`);
  }
  errorLine();
  errorLine("Install missing global skills or add project-local equivalents before relying on them.");
  process.exit(1);
}

logLine("LeaguePilot agent skill baseline available:");
for (const skill of requiredSkills) {
  logLine(`- ${skill.name} (${foundSkills.get(skill.name)})`);
}

if (missingRecommended.length > 0) {
  logLine();
  logLine("Recommended additional skills not installed:");
  for (const skill of missingRecommended) {
    logLine(`- ${skill.name}: ${skill.why}`);
    logLine(`  Install: ${skill.install}`);
  }
}
