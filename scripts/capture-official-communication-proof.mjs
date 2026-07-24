import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const envFile = ".env.local";
const baseUrl = process.env.OFFICIAL_COMMUNICATION_BASE_URL || "http://127.0.0.1:3024";
const screenshotDir = process.env.OFFICIAL_COMMUNICATION_SCREENSHOT_DIR || "output/playwright/official-communications";
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

function projectRef() {
  return new URL(requireEnv("NEXT_PUBLIC_SUPABASE_URL")).hostname.split(".")[0];
}

async function addAdminSession(context) {
  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data, error } = await supabase.auth.signInWithPassword({
    email: requireEnv("QA_ADMIN_EMAIL"),
    password: requireEnv("QA_ADMIN_PASSWORD")
  });
  if (error || !data.session) throw new Error(error?.message ?? "Admin session was not returned.");
  const encodedSession = Buffer.from(JSON.stringify(data.session), "utf8").toString("base64url");
  await context.addCookies([{
    name: `sb-${projectRef()}-auth-token`,
    value: `base64-${encodedSession}`,
    domain: new URL(baseUrl).hostname,
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
    expires: Math.floor(Date.now() / 1000) + 60 * 60
  }]);
}

async function captureViewport(browser, [name, width, height]) {
  const context = await browser.newContext({
    viewport: { width, height },
    extraHTTPHeaders: { "Cache-Control": "no-cache" }
  });
  await addAdminSession(context);
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    await page.goto(`${baseUrl}/admin/communications?proof=${Date.now()}-${width}`, {
      timeout: 60_000,
      waitUntil: "domcontentloaded"
    });
    await page.getByRole("heading", { name: "Publish one official message version everywhere families look." }).waitFor({ timeout: 20_000 });
    await page.getByRole("heading", { name: "Review before publishing" }).waitFor();
    await page.getByText("Never started by publish", { exact: true }).waitFor();

    const metrics = await page.evaluate(() => {
      const surface = document.querySelector(".official-communication-workbench");
      const interactive = [...(surface?.querySelectorAll("button, a, input, select, textarea") ?? [])]
        .filter((element) => {
          const style = window.getComputedStyle(element);
          return style.visibility !== "hidden" &&
            style.display !== "none" &&
            element.getAttribute("type") !== "checkbox";
        })
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            text: (element.getAttribute("aria-label") || element.textContent || "").trim().slice(0, 80),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          };
        });
      return {
        bodyWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth,
        documentOverflow: document.body.scrollWidth > window.innerWidth + 1,
        undersized: interactive.filter((item) => item.width > 0 && item.height > 0 && (item.width < 44 || item.height < 44))
      };
    });
    if (metrics.documentOverflow) {
      throw new Error(`${name} has document overflow: ${metrics.bodyWidth}px in ${metrics.viewportWidth}px.`);
    }
    if (metrics.undersized.length) {
      throw new Error(`${name} has undersized controls: ${JSON.stringify(metrics.undersized.slice(0, 8))}`);
    }
    if (pageErrors.length) throw new Error(`${name} emitted page errors: ${pageErrors.join(" | ")}`);
    await page.screenshot({ fullPage: true, path: join(screenshotDir, `${name}.png`) });
    return {
      name,
      path: "/admin/communications",
      width,
      height,
      documentOverflow: metrics.documentOverflow,
      undersizedInteractiveCount: metrics.undersized.length,
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
    proof.push(await captureViewport(browser, viewport));
    console.log(`captured ${viewport[0]}`);
  }
  writeFileSync(
    join(screenshotDir, "proof.json"),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, proof }, null, 2)}\n`
  );
} finally {
  await browser.close();
}
