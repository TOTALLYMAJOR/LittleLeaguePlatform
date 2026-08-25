import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");
loadLocalEnv();
const baseUrl = process.env.WORKSPACE_VISUAL_PROOF_BASE_URL
  || process.env.QA_PROOF_BASE_URL
  || "http://127.0.0.1:3020";
const outputDir = process.env.WORKSPACE_VISUAL_PROOF_DIR
  || "output/playwright/lp-ux-020-spectrum-theme";
const themeStorageKey = "leaguepilot-color-theme:v1";
const authCookieTtlSeconds = 60 * 60;

const routeSpecs = [
  { role: "admin", path: "/admin", shell: "staff", surfaceFamily: null, enforceAxe: true },
  { role: "coach", path: "/coach", shell: "staff", surfaceFamily: null, enforceAxe: true },
  { role: "parent", path: "/parent", shell: "family", surfaceFamily: "family", enforceAxe: true }
];

const themes = ["light", "dark"];
const viewports = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "desktop-1440", width: 1440, height: 1000 }
];

function loadLocalEnv() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim().replace(/^export\s+/, "");
    const value = trimmed.slice(separator + 1).trim().replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, "$1$2");
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
    process.env.HOME
      ? `${process.env.HOME}/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome`
      : ""
  ];
  return candidates.find((candidate) => candidate && existsSync(candidate));
}

function supabaseProjectRef() {
  return new URL(requireEnv("NEXT_PUBLIC_SUPABASE_URL")).hostname.split(".")[0];
}

async function createRoleSessionCookies(role) {
  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const credentialPrefix = role.toUpperCase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: requireEnv(`DEMO_${credentialPrefix}_EMAIL`),
    password: requireEnv(`DEMO_${credentialPrefix}_PASSWORD`)
  });
  if (error || !data.session) {
    throw new Error(error?.message ?? `${role} demo session was not returned.`);
  }

  const target = new URL(baseUrl);
  const cookieOptions = {
    domain: target.hostname,
    path: "/",
    httpOnly: false,
    secure: target.protocol === "https:",
    sameSite: "Lax"
  };
  const encodedSession = Buffer.from(JSON.stringify(data.session), "utf8").toString("base64url");
  return [
    {
      ...cookieOptions,
      name: `sb-${supabaseProjectRef()}-auth-token`,
      value: `base64-${encodedSession}`,
      expires: Math.floor(Date.now() / 1000) + authCookieTtlSeconds
    },
    {
      ...cookieOptions,
      name: "leaguepilot-active-role",
      value: role,
      expires: Math.floor(Date.now() / 1000) + authCookieTtlSeconds
    }
  ];
}

async function setExplicitTheme(context, theme) {
  await context.addInitScript(({ storageKey, selectedTheme }) => {
    window.localStorage.setItem(storageKey, selectedTheme);
  }, { storageKey: themeStorageKey, selectedTheme: theme });
}

function recordReadOnlyFailures(page) {
  const pageErrors = [];
  const requestFailures = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "request failed";
    if (!failure.toLowerCase().includes("abort")) {
      requestFailures.push(`${request.method()} ${request.url()} ${failure}`);
    }
  });
  return { pageErrors, requestFailures };
}

async function waitForWorkspace(page, spec, theme) {
  await page.goto(`${baseUrl}${spec.path}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.locator("[data-product-shell]").waitFor({ state: "visible", timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  const appliedTheme = await page.evaluate(({ storageKey, selectedTheme }) => {
    window.localStorage.setItem(storageKey, selectedTheme);
    document.documentElement.dataset.theme = selectedTheme;
    document.documentElement.style.colorScheme = selectedTheme;
    window.dispatchEvent(new Event("leaguepilot:color-theme-change"));
    return document.documentElement.dataset.theme ?? null;
  }, { storageKey: themeStorageKey, selectedTheme: theme });
  assert.equal(appliedTheme, theme, `${spec.path} did not accept the explicit ${theme} theme.`);
}

async function inspectWorkspace(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const shell = document.querySelector("[data-product-shell]");
    return {
      theme: root.dataset.theme ?? null,
      colorScheme: getComputedStyle(root).colorScheme,
      shell: shell?.getAttribute("data-product-shell") ?? null,
      surfaceFamily: shell?.getAttribute("data-surface-family") ?? null,
      routeAuthority: shell?.getAttribute("data-route-authority") ?? null,
      resolvedRole: shell?.getAttribute("data-resolved-role") ?? null,
      dataScopeRole: shell?.getAttribute("data-data-scope-role") ?? null,
      documentWidth: root.scrollWidth,
      viewportWidth: root.clientWidth,
      horizontalOverflow: root.scrollWidth > root.clientWidth
    };
  });
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
        nodes: violation.nodes.map((node) => ({
          target: node.target,
          html: node.html,
          failureSummary: node.failureSummary
        }))
      }));
  });
}

async function verifyShellNavigationFocus(page, spec, viewport) {
  const selector = spec.shell === "family"
    ? viewport.width < 900 ? ".mobile-tabbar a" : ".family-primary-link"
    : viewport.width < 900 ? ".mobile-tabbar a" : "#app-primary-nav a";
  const target = page.locator(selector).filter({ visible: true }).first();
  await target.waitFor({ state: "visible", timeout: 20_000 });
  await page.keyboard.press("Tab");
  await target.focus();
  const focus = await target.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      tagName: element.tagName,
      label: element.getAttribute("aria-label") || element.textContent?.trim() || null,
      visible: rect.width > 0 && rect.height > 0,
      focusVisible: element.matches(":focus-visible"),
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth
    };
  });
  assert.equal(focus.tagName, "A", `${spec.path} shell navigation target is not a link.`);
  assert.equal(focus.visible, true, `${spec.path} shell navigation target is not visible.`);
  assert.equal(focus.focusVisible, true, `${spec.path} shell navigation focus is not keyboard-visible.`);
  assert.notEqual(focus.outlineStyle, "none", `${spec.path} shell navigation focus has no outline.`);
  assert.notEqual(focus.outlineWidth, "0px", `${spec.path} shell navigation focus has no outline width.`);
  return focus;
}

function assertWorkspaceContract({ spec, theme, viewport, metrics, axeViolations, pageErrors, requestFailures }) {
  const label = `${spec.path} ${theme} ${viewport.name}`;
  assert.equal(metrics.theme, theme, `${label} did not retain the explicit theme.`);
  assert.equal(metrics.colorScheme, theme, `${label} did not expose the expected color scheme.`);
  assert.equal(metrics.shell, spec.shell, `${label} rendered the wrong shell family.`);
  assert.equal(metrics.surfaceFamily, spec.surfaceFamily, `${label} rendered the wrong surface family.`);
  assert.equal(metrics.resolvedRole, spec.role, `${label} resolved the wrong role.`);
  assert.equal(metrics.dataScopeRole, spec.role, `${label} resolved the wrong data-scope role.`);
  assert.equal(metrics.horizontalOverflow, false, `${label} has horizontal overflow.`);
  assert.equal(metrics.documentWidth, metrics.viewportWidth, `${label} document width exceeds its viewport.`);
  assert.deepEqual(pageErrors, [], `${label} emitted page errors.`);
  assert.deepEqual(requestFailures, [], `${label} had unexpected non-aborted request failures.`);
  if (spec.enforceAxe) {
    assert.deepEqual(axeViolations, [], `${label} has serious or critical axe findings.`);
  }
}

async function main() {
  mkdirSync(outputDir, { recursive: true });

  const sessionCookies = new Map();
  for (const spec of routeSpecs) {
    sessionCookies.set(spec.role, await createRoleSessionCookies(spec.role));
  }

  const executablePath = chromiumExecutablePath();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {})
  });
  const proof = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    proofBoundary: "Authenticated local browser rendering with Supabase session and scoped reads; no application-data mutations, delivery/payment provider actions, or deployment. Axe is a blocking gate for the redesigned staff and Family shells.",
    routes: routeSpecs.map(({ role, path, shell, surfaceFamily, enforceAxe }) => ({ role, path, shell, surfaceFamily, enforceAxe })),
    themes,
    viewports,
    results: []
  };

  try {
    for (const spec of routeSpecs) {
      for (const theme of themes) {
        for (const viewport of viewports) {
          const context = await browser.newContext({
            colorScheme: theme,
            viewport: { width: viewport.width, height: viewport.height }
          });
          await context.addCookies(sessionCookies.get(spec.role));
          await setExplicitTheme(context, theme);
          const page = await context.newPage();
          const { pageErrors, requestFailures } = recordReadOnlyFailures(page);

          try {
            await waitForWorkspace(page, spec, theme);
            const metrics = await inspectWorkspace(page);
            const axeViolations = await runAxe(page);
            const keyboardFocus = await verifyShellNavigationFocus(page, spec, viewport);
            assertWorkspaceContract({
              spec,
              theme,
              viewport,
              metrics,
              axeViolations,
              pageErrors,
              requestFailures
            });

            await page.evaluate(() => {
              if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
              window.scrollTo({ top: 0, left: 0, behavior: "instant" });
            });
            await page.waitForTimeout(250);
            const screenshotPath = join(
              outputDir,
              `${spec.role}-${theme}-${viewport.name}.png`
            );
            await page.screenshot({ path: screenshotPath, fullPage: false, caret: "initial" });
            proof.results.push({
              route: spec.path,
              role: spec.role,
              theme,
              viewport,
              metrics,
              keyboardFocus,
              axeSeriousOrCritical: axeViolations,
              pageErrors,
              requestFailures,
              screenshotPath
            });
            console.log(`proved ${spec.path} in ${theme} mode at ${viewport.width}px`);
          } finally {
            await context.close();
          }
        }
      }
    }
  } finally {
    await browser.close();
  }

  const proofPath = join(outputDir, "proof.json");
  writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`);
  console.log(`Workspace visual proof passed with ${proof.results.length} results: ${proofPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
