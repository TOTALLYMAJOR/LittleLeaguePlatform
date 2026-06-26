import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.QA_PROOF_BASE_URL || "http://127.0.0.1:3020";
const screenshotDir = "output/playwright";
const brandSurfaceLabels = [
  "Team logo",
  "Team banner / hero image",
  "Primary color",
  "Secondary color",
  "Accent / button color",
  "Team display name",
  "Team short name or abbreviation",
  "Default team avatar/icon fallback",
  "Team home/dashboard header",
  "Navigation accents",
  "Chat/message thread header",
  "Announcement cards",
  "Event/game schedule cards",
  "RSVP buttons and status badges",
  "Roster page header",
  "Photo/gallery page header",
  "Invite landing page",
  "Invite emails",
  "Announcement/reminder emails",
  "Push notification team identity"
];
const brandMonitoringEvents = [
  "brand_profile_created",
  "brand_profile_updated",
  "brand_profile_published",
  "brand_asset_uploaded",
  "brand_asset_rejected",
  "brand_render_failed",
  "brand_fallback_used"
];
const brandAlertRules = [
  "Brand API error rate > 1%",
  "Brand asset upload failures spike",
  "Published brand missing required tokens",
  "Email rendering fails due to brand data",
  "Public invite page cannot load brand"
];

function chromiumExecutablePath() {
  const candidates = [
    process.env.PLAYWRIGHT_MCP_EXECUTABLE_PATH,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    process.env.HOME ? `${process.env.HOME}/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome` : ""
  ];
  return candidates.find((candidate) => candidate && existsSync(candidate));
}

function normalizeText(value) {
  return value.toLowerCase().replace(/\s+/g, " ");
}

function assertIncludes(haystack, needle) {
  if (!normalizeText(haystack).includes(normalizeText(needle))) {
    throw new Error(`Brand proof missing expected text: ${needle}`);
  }
}

async function main() {
  mkdirSync(screenshotDir, { recursive: true });

  const executablePath = chromiumExecutablePath();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {})
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
      extraHTTPHeaders: {
        "Cache-Control": "no-cache"
      }
    });

    await page.goto(`${baseUrl}/admin/themes?qa_brand_proof=${Date.now()}`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "First-class team branding control across every portal." }).waitFor({ timeout: 15_000 });
    const bodyText = await page.locator("body").innerText({ timeout: 15_000 });

    for (const text of [
      "Admin theme console",
      "Launch validation",
      "20 target brand surfaces",
      "100% covered",
      "Test brands and metrics",
      "Branding appears on all 20 target features",
      "Production monitoring",
      "Coach feedback and acceptance",
      "A coach can configure one team brand profile.",
      "The same brand-token model can support future iOS development."
    ]) {
      assertIncludes(bodyText, text);
    }

    for (const surfaceLabel of brandSurfaceLabels) assertIncludes(bodyText, surfaceLabel);
    for (const eventName of brandMonitoringEvents) assertIncludes(bodyText, eventName);
    for (const alert of brandAlertRules) assertIncludes(bodyText, alert);

    const screenshotPath = join(screenshotDir, "brand-launch-validation.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Brand launch validation verified (${screenshotPath})`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
