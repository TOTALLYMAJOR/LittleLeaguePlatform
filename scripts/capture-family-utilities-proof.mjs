import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");
const envFile = ".env.local";
const baseUrl = process.env.FAMILY_UTILITIES_PROOF_BASE_URL || "http://127.0.0.1:3134";
const screenshotDir = process.env.FAMILY_UTILITIES_PROOF_DIR || "output/playwright/lp-ux-004-family-utilities";
const configuredViewports = [
  ["mobile-320", 320, 844],
  ["mobile-390", 390, 844],
  ["tablet-768", 768, 1024],
  ["desktop-1024", 1024, 900],
  ["desktop-1440", 1440, 1000]
];
const configuredRouteSpecs = [
  {
    name: "settings",
    path: "/parent/settings",
    heading: "Choose how family updates reach you.",
    surface: ".family-settings-page"
  },
  {
    name: "more",
    path: "/parent/more",
    heading: "More family tools",
    surface: ".family-more-page"
  },
  {
    name: "account",
    path: "/account",
    heading: "Your account and access",
    surface: ".account-page"
  },
  {
    name: "practice-replays",
    path: "/parent/practice-recaps",
    heading: "Bring one good moment from practice home.",
    surface: ".family-replay-page"
  }
];
const requestedRoutes = new Set(
  (process.env.FAMILY_UTILITIES_PROOF_ROUTES || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);
const requestedViewports = new Set(
  (process.env.FAMILY_UTILITIES_PROOF_VIEWPORTS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);
const routeSpecs = requestedRoutes.size
  ? configuredRouteSpecs.filter((spec) => requestedRoutes.has(spec.name))
  : configuredRouteSpecs;
const viewports = requestedViewports.size
  ? configuredViewports.filter(([name]) => requestedViewports.has(name))
  : configuredViewports;

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
  const domain = new URL(baseUrl).hostname;
  const expires = Math.floor(Date.now() / 1000) + 60 * 60;
  await context.addCookies([
    {
      name: `sb-${projectRef()}-auth-token`,
      value: `base64-${encodedSession}`,
      domain,
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
      expires
    },
    {
      name: "leaguepilot-active-role",
      value: "parent",
      domain,
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
      expires
    }
  ]);
}

async function installMutationInterceptions(page) {
  const requests = [];
  await page.route("**/api/parent/setup", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    requests.push("settings");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        message: "Preferences saved for local browser proof."
      })
    });
  });
  await page.route("**/api/parent/replays/*/engagement", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    requests.push("practice-replay");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        message: "Replay saved for local browser proof.",
        saved_at: "2026-07-30T18:00:00.000Z"
      })
    });
  });
  return requests;
}

async function waitForRouteReady(page, spec) {
  if (spec.name === "account") {
    await page.waitForFunction(() => {
      const notice = document.querySelector(".account-page > .notice");
      return notice && !notice.textContent?.includes("Checking your account");
    });
  }
  if (spec.name === "practice-replays") {
    await page.getByRole("button", { name: "Save for later" }).waitFor({
      state: "visible",
      timeout: 20_000
    });
  }
}

async function exerciseRoute(page, spec) {
  if (spec.name === "settings") {
    await page.getByLabel("Preferred language").selectOption("es");
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.getByText("Preferences saved for local browser proof.").waitFor({ timeout: 10_000 });
    return { action: "settings-save", result: "intercepted-success" };
  }
  if (spec.name === "more") {
    const links = await page.locator(".family-more-list a").evaluateAll((elements) => (
      elements.map((element) => element.getAttribute("href"))
    ));
    for (const destination of [
      "/parent/practice-recaps",
      "/parent/photos",
      "/parent/transportation",
      "/parent/settings",
      "/account",
      "/invite/recover",
      "/offline"
    ]) {
      assert.ok(links.includes(destination), `More must keep ${destination} reachable.`);
    }
    return { action: "destination-audit", result: `${links.length}-links` };
  }
  if (spec.name === "account") {
    const accountText = await page.locator(".account-page").innerText();
    assert.doesNotMatch(
      accountText,
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
      "Account must not render raw membership identifiers."
    );
    await page.getByRole("button", { name: "Sign out" }).focus();
    return { action: "account-privacy-focus", result: "plain-language-and-focusable" };
  }
  const saveButton = page.getByRole("button", { name: "Save for later" });
  await saveButton.waitFor({ state: "visible", timeout: 20_000 });
  await saveButton.click();
  await page.getByText("Replay saved for local browser proof.").waitFor({ timeout: 10_000 });
  return { action: "practice-replay-save", result: "intercepted-success" };
}

async function auditPage(page, surfaceSelector) {
  await page.addScriptTag({ path: axePath });
  return page.evaluate(async (selector) => {
    const surface = document.querySelector(selector);
    const interactive = [...(surface?.querySelectorAll(
      'button, a, input, select, textarea, [role="button"]'
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
        const measuredElement = (
          element instanceof HTMLInputElement &&
          (element.type === "checkbox" || element.type === "radio")
        ) ? element.closest("label") ?? element : element;
        const rect = measuredElement.getBoundingClientRect();
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
    const smallText = [...(surface?.querySelectorAll("p, span, small, label, a, button, time") ?? [])]
      .filter((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          rect.width > 0 &&
          rect.height > 0 &&
          (element.textContent ?? "").trim().length > 0 &&
          Number.parseFloat(style.fontSize) < 12
        );
      })
      .map((element) => ({
        text: (element.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 100),
        fontSize: window.getComputedStyle(element).fontSize
      }));
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
    const overflowers = [...(surface?.querySelectorAll("*") ?? [])]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.right > window.innerWidth + 1 || rect.left < -1;
      })
      .slice(0, 20)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          className: typeof element.className === "string" ? element.className : "",
          text: (element.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 100),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width)
        };
      });
    const containerRects = [
      ["html", document.documentElement],
      ["body", document.body],
      ["main", document.querySelector("main")],
      ["surface", surface]
    ].map(([name, element]) => {
      const rect = element?.getBoundingClientRect();
      return {
        name,
        left: Math.round(rect?.left ?? 0),
        right: Math.round(rect?.right ?? 0),
        width: Math.round(rect?.width ?? 0),
        scrollWidth: element?.scrollWidth ?? 0,
        clientWidth: element?.clientWidth ?? 0
      };
    });
    return {
      bodyWidth: document.body.scrollWidth,
      viewportWidth: window.innerWidth,
      documentOverflow: document.body.scrollWidth > window.innerWidth + 1,
      overflowers,
      containerRects,
      mainLandmarks: document.querySelectorAll("main").length,
      h1Count: surface?.querySelectorAll("h1").length ?? 0,
      undersized: interactive.filter((item) => item.width < 44 || item.height < 44),
      smallText,
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
  }, surfaceSelector);
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
  const interceptedMutations = await installMutationInterceptions(page);

  try {
    await page.goto(`${baseUrl}${spec.path}?lp_ux_004_proof=${Date.now()}-${width}`, {
      timeout: 60_000,
      waitUntil: "domcontentloaded"
    });
    await page.getByRole("heading", { name: spec.heading }).waitFor({ timeout: 20_000 });
    await page.locator("[data-surface-family='family']").waitFor({ timeout: 20_000 });
    await waitForRouteReady(page, spec);

    let interaction = null;
    if (width === 390) interaction = await exerciseRoute(page, spec);

    const metrics = await auditPage(page, spec.surface);
    assert.equal(
      metrics.documentOverflow,
      false,
      `${spec.name} ${viewportName} has document overflow: ${JSON.stringify({
        containerRects: metrics.containerRects,
        overflowers: metrics.overflowers
      })}`
    );
    assert.equal(metrics.mainLandmarks, 1, `${spec.name} ${viewportName} must have one main landmark.`);
    assert.equal(metrics.h1Count, 1, `${spec.name} ${viewportName} must have one route h1.`);
    assert.deepEqual(metrics.undersized, [], `${spec.name} ${viewportName} has undersized controls.`);
    assert.deepEqual(metrics.smallText, [], `${spec.name} ${viewportName} renders text below 12px.`);
    assert.deepEqual(metrics.axeViolations, [], `${spec.name} ${viewportName} has serious or critical axe violations.`);
    assert.deepEqual(pageErrors, [], `${spec.name} ${viewportName} emitted page errors.`);
    assert.deepEqual(requestFailures, [], `${spec.name} ${viewportName} emitted failed requests.`);
    const expectedMutationCount = width === 390 && (spec.name === "settings" || spec.name === "practice-replays") ? 1 : 0;
    assert.equal(
      interceptedMutations.length,
      expectedMutationCount,
      `${spec.name} ${viewportName} intercepted mutation count must stay exact.`
    );

    await page.screenshot({
      fullPage: false,
      path: join(screenshotDir, `${spec.name}-${viewportName}-viewport.png`)
    });
    if (width === 390 || width === 1440) {
      await page.screenshot({
        fullPage: true,
        path: join(screenshotDir, `${spec.name}-${viewportName}-full.png`)
      });
    }

    return {
      name: `${spec.name}-${viewportName}`,
      path: spec.path,
      width,
      height,
      documentOverflow: metrics.documentOverflow,
      mainLandmarks: metrics.mainLandmarks,
      h1Count: metrics.h1Count,
      undersizedInteractiveCount: metrics.undersized.length,
      textBelow12pxCount: metrics.smallText.length,
      axeSeriousOrCriticalCount: metrics.axeViolations.length,
      pageErrors,
      requestFailures,
      interceptedMutations,
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
      interceptedMutations: proof.flatMap((result) => result.interceptedMutations),
      proof
    }, null, 2)}\n`
  );
} finally {
  await browser.close();
}
