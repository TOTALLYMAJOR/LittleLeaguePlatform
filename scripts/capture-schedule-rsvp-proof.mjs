import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");
const envFile = ".env.local";
const baseUrl = process.env.SCHEDULE_RSVP_PROOF_BASE_URL || "http://127.0.0.1:3133";
const screenshotDir = process.env.SCHEDULE_RSVP_PROOF_DIR || "output/playwright/lp-ux-003-schedule-rsvp";
const viewports = [
  ["mobile-320", 320, 844],
  ["mobile-390", 390, 844],
  ["tablet-768", 768, 1024],
  ["desktop-1024", 1024, 900],
  ["desktop-1440", 1440, 1000]
];
const routeSpecs = [
  {
    name: "schedule",
    path: "/parent/schedule",
    heading: "All schedules",
    conflictCode: "schedule_changed",
    conflictCopy: "The schedule changed since this page loaded."
  },
  {
    name: "needs-reply",
    path: "/parent/rsvp",
    heading: "Answer the family RSVP list.",
    conflictCode: "guardian_conflict",
    conflictCopy: "Another guardian already answered Going."
  }
];

function parseEnvLine(line) {
  if (!line || line.trim().startsWith("#")) return null;
  const separator = line.indexOf("=");
  if (separator === -1) return null;
  return [
    line.slice(0, separator).trim(),
    line.slice(separator + 1).trim().replace(/^"|"$/g, "")
  ];
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

function projectRef() {
  return new URL(requireEnv("NEXT_PUBLIC_SUPABASE_URL")).hostname.split(".")[0];
}

async function createParentSession() {
  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data, error } = await supabase.auth.signInWithPassword({
    email: requireEnv("DEMO_PARENT_EMAIL"),
    password: requireEnv("DEMO_PARENT_PASSWORD")
  });
  if (error || !data.session) {
    throw new Error(error?.message ?? "Demo parent session was not returned.");
  }
  return data.session;
}

async function addParentSession(context, session) {
  const encodedSession = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  await context.addCookies([{
    name: `sb-${projectRef()}-auth-token`,
    value: `base64-${encodedSession}`,
    domain: new URL(baseUrl).hostname,
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
    expires: Math.floor(Date.now() / 1000) + 60 * 60
  }]);
}

async function installProviderFreeRsvpResponses(page, conflictCode) {
  let requestCount = 0;
  await page.route("**/api/rsvps", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    requestCount += 1;
    if (requestCount === 1) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          lockVersion: 2,
          message: "Provider-free browser proof stored no row."
        })
      });
      return;
    }
    await route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        code: conflictCode,
        currentResponse: "going",
        message: "Provider-free browser proof conflict."
      })
    });
  });
  return () => requestCount;
}

async function exerciseRsvpConflict(page, spec) {
  const control = page.locator(".family-rsvp-control").first();
  await control.waitFor({ state: "visible", timeout: 20_000 });
  const going = control.locator('button[data-response="going"]');
  const maybe = control.locator('button[data-response="maybe"]');
  await going.click();
  await control.getByText(/RSVP saved for/).waitFor({ timeout: 10_000 });
  await maybe.click();
  await control.getByText(spec.conflictCopy, { exact: false }).waitFor({ timeout: 10_000 });
  return {
    firstResponse: "success",
    secondResponse: spec.conflictCode,
    copy: (await control.locator(".family-rsvp-message").innerText()).trim()
  };
}

async function auditPage(page) {
  await page.addScriptTag({ path: axePath });
  return page.evaluate(async () => {
    const surface = document.querySelector(".parent-schedule-page, .parent-rsvp-page");
    const interactive = [...(surface?.querySelectorAll(
      'button, input, select, textarea, a.button, [role="button"]'
    ) ?? [])]
      .filter((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          rect.width > 0 &&
          rect.height > 0
        );
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          text: (
            element.getAttribute("aria-label") ||
            element.textContent ||
            element.getAttribute("placeholder") ||
            ""
          ).trim().replace(/\s+/g, " ").slice(0, 100),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
      });
    const axe = await window.axe.run(document, {
      resultTypes: ["violations"],
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]
      }
    });
    const seriousOrCritical = axe.violations.filter((violation) => (
      violation.impact === "serious" || violation.impact === "critical"
    ));
    return {
      bodyWidth: document.body.scrollWidth,
      viewportWidth: window.innerWidth,
      documentOverflow: document.body.scrollWidth > window.innerWidth + 1,
      mainLandmarks: document.querySelectorAll("main").length,
      undersized: interactive.filter((item) => item.width < 44 || item.height < 44),
      axeViolations: seriousOrCritical.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.map((node) => ({
          target: node.target,
          html: node.html,
          failureSummary: node.failureSummary
        }))
      }))
    };
  });
}

async function captureRoute(browser, session, spec, [viewportName, width, height]) {
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: "light",
    extraHTTPHeaders: { "Cache-Control": "no-cache" }
  });
  await addParentSession(context, session);
  const page = await context.newPage();
  const pageErrors = [];
  const requestFailures = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "";
    if (failure !== "net::ERR_ABORTED") {
      requestFailures.push(`${request.method()} ${request.url()} ${failure}`.trim());
    }
  });
  const requestCount = await installProviderFreeRsvpResponses(page, spec.conflictCode);

  try {
    await page.goto(`${baseUrl}${spec.path}?lp_ux_003_proof=${Date.now()}-${width}`, {
      timeout: 60_000,
      waitUntil: "domcontentloaded"
    });
    await page.getByRole("heading", { name: spec.heading }).waitFor({ timeout: 20_000 });
    await page.locator("[data-surface-family='family']").waitFor({ timeout: 20_000 });

    let interaction = null;
    if (width === 390) {
      interaction = await exerciseRsvpConflict(page, spec);
    }

    const metrics = await auditPage(page);
    assert.equal(metrics.documentOverflow, false, `${spec.name} ${viewportName} has document overflow.`);
    assert.equal(metrics.mainLandmarks, 1, `${spec.name} ${viewportName} must have one main landmark.`);
    assert.deepEqual(metrics.undersized, [], `${spec.name} ${viewportName} has undersized controls.`);
    assert.deepEqual(metrics.axeViolations, [], `${spec.name} ${viewportName} has serious or critical axe violations.`);
    assert.deepEqual(pageErrors, [], `${spec.name} ${viewportName} emitted page errors.`);
    assert.deepEqual(requestFailures, [], `${spec.name} ${viewportName} emitted failed requests.`);
    if (width === 390) {
      assert.equal(requestCount(), 2, `${spec.name} interaction must issue exactly two intercepted RSVP requests.`);
    } else {
      assert.equal(requestCount(), 0, `${spec.name} non-interaction proof must not issue RSVP requests.`);
    }

    await page.screenshot({
      fullPage: false,
      path: join(screenshotDir, `${spec.name}-${viewportName}-viewport.png`)
    });
    await page.screenshot({
      fullPage: true,
      path: join(screenshotDir, `${spec.name}-${viewportName}-full.png`)
    });

    return {
      name: `${spec.name}-${viewportName}`,
      path: spec.path,
      width,
      height,
      documentOverflow: metrics.documentOverflow,
      mainLandmarks: metrics.mainLandmarks,
      undersizedInteractiveCount: metrics.undersized.length,
      axeSeriousOrCriticalCount: metrics.axeViolations.length,
      pageErrors,
      requestFailures,
      interceptedRsvpRequests: requestCount(),
      interaction
    };
  } finally {
    await context.close();
  }
}

loadLocalEnv();
mkdirSync(screenshotDir, { recursive: true });

const executablePath = process.env.PLAYWRIGHT_MCP_EXECUTABLE_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const browser = await chromium.launch({
  headless: true,
  ...(executablePath && existsSync(executablePath) ? { executablePath } : {})
});

try {
  const session = await createParentSession();
  const proof = [];
  for (const spec of routeSpecs) {
    for (const viewport of viewports) {
      const result = await captureRoute(browser, session, spec, viewport);
      proof.push(result);
      console.log(`captured ${result.name}`);
    }
  }
  writeFileSync(
    join(screenshotDir, "proof.json"),
    `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      baseUrl,
      authenticatedAs: "demo-parent",
      hostedRowsMutated: false,
      providerCallsExecuted: 0,
      rsvpRequestsIntercepted: proof.reduce((total, result) => total + result.interceptedRsvpRequests, 0),
      proof
    }, null, 2)}\n`
  );
} finally {
  await browser.close();
}
