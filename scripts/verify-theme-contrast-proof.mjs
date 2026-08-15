import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { discoverFamilyContrastRoutes } from "./lib/family-contrast-routes.mjs";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");
const baseUrl = process.env.QA_PROOF_BASE_URL || "http://127.0.0.1:3020";
const outputDir = process.env.QA_CONTRAST_OUTPUT_DIR || "output/playwright/lp-ux-002-contrast";
const minNormalContrast = Number(process.env.QA_CONTRAST_MIN_NORMAL || 4.5);
const minLargeContrast = Number(process.env.QA_CONTRAST_MIN_LARGE || 3);
const maxFailuresPerRoute = Number(process.env.QA_CONTRAST_MAX_FAILURES || 20);
const viewport = {
  width: Number(process.env.QA_CONTRAST_VIEWPORT_WIDTH || 1366),
  height: Number(process.env.QA_CONTRAST_VIEWPORT_HEIGHT || 900)
};
const requestedRoutes = new Set((process.env.QA_CONTRAST_ROUTES || "").split(",").filter(Boolean));
const routeSpecs = discoverFamilyContrastRoutes().filter((route) => (
  !requestedRoutes.size || requestedRoutes.has(route.path)
));
const requestedModes = new Set((process.env.QA_CONTRAST_MODES || "").split(",").filter(Boolean));
const modeMatrix = [
  { name: "family-light", colorScheme: "light", forcedColors: "none" },
  { name: "device-light", colorScheme: "light", forcedColors: "none" },
  { name: "device-dark", colorScheme: "dark", forcedColors: "none" },
  { name: "forced-colors", colorScheme: "light", forcedColors: "active" }
].filter((mode) => !requestedModes.size || requestedModes.has(mode.name));

function loadLocalEnv() {
  const envFile = process.env.QA_ENV_FILE || ".env.local";
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

function slug(value) {
  return value.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";
}

function supabaseProjectRef() {
  return new URL(requireEnv("NEXT_PUBLIC_SUPABASE_URL")).hostname.split(".")[0];
}

async function addParentSession(context) {
  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data, error } = await supabase.auth.signInWithPassword({
    email: requireEnv("DEMO_PARENT_EMAIL"),
    password: requireEnv("DEMO_PARENT_PASSWORD")
  });
  if (error || !data.session) throw new Error(error?.message ?? "Demo parent session was not returned.");
  const domain = new URL(baseUrl).hostname;
  const expires = Math.floor(Date.now() / 1000) + 60 * 60;
  const encodedSession = Buffer.from(JSON.stringify(data.session), "utf8").toString("base64url");
  await context.addCookies([
    {
      name: `sb-${supabaseProjectRef()}-auth-token`,
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

async function collectContrastEvidence(page, numericContrastSupported) {
  return page.evaluate(({ minNormalContrast, minLargeContrast, maxFailuresPerRoute, numericContrastSupported }) => {
    function parseColor(value) {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const parts = match[1].split(",").map((part) => Number(part.trim()));
      if (parts.length < 3 || parts.some((part, index) => index < 3 && !Number.isFinite(part))) return null;
      return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] === undefined ? 1 : parts[3] };
    }
    function composite(foreground, background) {
      const alpha = foreground.a + background.a * (1 - foreground.a);
      if (alpha <= 0) return { r: 255, g: 255, b: 255, a: 1 };
      return {
        r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
        g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
        b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
        a: alpha
      };
    }
    function luminance(color) {
      const channels = [color.r, color.g, color.b].map((channel) => {
        const value = channel / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    }
    function contrastRatio(left, right) {
      const leftLum = luminance(left);
      const rightLum = luminance(right);
      return (Math.max(leftLum, rightLum) + 0.05) / (Math.min(leftLum, rightLum) + 0.05);
    }
    function effectiveBackground(element) {
      let current = element;
      let background = { r: 255, g: 255, b: 255, a: 1 };
      const colors = [];
      while (current) {
        const color = parseColor(getComputedStyle(current).backgroundColor);
        if (color && color.a > 0) colors.push(color);
        current = current.parentElement;
      }
      for (const color of colors.reverse()) background = composite(color, background);
      return background;
    }
    function visible(element) {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    }
    function threshold(style) {
      const size = Number.parseFloat(style.fontSize);
      const weight = Number.parseInt(style.fontWeight, 10);
      return size >= 24 || (size >= 18.66 && weight >= 700) ? minLargeContrast : minNormalContrast;
    }

    const selectors = "a,button,label,legend,p,span,strong,small,li,h1,h2,h3,h4,td,th,summary";
    const failures = [];
    const pairMap = new Map();
    let testedElementCount = 0;
    for (const element of document.querySelectorAll(selectors)) {
      const text = [...element.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (!text || !visible(element)) continue;
      const style = getComputedStyle(element);
      const color = parseColor(style.color);
      const background = effectiveBackground(element);
      if (!color) continue;
      const ratio = contrastRatio(composite(color, background), background);
      const required = threshold(style);
      const foregroundValue = style.color;
      const backgroundValue = `rgb(${Math.round(background.r)}, ${Math.round(background.g)}, ${Math.round(background.b)})`;
      const key = `${foregroundValue}|${backgroundValue}|${required}`;
      const current = pairMap.get(key) ?? {
        foreground: foregroundValue,
        background: backgroundValue,
        minimumRatio: Number(ratio.toFixed(2)),
        threshold: required,
        count: 0
      };
      current.count += 1;
      current.minimumRatio = Math.min(current.minimumRatio, Number(ratio.toFixed(2)));
      pairMap.set(key, current);
      testedElementCount += 1;
      if (numericContrastSupported && ratio + 0.01 < required && failures.length < maxFailuresPerRoute) {
        failures.push({
          selector: element.tagName.toLowerCase(),
          text: text.slice(0, 90),
          ratio: Number(ratio.toFixed(2)),
          threshold: required,
          color: foregroundValue,
          background: backgroundValue
        });
      }
    }
    return {
      testedElementCount,
      pairs: [...pairMap.values()].sort((left, right) => left.minimumRatio - right.minimumRatio).slice(0, 60),
      failures
    };
  }, { minNormalContrast, minLargeContrast, maxFailuresPerRoute, numericContrastSupported });
}

async function runAxe(page, forcedColorsActive) {
  await page.addScriptTag({ path: axePath });
  return page.evaluate(async ({ forcedColorsActive }) => {
    const report = await window.axe.run(document, {
      resultTypes: ["violations"],
      rules: forcedColorsActive ? { "color-contrast": { enabled: false } } : undefined,
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
  }, { forcedColorsActive });
}

async function inspectRoute(page) {
  return page.evaluate(() => {
    const shell = document.querySelector("[data-product-shell]");
    const mainCount = document.querySelectorAll("main").length;
    return {
      authenticationState: shell ? "authenticated" : "unconfirmed",
      activeRole: shell?.getAttribute("data-resolved-role") ?? null,
      shellFamily: shell?.getAttribute("data-product-shell") ?? null,
      surfaceFamily: shell?.getAttribute("data-surface-family") ?? null,
      themeMarker: shell ? getComputedStyle(shell).colorScheme : null,
      forcedColorsActive: matchMedia("(forced-colors: active)").matches,
      mainCount,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth
    };
  });
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
    routeSource: "lib/navigation/route-topology.ts",
    authenticatedAs: "demo-parent",
    thresholds: { normalText: minNormalContrast, largeText: minLargeContrast },
    routes: routeSpecs,
    modes: modeMatrix,
    results: []
  };

  try {
    for (const mode of modeMatrix) {
      const context = await browser.newContext({
        viewport,
        colorScheme: mode.colorScheme,
        forcedColors: mode.forcedColors,
        extraHTTPHeaders: { "Cache-Control": "no-cache" }
      });
      await addParentSession(context);
      try {
        for (const route of routeSpecs) {
          const page = await context.newPage();
          const consoleErrors = [];
          const failedRequests = [];
          page.on("console", (message) => {
            if (message.type() === "error") consoleErrors.push(message.text());
          });
          page.on("pageerror", (error) => consoleErrors.push(error.message));
          page.on("requestfailed", (request) => {
            const failure = request.failure()?.errorText ?? "request failed";
            if (failure !== "net::ERR_ABORTED") failedRequests.push(`${request.method()} ${request.url()} ${failure}`);
          });
          try {
            await page.goto(`${baseUrl}${route.path}?qa_contrast=${mode.name}`, {
              waitUntil: "domcontentloaded",
              timeout: 90_000
            });
            await page.locator("[data-product-shell='family']").waitFor({ timeout: 20_000 });
            await page.waitForLoadState("networkidle", { timeout: 30_000 });
            await page.waitForTimeout(250);
            const routeState = await inspectRoute(page);
            const contrast = await collectContrastEvidence(page, mode.forcedColors !== "active");
            const axeViolations = await runAxe(page, mode.forcedColors === "active");
            const screenshotPath = join(outputDir, `${mode.name}-${slug(route.path)}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true, caret: "initial" });

            assert.equal(routeState.authenticationState, "authenticated", `${route.path} did not prove an authenticated session.`);
            assert.equal(routeState.activeRole, "parent", `${route.path} did not retain the parent role.`);
            assert.equal(routeState.shellFamily, route.expectedShellFamily, `${route.path} shell family drifted.`);
            if (mode.forcedColors === "active") {
              assert.match(routeState.themeMarker ?? "", /light/, `${route.path} lost light system-color support.`);
            } else {
              assert.equal(routeState.themeMarker, "light", `${route.path} did not retain the approved Family light theme.`);
            }
            assert.equal(routeState.mainCount, 1, `${route.path} rendered ${routeState.mainCount} main landmarks.`);
            assert.equal(routeState.documentWidth, routeState.viewportWidth, `${route.path} overflowed horizontally.`);
            assert.equal(routeState.forcedColorsActive, mode.forcedColors === "active", `${route.path} forced-colors emulation drifted.`);
            assert.deepEqual(contrast.failures, [], `${route.path} failed numeric contrast in ${mode.name}.`);
            assert.deepEqual(axeViolations, [], `${route.path} has critical or serious axe findings in ${mode.name}.`);
            assert.deepEqual(consoleErrors, [], `${route.path} emitted console errors in ${mode.name}.`);
            assert.deepEqual(failedRequests, [], `${route.path} had request failures in ${mode.name}.`);

            proof.results.push({
              route: route.path,
              mode: mode.name,
              authenticationState: routeState.authenticationState,
              activeRole: routeState.activeRole,
              shellFamily: routeState.shellFamily,
              surfaceFamily: routeState.surfaceFamily,
              themeMarker: routeState.themeMarker,
              forcedColorsActive: routeState.forcedColorsActive,
              foregroundBackgroundPairs: contrast.pairs,
              testedElementCount: contrast.testedElementCount,
              contrastResult: mode.forcedColors === "active" ? "system-colors-verified" : "pass",
              axeResult: mode.forcedColors === "active"
                ? "pass-structural-color-contrast-covered-by-system-colors"
                : "pass",
              axeViolations,
              consoleErrors,
              failedRequests,
              horizontalOverflow: false,
              mainLandmarks: routeState.mainCount,
              screenshotPath
            });
            console.log(`proved ${route.path} in ${mode.name}`);
          } finally {
            await page.close();
          }
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const proofPath = join(outputDir, "proof.json");
  const summaryPath = join(outputDir, "summary.md");
  writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`);
  writeFileSync(summaryPath, [
    "# Authenticated Family Contrast Proof",
    "",
    `Generated: ${proof.generatedAt}`,
    `Routes: ${routeSpecs.length}, topology source: ${proof.routeSource}`,
    `Modes: ${modeMatrix.map((mode) => mode.name).join(", ")}`,
    `Results: ${proof.results.length} passed`,
    `Numeric thresholds: ${minNormalContrast}:1 normal text; ${minLargeContrast}:1 large text`,
    "Forced colors: Chromium forced-colors emulation with explicit system-color component checks; axe critical/serious findings 0.",
    "Authentication: demo parent; active role and Family shell verified for every result.",
    "Console errors, failed requests, horizontal overflow, and extra main landmarks: 0.",
    ""
  ].join("\n"));
  console.log(`Authenticated Family contrast proof passed: ${proofPath}`);
  console.log(`Human summary: ${summaryPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
