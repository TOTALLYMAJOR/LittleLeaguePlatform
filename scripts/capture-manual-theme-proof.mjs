import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");
const baseUrl = process.env.QA_PROOF_BASE_URL || "http://127.0.0.1:3122";
const outputDir = process.env.MANUAL_THEME_PROOF_DIR || "output/playwright/lp-ux-005-manual-theme";
const storageKey = "leaguepilot-color-theme:v1";
const familyRoutes = [
  "/parent",
  "/parent/family-access",
  "/parent/messages",
  "/parent/more",
  "/parent/photos",
  "/parent/practice-recaps",
  "/parent/schedule",
  "/parent/settings",
  "/parent/setup",
  "/parent/transportation",
  "/account",
  "/team-chat",
  "/team-portal"
];
const viewports = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "desktop-1440", width: 1440, height: 1000 }
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

async function addRoleSession(context, role) {
  const credentialPrefix = role.toUpperCase();
  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data, error } = await supabase.auth.signInWithPassword({
    email: requireEnv(`DEMO_${credentialPrefix}_EMAIL`),
    password: requireEnv(`DEMO_${credentialPrefix}_PASSWORD`)
  });
  if (error || !data.session) throw new Error(error?.message ?? `${role} demo session was not returned.`);
  const hostname = new URL(baseUrl).hostname;
  await context.addCookies([
    {
      name: `sb-${supabaseProjectRef()}-auth-token`,
      value: `base64-${Buffer.from(JSON.stringify(data.session), "utf8").toString("base64url")}`,
      domain: hostname,
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + 60 * 60
    },
    {
      name: "leaguepilot-active-role",
      value: role,
      domain: hostname,
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + 60 * 60
    }
  ]);
}

async function setSavedTheme(context, theme) {
  await context.addInitScript(({ key, value }) => {
    if (window.localStorage.getItem(key) === null) window.localStorage.setItem(key, value);
  }, { key: storageKey, value: theme });
}

async function inspectTheme(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const bodyStyle = getComputedStyle(document.body);
    const shell = document.querySelector("[data-product-shell], .public-app-shell");
    const shellStyle = shell ? getComputedStyle(shell) : null;
    const gateway = document.querySelector(".landing-gateway");
    const gatewayHeading = document.querySelector(".landing-gateway-copy h1");
    return {
      theme: root.dataset.theme ?? null,
      rootColorScheme: getComputedStyle(root).colorScheme,
      bodyBackground: bodyStyle.backgroundColor,
      bodyColor: bodyStyle.color,
      shellBackground: shellStyle?.backgroundColor ?? null,
      gatewayBackground: gateway ? getComputedStyle(gateway).backgroundColor : null,
      gatewayHeadingColor: gatewayHeading ? getComputedStyle(gatewayHeading).color : null,
      documentWidth: root.scrollWidth,
      viewportWidth: root.clientWidth,
      toggleLabel: document.querySelector(".theme-toggle")?.getAttribute("aria-label") ?? null
    };
  });
}

async function visibleLightPanels(page) {
  return page.evaluate(() => {
    function channelLuminance(channel) {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    }
    function luminance(color) {
      const channels = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
      if (channels.length < 3) return 0;
      return 0.2126 * channelLuminance(channels[0])
        + 0.7152 * channelLuminance(channels[1])
        + 0.0722 * channelLuminance(channels[2]);
    }
    return [...document.querySelectorAll("main section, main article, main details, main .card, main .parent-weekly-empty")]
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return rect.width > 1
          && rect.height > 1
          && style.display !== "none"
          && style.visibility !== "hidden"
          && luminance(style.backgroundColor) > 0.72;
      })
      .map((element) => ({
        tag: element.tagName,
        className: element.className?.toString() ?? "",
        background: getComputedStyle(element).backgroundColor
      }));
  });
}

async function runAxe(page) {
  await page.addScriptTag({ path: axePath });
  return page.evaluate(async () => {
    const result = await window.axe.run(document, {
      resultTypes: ["violations"],
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]
      }
    });
    return result.violations
      .filter((violation) => violation.impact === "critical" || violation.impact === "serious")
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        nodes: violation.nodes.map((node) => node.target)
      }));
  });
}

async function openSettled(page, path) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.locator(".theme-toggle").first().waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(250);
}

async function main() {
  loadLocalEnv();
  mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(chromiumExecutablePath() ? { executablePath: chromiumExecutablePath() } : {})
  });
  const proof = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    defaultContract: "light regardless of device preference",
    persistenceContract: "explicit light or dark selection applies to every route",
    results: []
  };

  try {
    const publicContext = await browser.newContext({ colorScheme: "dark", viewport: { width: 1440, height: 1000 } });
    const publicPage = await publicContext.newPage();
    const publicErrors = [];
    publicPage.on("pageerror", (error) => publicErrors.push(error.message));
    await openSettled(publicPage, "/");
    const defaultMetrics = await inspectTheme(publicPage);
    assert.equal(defaultMetrics.theme, "light", "A first visit must be light even on a dark-mode device.");
    assert.equal(defaultMetrics.rootColorScheme, "light");
    assert.equal(defaultMetrics.documentWidth, defaultMetrics.viewportWidth);
    await publicPage.screenshot({ path: join(outputDir, "public-default-light-dark-device.png"), fullPage: false });

    await publicPage.locator(".theme-toggle").first().click();
    const selectedDarkMetrics = await inspectTheme(publicPage);
    assert.equal(selectedDarkMetrics.theme, "dark");
    assert.equal(selectedDarkMetrics.rootColorScheme, "dark");
    await publicPage.reload({ waitUntil: "domcontentloaded" });
    await publicPage.locator(".theme-toggle").first().waitFor({ state: "visible" });
    await publicPage.locator('.theme-toggle[aria-label="Use light mode"]').first().waitFor({ state: "visible" });
    await publicPage.locator(".landing-gateway").waitFor({ state: "visible" });
    const persistedDarkMetrics = await inspectTheme(publicPage);
    assert.equal(persistedDarkMetrics.theme, "dark", "Dark selection must persist after reload.");
    assert.equal(persistedDarkMetrics.gatewayBackground, "rgb(17, 24, 33)", "The gateway must use the selected dark canvas.");
    assert.equal(persistedDarkMetrics.gatewayHeadingColor, "rgb(246, 241, 233)", "The gateway headline must use the selected dark foreground.");
    assert.equal(persistedDarkMetrics.toggleLabel, "Use light mode");
    assert.deepEqual(publicErrors, []);
    await publicPage.screenshot({ path: join(outputDir, "public-selected-dark-persisted.png"), fullPage: false });
    proof.results.push({ route: "/", state: "default-light", metrics: defaultMetrics });
    proof.results.push({ route: "/", state: "selected-dark", metrics: selectedDarkMetrics });
    proof.results.push({ route: "/", state: "persisted-dark", metrics: persistedDarkMetrics, pageErrors: publicErrors });
    await publicContext.close();

    const parentContext = await browser.newContext({ colorScheme: "light" });
    await addRoleSession(parentContext, "parent");
    await setSavedTheme(parentContext, "dark");
    const parentPage = await parentContext.newPage();
    for (const viewport of viewports) {
      await parentPage.setViewportSize(viewport);
      for (const route of familyRoutes) {
        const pageErrors = [];
        const onPageError = (error) => pageErrors.push(error.message);
        parentPage.on("pageerror", onPageError);
        await openSettled(parentPage, route);
        const metrics = await inspectTheme(parentPage);
        const lightPanels = await visibleLightPanels(parentPage);
        const axeViolations = await runAxe(parentPage);
        assert.equal(metrics.theme, "dark", `${route} did not retain the saved dark selection.`);
        assert.equal(metrics.rootColorScheme, "dark", `${route} did not expose the dark color scheme.`);
        assert.equal(metrics.documentWidth, metrics.viewportWidth, `${route} overflowed at ${viewport.width}px.`);
        assert.deepEqual(lightPanels, [], `${route} retained light content panels at ${viewport.width}px.`);
        assert.deepEqual(axeViolations, [], `${route} has serious or critical axe violations at ${viewport.width}px.`);
        assert.deepEqual(pageErrors, [], `${route} emitted browser errors at ${viewport.width}px.`);
        parentPage.off("pageerror", onPageError);
        const shouldCapture = ["/parent", "/parent/schedule", "/team-chat"].includes(route);
        const screenshotPath = shouldCapture
          ? join(outputDir, `${route.slice(1).replaceAll("/", "-")}-${viewport.name}-dark.png`)
          : null;
        if (screenshotPath) await parentPage.screenshot({ path: screenshotPath, fullPage: false });
        proof.results.push({ route, role: "parent", state: "selected-dark", viewport, metrics, lightPanels, axeViolations, pageErrors, screenshotPath });
      }
    }
    await parentPage.locator(".theme-toggle").first().click();
    await openSettled(parentPage, "/parent");
    const selectedLightMetrics = await inspectTheme(parentPage);
    assert.equal(selectedLightMetrics.theme, "light", "Light selection must replace dark across navigation.");
    assert.equal(selectedLightMetrics.toggleLabel, "Use dark mode");
    await parentPage.screenshot({ path: join(outputDir, "parent-selected-light.png"), fullPage: false });
    proof.results.push({ route: "/parent", role: "parent", state: "selected-light", metrics: selectedLightMetrics });
    await parentContext.close();

    for (const role of ["coach", "admin"]) {
      const context = await browser.newContext({ colorScheme: "light", viewport: { width: 1440, height: 1000 } });
      await addRoleSession(context, role);
      await setSavedTheme(context, "dark");
      const page = await context.newPage();
      const route = `/${role}`;
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await openSettled(page, route);
      const metrics = await inspectTheme(page);
      const lightPanels = await visibleLightPanels(page);
      const axeViolations = await runAxe(page);
      assert.equal(metrics.theme, "dark");
      assert.equal(metrics.rootColorScheme, "dark");
      assert.equal(metrics.documentWidth, metrics.viewportWidth);
      assert.deepEqual(lightPanels, []);
      assert.deepEqual(axeViolations, []);
      assert.deepEqual(pageErrors, []);
      const screenshotPath = join(outputDir, `${role}-selected-dark.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      proof.results.push({ route, role, state: "selected-dark", metrics, lightPanels, axeViolations, pageErrors, screenshotPath });
      await context.close();
    }
  } finally {
    await browser.close();
  }

  const proofPath = join(outputDir, "proof.json");
  writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`);
  console.log(`Manual theme proof passed with ${proof.results.length} results: ${proofPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
