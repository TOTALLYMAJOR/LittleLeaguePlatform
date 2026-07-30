import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const envFile = ".env.local";
const baseUrl = process.env.COMMUNICATION_ROOM_BASE_URL || "http://127.0.0.1:3021";
const screenshotDir = process.env.COMMUNICATION_ROOM_SCREENSHOT_DIR || "output/playwright/communication-room";
const viewports = [
  ["mobile-390", 390, 844],
  ["tablet-768", 768, 1024],
  ["desktop-1440", 1440, 1100]
];

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

function projectRef() {
  return new URL(requireEnv("NEXT_PUBLIC_SUPABASE_URL")).hostname.split(".")[0];
}

async function addParentSession(context) {
  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
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
  await addParentSession(context);
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    await page.goto(`${baseUrl}/parent/messages?communication_room_proof=${Date.now()}-${width}`, {
      timeout: 60_000,
      waitUntil: "domcontentloaded"
    });
    await page.getByRole("heading", { name: "Communication Room" }).waitFor({ timeout: 20_000 });
    await page.getByRole("heading", { name: "Critical · Requires you" }).waitFor();
    if (width <= 820) {
      await page.getByRole("button", { name: /Updates/ }).click();
      await page.getByRole("heading", { name: "Recent from Updates" }).waitFor();
      await page.getByRole("button", { name: /Conversation/ }).click();
      await page.getByRole("heading", { name: "Conversation preview" }).waitFor();
      await page.getByRole("button", { name: /Critical/ }).click();
      await page.getByRole("heading", { name: "Critical · Requires you" }).waitFor();
    } else {
      await page.getByRole("heading", { name: "Recent from Updates" }).waitFor();
      await page.getByRole("heading", { name: "Conversation preview" }).waitFor();
    }

    const metrics = await page.evaluate(() => {
      const surface = document.querySelector(".communication-room");
      const interactive = [...(surface?.querySelectorAll("button, a, input, select, textarea") ?? [])]
        .filter((element) => {
          const style = window.getComputedStyle(element);
          return style.visibility !== "hidden" && style.display !== "none";
        })
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            text: (element.getAttribute("aria-label") || element.textContent || element.getAttribute("placeholder") || "").trim().slice(0, 80),
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
      throw new Error(`${name} has document overflow: ${metrics.bodyWidth}px body in ${metrics.viewportWidth}px viewport.`);
    }
    if (metrics.undersized.length) {
      throw new Error(`${name} has undersized interactive controls: ${JSON.stringify(metrics.undersized.slice(0, 8))}`);
    }
    if (pageErrors.length) {
      throw new Error(`${name} emitted page errors: ${pageErrors.join(" | ")}`);
    }

    await page.screenshot({
      fullPage: true,
      path: join(screenshotDir, `${name}.png`)
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      fullPage: false,
      path: join(screenshotDir, `${name}-viewport.png`)
    });

    await page.getByRole("button", { name: /Conversation/ }).click();
    await page.getByLabel("Reply").fill("Draft for visual proof only. This message will not be sent.");
    await page.screenshot({
      fullPage: true,
      path: join(screenshotDir, `${name}-conversation-draft.png`)
    });

    return {
      name,
      path: "/parent/messages",
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
