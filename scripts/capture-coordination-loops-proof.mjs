import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

function loadLocalEnv() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadLocalEnv();

const baseUrl = process.env.COORDINATION_PROOF_BASE_URL ?? "http://127.0.0.1:3010";
const outputDir = "output/playwright/coordination-loops";
const browserExecutable = process.env.PLAYWRIGHT_MCP_EXECUTABLE_PATH
  ?? "/home/administrator/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome";

mkdirSync(outputDir, { recursive: true });

const roles = {
  admin: {
    email: process.env.QA_ADMIN_EMAIL,
    password: process.env.QA_ADMIN_PASSWORD
  },
  coach: {
    email: process.env.QA_COACH_EMAIL,
    password: process.env.QA_COACH_PASSWORD
  },
  parent: {
    email: process.env.QA_PARENT_EMAIL,
    password: process.env.QA_PARENT_PASSWORD
  }
};

for (const [role, credentials] of Object.entries(roles)) {
  if (!credentials.email || !credentials.password) {
    throw new Error(`Missing QA credentials for ${role}. Run npm run supabase:qa-users or configure .env.local.`);
  }
}

const scenarios = [
  {
    id: "admin-season-launch",
    role: "admin",
    path: "/admin/imports",
    heading: "Go from league setup to family-ready without silent side effects.",
    textChecks: ["Validate the source file, review warnings", "communications as separate launch gates"],
    buttonChecks: []
  },
  {
    id: "admin-delivery-evidence",
    role: "admin",
    path: "/admin/message-delivery-review",
    heading: "Know what was drafted, approved, accepted, delivered, read, and acknowledged.",
    textChecks: ["A queued attempt is not called sent", "Delivery proved", "Acknowledged"],
    buttonChecks: ["all", "pending", "failed", "proved"]
  },
  {
    id: "admin-game-day-resolution",
    role: "admin",
    path: "/admin/schedule-venues",
    heading: "Turn weather uncertainty into one reviewed, auditable decision.",
    textChecks: ["Weather evidence informs the room", "Provider sends: 0", "Recent resolution receipts"],
    buttonChecks: ["Save reviewed resolution"]
  },
  {
    id: "coach-practice-replay-loop",
    role: "coach",
    path: "/coach/practice-recaps",
    heading: "Capture what actually happened before writing the family recap.",
    textChecks: ["Plan, run, and observations stay coach-only", "Coach observations", "Completion does not publish anything"],
    buttonChecks: ["Save reviewed plan", "Start practice", "Complete and unlock Replay seed"]
  },
  {
    id: "coach-game-day-resolution",
    role: "coach",
    path: "/coach/schedule",
    heading: "Turn weather uncertainty into one reviewed, auditable decision.",
    textChecks: ["Weather evidence informs the room", "Provider sends: 0", "Recent resolution receipts"],
    buttonChecks: ["Save reviewed resolution"]
  },
  {
    id: "parent-family-flight-plan",
    role: "parent",
    path: "/parent",
    heading: "One timeline for every child, field, RSVP, weather flag, and family handoff.",
    textChecks: ["Children still do not log in", "caregiver labels do not grant app access", "honest delivery evidence"],
    buttonChecks: []
  }
];

const viewports = [
  { id: "desktop", width: 1440, height: 1000, fullPage: true },
  { id: "mobile", width: 390, height: 844, fullPage: false }
];

const browser = await chromium.launch({
  executablePath: browserExecutable,
  headless: true,
  args: ["--disable-dev-shm-usage"]
});

const report = [];

async function signIn(page, role) {
  const credentials = roles[role];
  await page.goto(`${baseUrl}/auth`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 20_000 });
}

try {
  for (const viewport of viewports) {
    for (const role of Object.keys(roles)) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        reducedMotion: "reduce"
      });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on("console", (entry) => {
        if (entry.type() === "error") consoleErrors.push(entry.text());
      });
      page.on("pageerror", (error) => consoleErrors.push(error.message));

      await signIn(page, role);
      for (const scenario of scenarios.filter((item) => item.role === role)) {
        await page.goto(`${baseUrl}${scenario.path}`, { waitUntil: "networkidle" });
        const heading = page.getByRole("heading", { name: scenario.heading, exact: true });
        await heading.waitFor({ state: "visible", timeout: 20_000 });
        const bodyText = await page.locator("body").innerText();
        for (const expectedText of scenario.textChecks) {
          if (!bodyText.includes(expectedText)) {
            throw new Error(`${scenario.id} is missing expected workflow copy: ${expectedText}`);
          }
        }
        for (const buttonName of scenario.buttonChecks) {
          await page.getByRole("button", { name: buttonName, exact: true }).first().waitFor({ state: "attached", timeout: 20_000 });
        }
        const overflow = await page.evaluate(() => ({
          documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth
        }));
        if (overflow.documentOverflow) {
          throw new Error(`${scenario.id} overflows at ${viewport.width}px (${overflow.scrollWidth} > ${overflow.clientWidth}).`);
        }
        if (consoleErrors.length) {
          throw new Error(`${scenario.id} logged browser errors at ${viewport.width}px: ${consoleErrors.join(" | ")}`);
        }
        const screenshotPath = `${outputDir}/${scenario.id}-${viewport.id}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: viewport.fullPage });
        report.push({
          scenario: scenario.id,
          role,
          path: scenario.path,
          viewport: `${viewport.width}x${viewport.height}`,
          headingVerified: true,
          semanticChecks: [...scenario.textChecks, ...scenario.buttonChecks],
          documentOverflow: false,
          consoleErrors: [...consoleErrors],
          screenshotPath
        });
        consoleErrors.length = 0;
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}

writeFileSync(`${outputDir}/coordination-proof.json`, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  baseUrl,
  proofBoundary: "Local signed-in route rendering and responsive browser evidence. Provider delivery and hosted migration proof remain separate.",
  scenarios: report
}, null, 2)}\n`);

console.log(`Captured ${report.length} signed-in coordination screenshots with zero document overflow and zero console errors.`);
