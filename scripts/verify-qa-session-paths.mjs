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

async function assertText(page, expected) {
  await page.getByText(expected, { exact: false }).first().waitFor({ timeout: 15_000 });
}

async function proveRole(browser, input) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 2,
    extraHTTPHeaders: {
      "Cache-Control": "no-cache"
    }
  });
  const page = await context.newPage();

  try {
    await signIn(page, input.email, input.password);

    for (const route of input.routes) {
      const proofUrl = `${baseUrl}${route.path}?qa_proof=${Date.now()}`;
      await page.goto(proofUrl, { waitUntil: "networkidle" });
      for (const text of route.expectedText) await assertText(page, text);
      const screenshotPath = join(screenshotDir, route.screenshot);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`${input.label}: ${route.path} verified (${screenshotPath})`);
    }
  } finally {
    await context.close();
  }
}

async function main() {
  loadLocalEnv();
  mkdirSync(screenshotDir, { recursive: true });

  const executablePath = chromiumExecutablePath();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {})
  });

  try {
    await proveRole(browser, {
      label: "QA parent",
      email: requireEnv("QA_PARENT_EMAIL"),
      password: requireEnv("QA_PARENT_PASSWORD"),
      routes: [
        {
          path: "/parent",
          screenshot: "parent-qa-session-live.png",
          expectedText: [
            "Showing Supabase roster, guardian, schedule, RSVP, and media rows.",
            "Mason",
            "Tiny Tigers",
            "Opening weekend notes"
          ]
        },
        {
          path: "/parent/rsvp",
          screenshot: "parent-rsvp-qa-session-live.png",
          expectedText: [
            "RSVP rows and button payloads are loaded from Supabase.",
            "Tiny Tigers vs Rookie Rockets",
            "Going"
          ]
        }
      ]
    });

    await proveRole(browser, {
      label: "QA coach",
      email: requireEnv("QA_COACH_EMAIL"),
      password: requireEnv("QA_COACH_PASSWORD"),
      routes: [
        {
          path: "/coach",
          screenshot: "coach-qa-session-live.png",
          expectedText: [
            "Showing Supabase team membership, roster, RSVP, weather, snack, and volunteer rows.",
            "Tiny Tigers",
            "Light rain watch",
            "Field setup"
          ]
        }
      ]
    });
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
