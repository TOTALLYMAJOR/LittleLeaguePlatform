// Captures browser proof for the navigation/UX enhancement slice:
// icon tab bar, attention badges, parent home changes strip, family access card.
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const envFile = ".env.local";
const baseUrl = process.env.QA_PROOF_BASE_URL || "http://localhost:3001";
const screenshotDir = process.env.UI_NAV_SCREENSHOT_DIR || "output/playwright/ui-nav-enhancements";

const roleSpecs = {
  admin: ["DEMO_ADMIN_EMAIL", "DEMO_ADMIN_PASSWORD"],
  coach: ["DEMO_COACH_EMAIL", "DEMO_COACH_PASSWORD"],
  parent: ["DEMO_PARENT_EMAIL", "DEMO_PARENT_PASSWORD"]
};

const routeSpecs = [
  { role: "parent", name: "parent-home", path: "/parent", viewports: [["mobile-390", 390, 844], ["desktop-1440", 1440, 1100]] },
  { role: "parent", name: "parent-rsvp", path: "/parent/rsvp", viewports: [["mobile-390", 390, 844]] },
  { role: "coach", name: "coach-home", path: "/coach", viewports: [["mobile-390", 390, 844], ["desktop-1440", 1440, 1100]] },
  { role: "admin", name: "admin-overview", path: "/admin", viewports: [["mobile-390", 390, 844], ["desktop-1440", 1440, 1100]] }
];

function parseEnvLine(line) {
  if (!line || line.trim().startsWith("#")) return null;
  const separator = line.indexOf("=");
  if (separator === -1) return null;
  return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^"|"$/g, "")];
}

function loadLocalEnv() {
  if (!existsSync(envFile)) return;
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const entry = parseEnvLine(line);
    if (!entry) continue;
    const [key, value] = entry;
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.includes("[YOUR-")) throw new Error(`${name} is required.`);
  return value;
}

function chromiumExecutablePath() {
  const candidates = [
    process.env.PLAYWRIGHT_MCP_EXECUTABLE_PATH,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    process.env.HOME ? `${process.env.HOME}/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome` : ""
  ];
  return candidates.find((candidate) => candidate && existsSync(candidate));
}

function supabaseProjectRef() {
  return new URL(requireEnv("NEXT_PUBLIC_SUPABASE_URL")).hostname.split(".")[0];
}

async function signIn(page, role) {
  const [emailKey, passwordKey] = roleSpecs[role];
  const supabase = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: requireEnv(emailKey),
    password: requireEnv(passwordKey)
  });
  if (error || !data.session) throw new Error(error?.message ?? `${role} demo session was not returned.`);
  const encodedSession = Buffer.from(JSON.stringify(data.session), "utf8").toString("base64url");
  await page.context().addCookies([{
    name: `sb-${supabaseProjectRef()}-auth-token`,
    value: `base64-${encodedSession}`,
    domain: new URL(baseUrl).hostname,
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
    expires: Math.floor(Date.now() / 1000) + 60 * 60
  }]);
}

async function main() {
  loadLocalEnv();
  mkdirSync(screenshotDir, { recursive: true });
  const executablePath = chromiumExecutablePath();
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const failures = [];

  for (const spec of routeSpecs) {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await signIn(page, spec.role);
      for (const [viewportName, width, height] of spec.viewports) {
        await page.setViewportSize({ width, height });
        await page.goto(`${baseUrl}${spec.path}`, { waitUntil: "networkidle", timeout: 90_000 });
        await page.waitForTimeout(1200);
        const file = join(screenshotDir, `${spec.name}-${viewportName}.png`);
        await page.screenshot({ path: file, fullPage: false });
        console.log(`captured ${file}`);
      }
    } catch (error) {
      failures.push(`${spec.name}: ${error.message}`);
    } finally {
      await context.close();
    }
  }

  await browser.close();
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
