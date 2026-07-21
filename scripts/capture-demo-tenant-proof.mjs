import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { demoTenantIds } from "./bootstrap-demo-tenant.mjs";

const envFile = ".env.local";
const baseUrl = process.env.DEMO_TENANT_BASE_URL || process.env.QA_PROOF_BASE_URL || "http://localhost:3001";
const screenshotDir = "output/playwright/demo-tenant";
const proofFile = join(screenshotDir, "demo-tenant-proof.json");
const viewportSpecs = [
  ["mobile-390", 390, 844],
  ["desktop-1440", 1440, 1100]
];
const roleSpecs = {
  admin: ["DEMO_ADMIN_EMAIL", "DEMO_ADMIN_PASSWORD"],
  coach: ["DEMO_COACH_EMAIL", "DEMO_COACH_PASSWORD"],
  parent: ["DEMO_PARENT_EMAIL", "DEMO_PARENT_PASSWORD"]
};
const routeSpecs = [
  {
    role: "admin",
    name: "admin-health",
    path: "/admin/health",
    requiredTexts: [
      "LeaguePilot Demo League",
      "Demo Summer 2026",
      "Ready to invite",
      "Notification boundary"
    ]
  },
  {
    role: "admin",
    name: "admin-teams",
    path: "/admin/teams",
    requiredTexts: [
      "Tenant setup guide",
      "Riverside Rockets",
      "Northside Waves",
      "Demo Coach Taylor",
      "Roster: 3 active player(s)"
    ]
  },
  {
    role: "admin",
    name: "admin-sponsors",
    path: "/admin/sponsors",
    requiredTexts: [
      "Sponsor evidence ledger",
      "Community evidence receipt",
      "Player data",
      "Not included"
    ]
  },
  {
    role: "coach",
    name: "coach-home",
    path: "/coach",
    requiredTexts: [
      "Riverside Rockets",
      "Coach announcements",
      "Game-day radar",
      "People"
    ]
  },
  {
    role: "parent",
    name: "parent-home",
    path: "/parent",
    requiredTexts: [
      "Riverside Rockets",
      "Mason T.",
      "Season story",
      "Family view",
      "Team media is not shown in this story"
    ]
  },
  {
    role: "parent",
    name: "parent-messages",
    path: "/parent/messages",
    requiredTexts: [
      "Riverside Rockets Chat",
      "Pinned: game day check-in",
      "Can someone bring extra cups"
    ]
  }
];
const readbackSpecs = [
  ["organizations", "id", demoTenantIds.organization, 1],
  ["seasons", "organization_id", demoTenantIds.organization, 1],
  ["teams", "organization_id", demoTenantIds.organization, 2],
  ["players", "organization_id", demoTenantIds.organization, 5],
  ["events", "organization_id", demoTenantIds.organization, 3],
  ["registration_requests", "organization_id", demoTenantIds.organization, 2],
  ["team_chat_messages", "organization_id", demoTenantIds.organization, 4],
  ["media_items", "organization_id", demoTenantIds.organization, 2],
  ["notifications", "organization_id", demoTenantIds.organization, 3]
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

function createAnonClient() {
  return createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function createServiceClient() {
  return createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

async function signIn(page, role) {
  const [emailKey, passwordKey] = roleSpecs[role];
  const supabase = createAnonClient();
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

  return {
    userId: data.session.user.id,
    email: data.session.user.email
  };
}

async function assertRequiredTexts(page, requiredTexts) {
  for (const text of requiredTexts) {
    await waitForVisibleText(page, text);
  }
}

async function waitForVisibleText(page, text, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  const locator = page.getByText(text, { exact: false });
  while (Date.now() < deadline) {
    const count = await locator.count();
    for (let index = 0; index < count; index += 1) {
      if (await locator.nth(index).isVisible()) return;
    }
    await page.waitForTimeout(250);
  }

  throw new Error(`Expected visible text was not found: ${text}`);
}

async function captureRoute(browser, routeSpec) {
  const context = await browser.newContext({
    extraHTTPHeaders: {
      "Cache-Control": "no-cache"
    }
  });
  const page = await context.newPage();
  const result = {
    role: routeSpec.role,
    path: routeSpec.path,
    screenshots: []
  };

  try {
    const session = await signIn(page, routeSpec.role);
    result.userId = session.userId;
    for (const [viewportName, width, height] of viewportSpecs) {
      await page.setViewportSize({ width, height });
      await page.goto(`${baseUrl}${routeSpec.path}?demo_tenant_proof=${Date.now()}-${width}`, { waitUntil: "domcontentloaded" });
      const screenshotPath = join(screenshotDir, `${routeSpec.name}-${viewportName}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      result.screenshots.push(screenshotPath);
      console.log(`captured ${routeSpec.name}-${viewportName}.png`);
      await assertRequiredTexts(page, routeSpec.requiredTexts);
    }
  } finally {
    await context.close();
  }

  return result;
}

async function expectMinimumCount(supabase, table, column, value, minimum) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, value);
  if (error) throw new Error(`${table} readback failed: ${error.message}`);
  if ((count ?? 0) < minimum) {
    throw new Error(`${table} expected at least ${minimum} demo row(s), found ${count ?? 0}.`);
  }
  return { table, count: count ?? 0 };
}

async function verifyDeliveryAttemptMetadata(supabase) {
  const { data, error } = await supabase
    .from("notification_delivery_attempts")
    .select("id,status,idempotency_key,retry_count,max_retries,dead_lettered_at,provider_response_json")
    .in("id", Object.values(demoTenantIds.deliveryAttempts));
  if (error) throw new Error(`notification_delivery_attempts readback failed: ${error.message}`);
  if (!data || data.length !== 2) throw new Error(`expected 2 demo delivery attempts, found ${data?.length ?? 0}.`);

  const missingIdempotency = data.find((row) => !row.idempotency_key);
  if (missingIdempotency) throw new Error(`delivery attempt ${missingIdempotency.id} is missing idempotency metadata.`);

  const providerCalls = data.filter((row) => row.provider_response_json?.provider_call === true);
  if (providerCalls.length) throw new Error("demo tenant proof found a provider call marked as executed.");

  const deadLetter = data.find((row) => row.id === demoTenantIds.deliveryAttempts.failed);
  if (!deadLetter?.dead_lettered_at || deadLetter.retry_count !== deadLetter.max_retries) {
    throw new Error("demo dead-letter delivery attempt is missing retry/dead-letter metadata.");
  }

  return data.map((row) => ({
    id: row.id,
    status: row.status,
    retryCount: row.retry_count,
    maxRetries: row.max_retries,
    deadLettered: Boolean(row.dead_lettered_at),
    providerCall: row.provider_response_json?.provider_call === true
  }));
}

async function verifySupabaseReadback() {
  const supabase = createServiceClient();
  const counts = [];
  for (const [table, column, value, minimum] of readbackSpecs) {
    counts.push(await expectMinimumCount(supabase, table, column, value, minimum));
  }

  const deliveryAttempts = await verifyDeliveryAttemptMetadata(supabase);
  return {
    organizationId: demoTenantIds.organization,
    organizationName: "LeaguePilot Demo League",
    counts,
    deliveryAttempts,
    providerSendsExecuted: 0
  };
}

async function main() {
  loadLocalEnv();
  mkdirSync(screenshotDir, { recursive: true });

  const readback = await verifySupabaseReadback();
  const executablePath = chromiumExecutablePath();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {})
  });

  try {
    const routes = [];
    const requestedRoute = process.env.DEMO_TENANT_ROUTE;
    const selectedRouteSpecs = requestedRoute
      ? routeSpecs.filter((routeSpec) => routeSpec.name === requestedRoute)
      : routeSpecs;
    if (!selectedRouteSpecs.length) throw new Error(`Unknown DEMO_TENANT_ROUTE: ${requestedRoute}`);
    for (const routeSpec of selectedRouteSpecs) {
      routes.push(await captureRoute(browser, routeSpec));
    }

    const proof = {
      capturedAt: new Date().toISOString(),
      baseUrl,
      readback,
      routes
    };
    writeFileSync(proofFile, `${JSON.stringify(proof, null, 2)}\n`);

    console.log(`Demo tenant proof saved under ${screenshotDir}`);
    console.log(`Provider sends executed: ${readback.providerSendsExecuted}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
