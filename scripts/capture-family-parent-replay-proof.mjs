import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const envFile = ".env.local";
const baseUrl = process.env.FAMILY_REPLAY_BASE_URL || "http://127.0.0.1:3022";
const screenshotDir = process.env.FAMILY_REPLAY_SCREENSHOT_DIR || "output/playwright/family-parent-replay";
const viewports = [
  ["mobile-375", 375, 812],
  ["mobile-390", 390, 844],
  ["tablet-768", 768, 1024],
  ["desktop-1440", 1440, 1100]
];

function loadLocalEnv() {
  if (!existsSync(envFile)) return;
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 0) continue;
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

async function addParentSession(context) {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabase = createClient(
    supabaseUrl,
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data, error } = await supabase.auth.signInWithPassword({
    email: requireEnv("QA_PARENT_EMAIL"),
    password: requireEnv("QA_PARENT_PASSWORD")
  });
  if (error || !data.session) throw new Error(error?.message ?? "Parent session was not returned.");
  const encodedSession = Buffer.from(JSON.stringify(data.session), "utf8").toString("base64url");
  await context.addCookies([{
    name: `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`,
    value: `base64-${encodedSession}`,
    domain: new URL(baseUrl).hostname,
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
    expires: Math.floor(Date.now() / 1000) + 60 * 60
  }]);
}

async function capture(browser, [name, width, height]) {
  const context = await browser.newContext({ viewport: { width, height } });
  await addParentSession(context);
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    await page.goto(`${baseUrl}/parent/practice-recaps?proof=${Date.now()}-${width}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000
    });
    await page.getByRole("heading", { name: "Bring one good moment from practice home." }).waitFor({ timeout: 20_000 });
    await page.getByText("Private by default.").waitFor();
    const state = await page.evaluate(() => {
      const surface = document.querySelector(".family-replay-page");
      const controls = [...(surface?.querySelectorAll("button, a, input, select, textarea") ?? [])]
        .filter((element) => {
          const style = getComputedStyle(element);
          return style.visibility !== "hidden" && style.display !== "none";
        })
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return { width: Math.round(rect.width), height: Math.round(rect.height), text: (element.textContent ?? "").trim().slice(0, 60) };
        });
      return {
        bodyWidth: document.body.scrollWidth,
        viewportWidth: innerWidth,
        documentOverflow: document.body.scrollWidth > innerWidth + 1,
        undersized: controls.filter((control) => control.width > 0 && control.height > 0 && (control.width < 44 || control.height < 44)),
        hasPublishedStory: Boolean(document.querySelector(".family-replay-story")),
        hasEmptyState: Boolean(document.querySelector(".family-replay-empty"))
      };
    });
    if (state.documentOverflow) throw new Error(`${name} has document overflow.`);
    if (state.undersized.length) throw new Error(`${name} has undersized controls: ${JSON.stringify(state.undersized.slice(0, 8))}`);
    if (!state.hasPublishedStory && !state.hasEmptyState) throw new Error(`${name} has neither a published nor empty Replay state.`);
    if (pageErrors.length) throw new Error(`${name} emitted page errors: ${pageErrors.join(" | ")}`);
    await page.screenshot({ fullPage: true, path: join(screenshotDir, `${name}.png`) });
    return {
      name,
      path: "/parent/practice-recaps",
      width,
      height,
      documentOverflow: state.documentOverflow,
      undersizedInteractiveCount: state.undersized.length,
      renderedState: state.hasPublishedStory ? "published" : "empty",
      pageErrors
    };
  } finally {
    await context.close();
  }
}

loadLocalEnv();
mkdirSync(screenshotDir, { recursive: true });
const executablePath = process.env.PLAYWRIGHT_MCP_EXECUTABLE_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const browser = await chromium.launch({
  headless: true,
  ...(executablePath && existsSync(executablePath) ? { executablePath } : {})
});
try {
  const proof = [];
  for (const viewport of viewports) {
    proof.push(await capture(browser, viewport));
    console.log(`captured ${viewport[0]}`);
  }
  writeFileSync(join(screenshotDir, "proof.json"), `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    baseUrl,
    proof
  }, null, 2)}\n`);
} finally {
  await browser.close();
}
