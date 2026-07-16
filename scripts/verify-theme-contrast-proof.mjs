import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.QA_PROOF_BASE_URL || "http://127.0.0.1:3020";
const screenshotDir = "output/playwright";
const minNormalContrast = Number(process.env.QA_CONTRAST_MIN_NORMAL || 4.5);
const minLargeContrast = Number(process.env.QA_CONTRAST_MIN_LARGE || 3);
const maxFailuresPerRoute = Number(process.env.QA_CONTRAST_MAX_FAILURES || 20);

const majorRoutes = [
  "/parent",
  "/parent/rsvp",
  "/coach",
  "/coach/rsvps",
  "/team-portal",
  "/team-chat",
  "/admin",
  "/admin/operations",
  "/admin/themes"
];

const modeMatrix = [
  { name: "light", colorScheme: "light", routes: majorRoutes },
  { name: "dark", colorScheme: "dark", routes: majorRoutes },
  { name: "team", colorScheme: "light", routes: ["/team-portal", "/team-chat", "/admin/themes"] }
];

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

async function collectContrastFailures(page) {
  return page.evaluate(({ minNormalContrast, minLargeContrast, maxFailuresPerRoute }) => {
    function parseColor(value) {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const parts = match[1].split(",").map((part) => Number(part.trim()));
      if (parts.length < 3 || parts.some((part, index) => index < 3 && !Number.isFinite(part))) return null;
      return {
        r: parts[0],
        g: parts[1],
        b: parts[2],
        a: parts[3] === undefined ? 1 : parts[3]
      };
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
      const light = Math.max(leftLum, rightLum);
      const dark = Math.min(leftLum, rightLum);
      return (light + 0.05) / (dark + 0.05);
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

    function isVisible(element) {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0;
    }

    function isLargeText(style) {
      const size = Number.parseFloat(style.fontSize);
      const weight = Number.parseInt(style.fontWeight, 10);
      return size >= 24 || (size >= 18.66 && weight >= 700);
    }

    const selectors = [
      "a",
      "button",
      "label",
      "legend",
      "p",
      "span",
      "strong",
      "small",
      "li",
      "h1",
      "h2",
      "h3",
      "h4",
      "td",
      "th",
      "summary"
    ].join(",");
    const elements = Array.from(document.querySelectorAll(selectors));
    const failures = [];

    for (const element of elements) {
      const text = (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim();
      if (!text || !isVisible(element)) continue;
      const style = getComputedStyle(element);
      const color = parseColor(style.color);
      if (!color) continue;
      const background = effectiveBackground(element);
      const ratio = contrastRatio(composite(color, background), background);
      const threshold = isLargeText(style) ? minLargeContrast : minNormalContrast;
      if (ratio + 0.01 < threshold) {
        failures.push({
          selector: element.tagName.toLowerCase(),
          text: text.slice(0, 90),
          ratio: Number(ratio.toFixed(2)),
          threshold,
          color: style.color,
          background: `rgb(${Math.round(background.r)}, ${Math.round(background.g)}, ${Math.round(background.b)})`
        });
        if (failures.length >= maxFailuresPerRoute) break;
      }
    }

    return failures;
  }, { minNormalContrast, minLargeContrast, maxFailuresPerRoute });
}

async function main() {
  mkdirSync(screenshotDir, { recursive: true });

  const executablePath = chromiumExecutablePath();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {})
  });
  const allFailures = [];

  try {
    for (const mode of modeMatrix) {
      const context = await browser.newContext({
        viewport: { width: 1366, height: 900 },
        colorScheme: mode.colorScheme,
        extraHTTPHeaders: {
          "Cache-Control": "no-cache"
        }
      });

      try {
        for (const route of mode.routes) {
          const page = await context.newPage();
          const url = `${baseUrl}${route}?qa_contrast=${Date.now()}-${mode.name}`;
          await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
          await page.locator("body").waitFor({ timeout: 15_000 });
          const failures = await collectContrastFailures(page);
          if (failures.length) {
            const screenshotPath = join(screenshotDir, `theme-contrast-${mode.name}-${slug(route)}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });
            allFailures.push({ mode: mode.name, route, screenshotPath, failures });
          }
          await page.close();
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  if (allFailures.length) {
    for (const result of allFailures) {
      console.error(`${result.mode} ${result.route} failed contrast proof (${result.screenshotPath})`);
      for (const failure of result.failures) {
        console.error(`- ${failure.selector} "${failure.text}" ratio ${failure.ratio}:1 < ${failure.threshold}:1 (${failure.color} on ${failure.background})`);
      }
    }
    throw new Error(`${allFailures.length} route/mode contrast proof(s) failed.`);
  }

  console.log(`Theme contrast proof passed for ${majorRoutes.length} major routes across light, dark, and team theme checks.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
