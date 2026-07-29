import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const envFile = ".env.local";
const baseUrl = process.env.QA_PROOF_BASE_URL || "http://127.0.0.1:3020";
const screenshotDir = "output/playwright";

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

async function signIn(page, email, password) {
  await page.goto(`${baseUrl}/auth`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).last().click();
  await page.getByText("Signed in.", { exact: false }).waitFor({ timeout: 15_000 });
}

async function assertText(page, expected, timeout = 15_000) {
  await page.getByText(expected, { exact: false }).first().waitFor({ timeout });
}

async function main() {
  loadLocalEnv();
  requireEnv("QA_COACH_EMAIL");
  requireEnv("QA_COACH_PASSWORD");
  mkdirSync(screenshotDir, { recursive: true });

  const executablePath = chromiumExecutablePath();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {})
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    extraHTTPHeaders: {
      "Cache-Control": "no-cache"
    }
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120_000);

  try {
    await signIn(page, requireEnv("QA_COACH_EMAIL"), requireEnv("QA_COACH_PASSWORD"));
    await page.goto(`${baseUrl}/coach/parent-replay?qa_ai_provider=${Date.now()}`, { waitUntil: "networkidle" });
    await assertText(page, "AI Coach Workspace");
    await assertText(page, "Preview - Edit - Approve - Publish");
    await assertText(page, "nothing publishes or sends without review");

    const [providerResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/coach/ai-workspace"), { timeout: 180_000 }),
      page.getByRole("button", { name: "Request AI rewrite" }).first().click()
    ]);
    const providerBody = await providerResponse.json().catch(() => null);
    if (!providerResponse.ok() || !providerBody?.ok) {
      throw new Error(`AI provider rewrite failed with HTTP ${providerResponse.status()}: ${providerBody?.message ?? "unreadable response"}`);
    }
    if (providerBody.source !== "openai") {
      throw new Error(`AI provider rewrite did not use OpenAI source: ${providerBody.source ?? "unknown"}`);
    }
    if (!providerBody.message?.includes("Nothing was published or sent")) {
      throw new Error("AI provider response did not preserve the no-publish/no-send boundary.");
    }

    await assertText(page, "AI provider draft created for coach review. Nothing was published or sent.", 120_000);
    await assertText(page, "OpenAI Responses API draft rewrite", 120_000);
    await assertText(page, "AI provider output remains coach-reviewed and cannot publish automatically.", 120_000);

    const forbiddenTexts = [
      "sent to families by email",
      "published to parents",
      "Call 555",
      "Private RSVP note: running late"
    ];
    const bodyText = await page.locator("body").innerText();
    for (const forbiddenText of forbiddenTexts) {
      if (bodyText.toLowerCase().includes(forbiddenText.toLowerCase())) {
        throw new Error(`AI provider proof leaked forbidden text: ${forbiddenText}`);
      }
    }

    const screenshotPath = join(screenshotDir, "ai-coach-provider-rewrite-qa-session-live.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`QA coach AI provider rewrite verified as draft/review-only (${screenshotPath})`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
