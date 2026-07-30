import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");
const baseUrl = process.env.QA_PROOF_BASE_URL || "http://127.0.0.1:3020";
const outputDir = process.env.FAMILY_SHELL_PROOF_DIR || "output/playwright/family-shell";
const envFile = ".env.local";
const expectedFamilyTabs = ["Home", "Schedule", "Messages", "Family", "More"];

const viewports = [
  ["mobile-320", 320, 844],
  ["mobile-390", 390, 844],
  ["tablet-768", 768, 1024],
  ["desktop-1024", 1024, 900],
  ["desktop-1440", 1440, 1000]
];

const routeSpecs = [
  { role: "parent", name: "parent-home", path: "/parent", shell: "family", activeTab: "Home" },
  { role: "parent", name: "parent-schedule", path: "/parent/schedule", shell: "family", activeTab: "Schedule" },
  { role: "parent", name: "parent-messages", path: "/parent/messages", shell: "family", activeTab: "Messages" },
  { role: "parent", name: "parent-family", path: "/parent/family-access", shell: "family", activeTab: "Family" },
  { role: "parent", name: "parent-more", path: "/parent/more", shell: "family", activeTab: "More" },
  { role: "parent", name: "account", path: "/account", shell: "family", activeTab: "More", expectedRole: "parent", expectedDataScopeRole: null },
  { role: "parent", name: "team-chat", path: "/team-chat", shell: "family", activeTab: "Messages" },
  { role: "parent", name: "team-portal-parent", path: "/team-portal", shell: "family", activeTab: "Family" },
  { role: "coach", name: "team-chat-coach", path: "/team-chat", shell: "staff", expectedRole: "coach", expectedDataScopeRole: "coach" },
  { role: "coach", name: "team-portal-coach", path: "/team-portal", shell: "staff", expectedRole: "coach", expectedDataScopeRole: "coach" },
  { role: "admin", name: "team-chat-admin", path: "/team-chat", shell: "staff", expectedRole: "admin", expectedDataScopeRole: "admin" },
  { role: "admin", name: "team-portal-admin", path: "/team-portal", shell: "staff", expectedRole: "admin", expectedDataScopeRole: "admin" },
  { role: "parent", name: "access-status-parent", path: "/access/status", shell: "neutral", expectedRole: null, expectedDataScopeRole: null },
  { role: "parent", name: "invite-accept-parent", path: "/invite/accept", shell: "neutral", expectedRole: null, expectedDataScopeRole: null },
  { role: "signedOut", name: "parent-more-signed-out", path: "/parent/more", shell: "public", expectedRole: null, expectedDataScopeRole: null },
  { role: "coach", name: "coach-home", path: "/coach", shell: "staff", expectedRole: "coach", expectedDataScopeRole: "coach" }
];

const roleCredentials = {
  parent: ["DEMO_PARENT_EMAIL", "DEMO_PARENT_PASSWORD"],
  coach: ["DEMO_COACH_EMAIL", "DEMO_COACH_PASSWORD"],
  admin: ["DEMO_ADMIN_EMAIL", "DEMO_ADMIN_PASSWORD"]
};

function loadLocalEnv() {
  if (!existsSync(envFile)) return;
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
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

async function addRoleSession(context, role) {
  if (role === "signedOut") return;
  const [emailKey, passwordKey] = roleCredentials[role];
  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data, error } = await supabase.auth.signInWithPassword({
    email: requireEnv(emailKey),
    password: requireEnv(passwordKey)
  });
  if (error || !data.session) throw new Error(error?.message ?? `${role} demo session was not returned.`);

  const encodedSession = Buffer.from(JSON.stringify(data.session), "utf8").toString("base64url");
  await context.addCookies([{
    name: `sb-${supabaseProjectRef()}-auth-token`,
    value: `base64-${encodedSession}`,
    domain: new URL(baseUrl).hostname,
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
    expires: Math.floor(Date.now() / 1000) + 60 * 60
  }]);
  if (role === "parent" || role === "coach" || role === "admin") {
    await context.addCookies([{
      name: "leaguepilot-active-role",
      value: role,
      domain: new URL(baseUrl).hostname,
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + 60 * 60
    }]);
  }
}

async function inspectFamilyShell(page, spec, width) {
  const metrics = await page.evaluate(({ expectedFamilyTabs, expectedShell }) => {
    const shell = document.querySelector("[data-product-shell]");
    const publicShell = document.querySelector(".public-app-shell");
    const mobileNav = document.querySelector(".mobile-tabbar");
    const desktopLinks = [...document.querySelectorAll(".family-primary-link")];
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const undersizedShellControls = [
      ...document.querySelectorAll(".parent-weekly-header a, .parent-weekly-header button, .mobile-tabbar a")
    ]
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label: element.getAttribute("aria-label") || element.textContent?.trim() || element.tagName,
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
      })
      .filter((control) => control.width < 44 || control.height < 44);

    return {
      shell: shell?.getAttribute("data-product-shell") ?? null,
      surfaceFamily: shell?.getAttribute("data-surface-family") ?? null,
      routeAuthority: shell?.getAttribute("data-route-authority") ?? null,
      resolvedRole: shell?.getAttribute("data-resolved-role") ?? null,
      dataScopeRole: shell?.getAttribute("data-data-scope-role") ?? null,
      publicShellVisible: publicShell ? visible(publicShell) : false,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      contextBarVisible: [...document.querySelectorAll(".context-bar, .verified-context-bar")].some(visible),
      sidebarVideoVisible: [...document.querySelectorAll(".sidebar-video-backdrop video")].some(visible),
      familyContextVisible: [...document.querySelectorAll(".family-shell-context")].some(visible),
      mobileLabels: mobileNav
        ? [...mobileNav.querySelectorAll("a")].map((link) => link.textContent?.trim() ?? "")
        : [],
      mobileNavVisible: mobileNav ? visible(mobileNav) : false,
      desktopNavVisible: desktopLinks.some(visible),
      activeTabs: [
        ...document.querySelectorAll(".mobile-tabbar a[aria-current='page'], .family-primary-link[aria-current='page']")
      ].filter(visible).map((link) => link.textContent?.trim() ?? ""),
      colorScheme: shell ? getComputedStyle(shell).colorScheme : null,
      backgroundColor: shell ? getComputedStyle(shell).backgroundColor : null,
      undersizedShellControls,
      expectedFamilyTabs,
      expectedShell
    };
  }, { expectedFamilyTabs, expectedShell: spec.shell });

  assert.equal(metrics.documentWidth, metrics.viewportWidth, `${spec.path} overflows at ${width}px.`);
  assert.deepEqual(metrics.undersizedShellControls, [], `${spec.path} has undersized shell controls at ${width}px.`);
  const expectedRole = Object.hasOwn(spec, "expectedRole")
    ? spec.expectedRole
    : spec.shell === "family" ? "parent" : metrics.resolvedRole;
  const expectedDataScopeRole = Object.hasOwn(spec, "expectedDataScopeRole")
    ? spec.expectedDataScopeRole
    : spec.shell === "family" ? "parent" : metrics.dataScopeRole;
  assert.equal(metrics.resolvedRole, expectedRole, `${spec.path} resolved role drifted at ${width}px.`);
  assert.equal(metrics.dataScopeRole, expectedDataScopeRole, `${spec.path} data-scope role drifted at ${width}px.`);

  if (spec.shell === "family") {
    assert.equal(metrics.shell, "family", `${spec.path} did not render the Family shell.`);
    assert.equal(metrics.surfaceFamily, "family", `${spec.path} is missing the Family surface attribute.`);
    assert.equal(metrics.contextBarVisible, false, `${spec.path} rendered duplicate context chrome.`);
    assert.equal(metrics.sidebarVideoVisible, false, `${spec.path} rendered the staff sidebar video.`);
    assert.equal(metrics.familyContextVisible, true, `${spec.path} hid verified family context.`);
    assert.equal(metrics.colorScheme, "light", `${spec.path} did not lock the Family shell to light.`);
    assert.equal(metrics.backgroundColor, "rgb(253, 248, 241)", `${spec.path} did not retain the Family canvas in dark device mode.`);
    assert.deepEqual(metrics.mobileLabels, expectedFamilyTabs, `${spec.path} mobile tabs drifted from topology.`);
    assert.equal(metrics.mobileNavVisible, width < 900, `${spec.path} mobile tab visibility is wrong at ${width}px.`);
    assert.equal(metrics.desktopNavVisible, width >= 900, `${spec.path} desktop nav visibility is wrong at ${width}px.`);
    assert.ok(metrics.activeTabs.some((label) => label.includes(spec.activeTab)), `${spec.path} did not mark ${spec.activeTab} active.`);
  } else if (spec.shell === "staff") {
    assert.equal(metrics.shell, "staff", `${spec.path} did not retain the staff shell.`);
    assert.equal(metrics.surfaceFamily, null, `${spec.path} leaked the Family surface attribute.`);
    assert.equal(metrics.familyContextVisible, false, `${spec.path} leaked Family context chrome.`);
    if (width >= 900) assert.equal(metrics.sidebarVideoVisible, true, `${spec.path} lost the staff sidebar video.`);
  } else if (spec.shell === "neutral") {
    assert.equal(metrics.shell, "neutral", `${spec.path} did not render neutral chrome.`);
    assert.equal(metrics.surfaceFamily, null, `${spec.path} leaked the Family surface attribute.`);
    assert.equal(metrics.familyContextVisible, false, `${spec.path} leaked Family context chrome.`);
    assert.equal(metrics.dataScopeRole, null, `${spec.path} leaked a data-scope role.`);
  } else {
    assert.equal(metrics.publicShellVisible, true, `${spec.path} did not render the public signed-out shell.`);
    assert.equal(metrics.shell, null, `${spec.path} should not expose private shell markers while signed out.`);
  }

  return metrics;
}

async function runAxe(page, spec, viewportName) {
  await page.addScriptTag({ path: axePath });
  const result = await page.evaluate(async () => {
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
  assert.deepEqual(result, [], `${spec.path} ${viewportName} has critical or serious axe violations.`);
  return result;
}

async function verifyKeyboardFocus(page, spec, width) {
  const selector = spec.shell === "public"
    ? ".public-nav a"
    : spec.shell === "neutral"
      ? ".context-back, #main-content a[href], #main-content button:not(:disabled)"
    : spec.shell === "family"
    ? width < 900
      ? ".mobile-tabbar a"
      : ".family-primary-link"
    : width < 900
      ? ".mobile-tabbar a"
      : "#app-primary-nav a";
  const target = page.locator(selector).filter({ visible: true }).first();
  await target.focus();
  const focus = await target.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      tagName: element.tagName,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth
    };
  });
  assert.ok(["A", "BUTTON"].includes(focus.tagName), `${spec.path} shell destination is not keyboard-focusable.`);
  assert.notEqual(focus.outlineStyle, "none", `${spec.path} focused shell destination has no visible outline.`);
  assert.notEqual(focus.outlineWidth, "0px", `${spec.path} focused shell destination has no visible outline width.`);
  return focus;
}

async function verifyAccountSignOut(page, spec) {
  if (spec.path !== "/account") return undefined;
  const signOut = page.getByRole("button", { name: /sign out/i });
  await signOut.focus();
  const focus = await signOut.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      tagName: element.tagName,
      visible: rect.width > 0 && rect.height > 0,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth
    };
  });
  assert.equal(focus.tagName, "BUTTON", "Account sign out is not a keyboard-focusable button.");
  assert.equal(focus.visible, true, "Account sign out is not visible.");
  assert.notEqual(focus.outlineStyle, "none", "Account sign out focused state has no visible outline.");
  assert.notEqual(focus.outlineWidth, "0px", "Account sign out focused state has no visible outline width.");
  return focus;
}

async function captureInitialRender(browser, spec, viewportName, width, height) {
  const context = await browser.newContext({ colorScheme: "dark", javaScriptEnabled: false });
  await addRoleSession(context, spec.role);
  const page = await context.newPage();
  try {
    await page.setViewportSize({ width, height });
    await page.goto(`${baseUrl}${spec.path}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    return await inspectFamilyShell(page, spec, width);
  } finally {
    await context.close();
  }
}

async function main() {
  loadLocalEnv();
  mkdirSync(outputDir, { recursive: true });
  const executablePath = chromiumExecutablePath();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {})
  });
  const proof = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    colorScheme: "dark",
    results: []
  };

  try {
    for (const spec of routeSpecs) {
      const context = await browser.newContext({ colorScheme: "dark" });
      await addRoleSession(context, spec.role);
      const page = await context.newPage();
      const pageErrors = [];
      const requestFailures = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("requestfailed", (request) => {
        const failure = request.failure()?.errorText ?? "request failed";
        if (failure !== "net::ERR_ABORTED") requestFailures.push(`${request.method()} ${request.url()} ${failure}`);
      });

      try {
        for (const [viewportName, width, height] of viewports) {
          await page.setViewportSize({ width, height });
          await page.goto(`${baseUrl}${spec.path}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
          if (spec.shell === "public") {
            await page.locator(".public-app-shell").waitFor({ timeout: 20_000 });
          } else {
            await page.locator("[data-product-shell]").waitFor({ timeout: 20_000 });
          }

          const initialMetrics = await captureInitialRender(browser, spec, viewportName, width, height);
          const metrics = await inspectFamilyShell(page, spec, width);
          const axeChecked = spec.shell === "family";
          const axeViolations = axeChecked ? await runAxe(page, spec, viewportName) : [];
          const keyboardFocus = await verifyKeyboardFocus(page, spec, width);
          const accountSignOutFocus = await verifyAccountSignOut(page, spec);
          assert.deepEqual(pageErrors, [], `${spec.path} ${viewportName} emitted browser errors.`);
          assert.deepEqual(requestFailures, [], `${spec.path} ${viewportName} had unexpected failed requests.`);
          assert.equal(initialMetrics.shell, metrics.shell, `${spec.path} ${viewportName} changed shell family during hydration.`);
          assert.equal(initialMetrics.resolvedRole, metrics.resolvedRole, `${spec.path} ${viewportName} changed resolved role during hydration.`);
          assert.equal(initialMetrics.dataScopeRole, metrics.dataScopeRole, `${spec.path} ${viewportName} changed data scope during hydration.`);

          await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
          const screenshotPath = join(outputDir, `${spec.name}-${viewportName}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: false, caret: "initial" });
          proof.results.push({
            route: spec.path,
            role: spec.role,
            viewport: { name: viewportName, width, height },
            metrics,
            initialMetrics,
            axeChecked,
            axeViolations,
            keyboardFocus,
            accountSignOutFocus,
            pageErrors: [...pageErrors],
            requestFailures: [...requestFailures],
            screenshotPath
          });
          console.log(`proved ${spec.path} at ${width}px`);
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const proofPath = join(outputDir, "proof.json");
  writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`);
  console.log(`Family shell proof passed with ${proof.results.length} route-viewport results: ${proofPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
