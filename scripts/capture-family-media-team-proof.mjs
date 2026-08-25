import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");
const { build: buildWithEsbuild } = require(join(process.cwd(), "node_modules/vite/node_modules/esbuild"));
const baseUrl = process.env.QA_PROOF_BASE_URL || "http://localhost:3020";
const outputDir = process.env.FAMILY_MEDIA_TEAM_PROOF_DIR || "output/playwright/lp-ux-017-family-media-team";
const storageKey = "leaguepilot-color-theme:v1";
const AUTH_COOKIE_CHUNK_SIZE = 3180;
const AUTH_COOKIE_TTL_SECONDS = 60 * 60;

const viewports = [
  { name: "mobile-320", width: 320, height: 844 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1024", width: 1024, height: 900 },
  { name: "desktop-1440", width: 1440, height: 1000 }
];

const routes = [
  {
    name: "parent-photos",
    path: "/parent/photos",
    selector: ".family-photos-page",
    activeTab: "More"
  },
  {
    name: "team-portal-parent",
    path: "/team-portal",
    selector: ".family-team-page",
    activeTab: "Family"
  }
];

function loadLocalEnv() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^"|"$/g, "");
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

function splitCookieValueIntoChunks(value) {
  let encodedValue = encodeURIComponent(value);
  if (encodedValue.length <= AUTH_COOKIE_CHUNK_SIZE) return [{ suffix: null, value }];

  const chunks = [];
  while (encodedValue.length > 0) {
    let encodedHead = encodedValue.slice(0, AUTH_COOKIE_CHUNK_SIZE);
    const lastEscape = encodedHead.lastIndexOf("%");
    if (lastEscape > AUTH_COOKIE_CHUNK_SIZE - 3) encodedHead = encodedHead.slice(0, lastEscape);
    let decodedHead = "";
    while (encodedHead.length > 0) {
      try {
        decodedHead = decodeURIComponent(encodedHead);
        break;
      } catch (error) {
        if (error instanceof URIError && encodedHead.at(-3) === "%" && encodedHead.length > 3) {
          encodedHead = encodedHead.slice(0, -3);
          continue;
        }
        throw error;
      }
    }
    chunks.push(decodedHead);
    encodedValue = encodedValue.slice(encodedHead.length);
  }
  return chunks.map((valuePart, index) => ({ suffix: index, value: valuePart }));
}

async function createParentSessionCookies() {
  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data, error } = await supabase.auth.signInWithPassword({
    email: requireEnv("DEMO_PARENT_EMAIL"),
    password: requireEnv("DEMO_PARENT_PASSWORD")
  });
  if (error || !data.session) throw new Error(error?.message ?? "Parent demo session was not returned.");

  const hostname = new URL(baseUrl).hostname;
  const expires = Math.floor(Date.now() / 1000) + AUTH_COOKIE_TTL_SECONDS;
  const options = {
    domain: hostname,
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
    expires
  };
  const encodedSession = Buffer.from(JSON.stringify(data.session), "utf8").toString("base64url");
  const cookieName = `sb-${supabaseProjectRef()}-auth-token`;
  const authCookies = splitCookieValueIntoChunks(`base64-${encodedSession}`).map((chunk) => ({
    ...options,
    name: chunk.suffix === null ? cookieName : `${cookieName}.${chunk.suffix}`,
    value: chunk.value
  }));
  return [
    ...authCookies,
    { ...options, name: "leaguepilot-active-role", value: "parent" }
  ];
}

async function createContext(browser, cookies, { theme, viewport, forcedColors = "none" }) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    colorScheme: theme === "light" ? "dark" : "light",
    forcedColors
  });
  await context.addCookies(cookies);
  await context.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, value);
  }, { key: storageKey, value: theme });
  return context;
}

function attachErrorCollection(page) {
  const pageErrors = [];
  const requestFailures = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "unknown";
    if (!failure.includes("ERR_ABORTED")) {
      requestFailures.push({ url: request.url(), failure });
    }
  });
  return { pageErrors, requestFailures };
}

async function openSettled(page, route) {
  await page.goto(`${baseUrl}${route.path}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.locator(route.selector).waitFor({ state: "visible", timeout: 30_000 });
  await page.locator(".theme-toggle").first().waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(250);
}

async function runAxe(page) {
  await page.addScriptTag({ path: axePath });
  return page.evaluate(async () => {
    const report = await window.axe.run(document, {
      resultTypes: ["violations"],
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]
      }
    });
    return report.violations
      .filter((violation) => violation.impact === "critical" || violation.impact === "serious")
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        nodes: violation.nodes.map((node) => node.target)
      }));
  });
}

async function inspectSurface(page, route, theme, viewport, { expectExactColorScheme = true } = {}) {
  const metrics = await page.evaluate(({ selector, activeTab }) => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const surface = document.querySelector(selector);
    const shell = document.querySelector("[data-product-shell]");
    const controls = [...document.querySelectorAll(`${selector} a, ${selector} button:not(:disabled)`)]
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label: element.getAttribute("aria-label") || element.textContent?.trim() || element.tagName,
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
      });
    const containmentSelectors = [
      ".family-photo-trust",
      ".family-photo-card",
      ".family-photo-actions",
      ".family-team-card",
      ".family-team-card header",
      ".family-team-card dd",
      ".family-team-card nav"
    ];
    const containmentFailures = [...document.querySelectorAll(containmentSelectors.join(","))]
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          selector: element.className?.toString() || element.tagName,
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          left: Math.round(rect.left),
          right: Math.round(rect.right)
        };
      })
      .filter((item) => (
        item.scrollWidth > item.clientWidth + 1 || item.left < -1 || item.right > document.documentElement.clientWidth + 1
      ));
    const activeTabs = [...document.querySelectorAll("a[aria-current='page']")]
      .filter(visible)
      .map((element) => element.textContent?.trim() ?? "");
    const text = surface?.textContent ?? "";
    return {
      theme: document.documentElement.dataset.theme ?? null,
      colorScheme: getComputedStyle(document.documentElement).colorScheme,
      shell: shell?.getAttribute("data-product-shell") ?? null,
      surfaceFamily: shell?.getAttribute("data-surface-family") ?? null,
      resolvedRole: shell?.getAttribute("data-resolved-role") ?? null,
      dataScopeRole: shell?.getAttribute("data-data-scope-role") ?? null,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      undersizedControls: controls.filter((control) => control.width < 44 || control.height < 44),
      containmentFailures,
      activeTabs,
      hasExpectedActiveTab: activeTabs.some((label) => label.includes(activeTab)),
      leakedStaffControls: ["Save portal branding", "Acting user", "Portal colors and mascot"]
        .filter((label) => text.includes(label)),
      leakedEmail: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text),
      leakedUuid: /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i.test(text)
    };
  }, { selector: route.selector, activeTab: route.activeTab });

  assert.equal(metrics.theme, theme, `${route.path} did not retain explicit ${theme} mode at ${viewport.width}px.`);
  if (expectExactColorScheme) {
    assert.equal(metrics.colorScheme, theme, `${route.path} did not expose ${theme} color-scheme at ${viewport.width}px.`);
  }
  assert.equal(metrics.shell, "family", `${route.path} did not retain the Family shell.`);
  assert.equal(metrics.surfaceFamily, "family", `${route.path} lost its Family surface marker.`);
  assert.equal(metrics.resolvedRole, "parent", `${route.path} resolved the wrong role.`);
  assert.equal(metrics.dataScopeRole, "parent", `${route.path} resolved the wrong data scope.`);
  assert.equal(metrics.documentWidth, metrics.viewportWidth, `${route.path} overflowed at ${viewport.width}px.`);
  assert.deepEqual(metrics.undersizedControls, [], `${route.path} has undersized controls at ${viewport.width}px.`);
  assert.deepEqual(metrics.containmentFailures, [], `${route.path} has clipped or overflowing content at ${viewport.width}px.`);
  assert.equal(metrics.hasExpectedActiveTab, true, `${route.path} did not mark ${route.activeTab} active.`);
  assert.deepEqual(metrics.leakedStaffControls, [], `${route.path} exposed staff controls to a parent.`);
  assert.equal(metrics.leakedEmail, false, `${route.path} exposed an email address.`);
  assert.equal(metrics.leakedUuid, false, `${route.path} exposed a raw identifier.`);
  return metrics;
}

async function verifyFocus(page, route) {
  const target = page.locator(`${route.selector} a, ${route.selector} button:not(:disabled)`).filter({ visible: true }).first();
  await target.focus();
  const focus = await target.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      active: document.activeElement === element,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow
    };
  });
  const hasIndicator = (
    focus.outlineStyle !== "none" && Number.parseFloat(focus.outlineWidth) >= 2
  ) || focus.boxShadow !== "none";
  assert.equal(focus.active, true, `${route.path} could not focus its first action.`);
  assert.equal(hasIndicator, true, `${route.path} did not paint a visible focus indicator.`);
  return focus;
}

async function runResponsiveMatrix(browser, cookies, proof) {
  for (const theme of ["light", "dark"]) {
    for (const viewport of viewports) {
      for (const route of routes) {
        const context = await createContext(browser, cookies, { theme, viewport });
        const page = await context.newPage();
        const errors = attachErrorCollection(page);
        try {
          await openSettled(page, route);
          const metrics = await inspectSurface(page, route, theme, viewport);
          const axeViolations = await runAxe(page);
          const focus = await verifyFocus(page, route);
          assert.deepEqual(axeViolations, [], `${route.path} has serious or critical axe violations.`);
          assert.deepEqual(errors.pageErrors, [], `${route.path} emitted page errors.`);
          assert.deepEqual(errors.requestFailures, [], `${route.path} emitted request failures.`);
          const screenshotPath = join(outputDir, `${route.name}-${viewport.name}-${theme}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: true });
          proof.results.push({
            kind: "responsive",
            route: route.path,
            theme,
            viewport,
            metrics,
            axeViolations,
            focus,
            ...errors,
            screenshotPath
          });
          console.log(`proved ${route.path} ${theme} at ${viewport.width}px`);
        } finally {
          await context.close();
        }
      }
    }
  }
}

async function runForcedColors(browser, cookies, proof) {
  for (const viewport of viewports.filter((item) => item.width === 390 || item.width === 1440)) {
    for (const route of routes) {
      const context = await createContext(browser, cookies, { theme: "light", viewport, forcedColors: "active" });
      const page = await context.newPage();
      const errors = attachErrorCollection(page);
      try {
        await openSettled(page, route);
        const metrics = await inspectSurface(page, route, "light", viewport, { expectExactColorScheme: false });
        const focus = await verifyFocus(page, route);
        assert.deepEqual(errors.pageErrors, [], `${route.path} emitted forced-colors page errors.`);
        assert.deepEqual(errors.requestFailures, [], `${route.path} emitted forced-colors request failures.`);
        const screenshotPath = join(outputDir, `${route.name}-${viewport.name}-forced-colors.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        proof.results.push({
          kind: "forced-colors",
          route: route.path,
          viewport,
          metrics,
          focus,
          ...errors,
          screenshotPath
        });
      } finally {
        await context.close();
      }
    }
  }
}

async function createFamilyPhotosFixtureBundle() {
  const source = `
    import React from "react";
    import { createRoot } from "react-dom/client";
    import { FamilyPhotos } from "./components/family-photos";

    const photos = [
      {
        id: "proof-media-opening-day",
        teamId: "proof-team-tigers",
        teamName: "Tiny Tigers",
        title: "Opening day",
        type: "google_photos",
        url: "https://example.com/released/opening-day",
        moderationStatus: "approved",
        visibility: "team",
        reportCount: 0,
        createdAt: "2026-04-04T12:00:00.000Z"
      },
      {
        id: "proof-media-warmup",
        teamId: "proof-team-tigers",
        teamName: "Tiny Tigers",
        title: "Team warmup",
        type: "google_photos",
        url: "https://example.com/released/team-warmup",
        moderationStatus: "approved",
        visibility: "team",
        reportCount: 0,
        createdAt: "2026-04-05T12:00:00.000Z"
      }
    ];

    createRoot(document.getElementById("root")).render(
      <FamilyPhotos photos={photos} childLabels={["Mason T."]} isCurrent />
    );
    window.__familyMediaFixtureReady = true;
  `;
  const result = await buildWithEsbuild({
    stdin: {
      contents: source,
      loader: "tsx",
      resolveDir: process.cwd(),
      sourcefile: "family-media-proof-fixture.tsx"
    },
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2022",
    write: false,
    tsconfig: "tsconfig.json",
    define: {
      "process.env.NEXT_PUBLIC_SUPABASE_URL": "undefined",
      "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": "undefined",
      "process.env.NEXT_PUBLIC_APP_URL": "undefined"
    }
  });
  return result.outputFiles[0].text;
}

async function mountFamilyPhotosFixture(page, fixtureBundle) {
  await page.setContent(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <style>
          :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
          body { margin: 0; padding: 24px; }
          .page, section, article, article > div { display: grid; gap: 12px; }
          .family-photo-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .family-photo-card { border: 1px solid currentColor; padding: 16px; }
          .family-photo-actions { display: flex; flex-wrap: wrap; gap: 8px; }
          a, button { min-width: 44px; min-height: 44px; }
          @media (max-width: 640px) { .family-photo-grid { grid-template-columns: 1fr; } }
        </style>
      </head>
      <body><div id="root"></div></body>
    </html>
  `);
  await page.evaluate((bundle) => {
    const script = document.createElement("script");
    script.textContent = bundle;
    document.body.append(script);
  }, fixtureBundle);
  await page.waitForFunction(() => window.__familyMediaFixtureReady === true);
  await page.locator(".family-photos-page").waitFor({ state: "visible" });
}

async function runPhotoInteraction(browser, cookies, proof, fixtureBundle, { outcome, theme, viewport }) {
  const route = routes[0];
  const context = await createContext(browser, cookies, { theme, viewport });
  const page = await context.newPage();
  const errors = attachErrorCollection(page);
  let requestBody = null;
  await page.route("**/api/media/report", async (requestRoute) => {
    requestBody = requestRoute.request().postDataJSON();
    await requestRoute.fulfill({
      status: outcome === "success" ? 200 : 503,
      contentType: "application/json",
      body: JSON.stringify(outcome === "success"
        ? { ok: true, message: "Report saved for staff review." }
        : { ok: false, message: "Staff review could not be requested. Try again." })
    });
  });

  try {
    await openSettled(page, route);
    let cards = page.locator(".family-photo-card");
    let beforeIds = await cards.evaluateAll((items) => items.map((item) => item.getAttribute("data-media-id")));
    const fixtureMode = beforeIds.length === 0;
    if (fixtureMode) {
      await mountFamilyPhotosFixture(page, fixtureBundle);
      cards = page.locator(".family-photo-card");
      beforeIds = await cards.evaluateAll((items) => items.map((item) => item.getAttribute("data-media-id")));
    }
    assert.ok(beforeIds.length > 0, "The Family Photos interaction fixture did not render released photos.");
    assert.ok(beforeIds.every(Boolean), "Every photo card must expose a stable proof-only media marker.");
    const firstCard = cards.first();
    const button = firstCard.locator("button");
    const accessibleName = await button.getAttribute("aria-label");
    assert.ok(accessibleName?.startsWith("Report ") && accessibleName.endsWith(" for staff review"));
    await button.click();

    if (outcome === "success") {
      const status = page.getByRole("status");
      await status.waitFor({ state: "visible" });
      assert.equal(await status.textContent(), "Report saved for staff review.");
      await page.waitForFunction((count) => document.querySelectorAll(".family-photo-card").length === count - 1, beforeIds.length);
    } else {
      const alert = page.getByRole("alert");
      await alert.waitFor({ state: "visible" });
      assert.equal(await alert.textContent(), "Staff review could not be requested. Try again.");
      await button.waitFor({ state: "visible" });
      assert.equal(await button.isEnabled(), true, "A failed report must remain retryable.");
    }

    const afterIds = await cards.evaluateAll((items) => items.map((item) => item.getAttribute("data-media-id")));
    if (outcome === "success") {
      assert.deepEqual(afterIds, beforeIds.slice(1), "Success must remove only the reported photo.");
    } else {
      assert.deepEqual(afterIds, beforeIds, "Failure must retain every photo.");
    }
    assert.equal(requestBody?.mediaItemId, beforeIds[0]);
    assert.equal(requestBody?.reason, "Parent requested a staff review from Family Photos.");
    assert.deepEqual(errors.pageErrors, []);
    assert.deepEqual(errors.requestFailures, []);
    proof.results.push({
      kind: "interaction",
      route: route.path,
      outcome,
      theme,
      viewport,
      beforeIds,
      afterIds,
      fixtureMode,
      requestIntercepted: true,
      providerOrDatabaseMutation: false,
      ...errors
    });
  } finally {
    await context.close();
  }
}

function writeProof(proof) {
  mkdirSync(outputDir, { recursive: true });
  proof.completedAt = new Date().toISOString();
  proof.summary = {
    total: proof.results.length,
    responsive: proof.results.filter((result) => result.kind === "responsive").length,
    forcedColors: proof.results.filter((result) => result.kind === "forced-colors").length,
    interactions: proof.results.filter((result) => result.kind === "interaction").length,
    status: proof.error ? "failed" : "passed"
  };
  writeFileSync(join(outputDir, "proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
}

async function main() {
  loadLocalEnv();
  mkdirSync(outputDir, { recursive: true });
  const proof = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    authority: "authenticated parent session with server-derived Family scope",
    mutationBoundary: "media report responses are intercepted locally; no provider or database mutation",
    results: []
  };
  const browser = await chromium.launch({
    headless: true,
    ...(chromiumExecutablePath() ? { executablePath: chromiumExecutablePath() } : {})
  });

  try {
    const cookies = await createParentSessionCookies();
    const fixtureBundle = await createFamilyPhotosFixtureBundle();
    await runResponsiveMatrix(browser, cookies, proof);
    await runForcedColors(browser, cookies, proof);
    await runPhotoInteraction(browser, cookies, proof, fixtureBundle, {
      outcome: "success",
      theme: "light",
      viewport: viewports[1]
    });
    await runPhotoInteraction(browser, cookies, proof, fixtureBundle, {
      outcome: "failure",
      theme: "dark",
      viewport: viewports[4]
    });
  } catch (error) {
    proof.error = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    writeProof(proof);
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
