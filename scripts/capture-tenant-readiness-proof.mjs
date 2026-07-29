import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const envFile = ".env.local";
const baseUrl = process.env.TENANT_READINESS_BASE_URL || process.env.QA_PROOF_BASE_URL || "http://localhost:3001";
const screenshotDir = "output/playwright/tenant-readiness";
const routeSpecs = [
  {
    name: "admin-health",
    path: "/admin/health",
    requiredTexts: [
      "Tenants visible",
      "Ready to invite",
      "Blocking setup gaps",
      "Notification boundary"
    ]
  },
  {
    name: "admin-teams",
    path: "/admin/teams",
    requiredTexts: [
      "Tenant setup guide",
      "Get this organization ready before inviting families.",
      "Start new season",
      "Start new team",
      "Start new player"
    ]
  }
];
const viewportSpecs = [
  ["mobile-390", 390, 844],
  ["desktop-1440", 1440, 1100]
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

async function signInAsAdmin(page) {
  const supabase = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: requireEnv("QA_ADMIN_EMAIL"),
    password: requireEnv("QA_ADMIN_PASSWORD")
  });
  if (error || !data.session) throw new Error(error?.message ?? "QA admin session was not returned.");

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

async function assertRequiredTexts(page, requiredTexts) {
  for (const text of requiredTexts) {
    await page.getByText(text, { exact: false }).first().waitFor({ timeout: 15_000 });
  }
}

async function captureRoute(browser, routeSpec) {
  const context = await browser.newContext({
    extraHTTPHeaders: {
      "Cache-Control": "no-cache"
    }
  });
  const page = await context.newPage();
  try {
    await signInAsAdmin(page);
    for (const [viewportName, width, height] of viewportSpecs) {
      await page.setViewportSize({ width, height });
      await page.goto(`${baseUrl}${routeSpec.path}?tenant_readiness_proof=${Date.now()}-${width}`, { waitUntil: "domcontentloaded" });
      await assertRequiredTexts(page, routeSpec.requiredTexts);
      await page.screenshot({
        path: join(screenshotDir, `${routeSpec.name}-${viewportName}.png`),
        fullPage: true
      });
      console.log(`captured ${routeSpec.name}-${viewportName}.png`);
    }
  } finally {
    await context.close();
  }
}

async function main() {
  loadLocalEnv();
  mkdirSync(screenshotDir, { recursive: true });

  const executablePath = chromiumExecutablePath();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {})
  });

  try {
    for (const routeSpec of routeSpecs) {
      await captureRoute(browser, routeSpec);
    }
    console.log(`Tenant readiness screenshots saved under ${screenshotDir}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
