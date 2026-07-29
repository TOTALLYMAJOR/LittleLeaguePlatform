import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.REGISTRATION_INVITATION_BASE_URL || "http://127.0.0.1:3022";
const screenshotDir = process.env.REGISTRATION_INVITATION_SCREENSHOT_DIR || "output/playwright/registration-invitation";
const viewports = [
  ["mobile-375", 375, 812],
  ["mobile-390", 390, 844],
  ["tablet-768", 768, 1024],
  ["desktop-1440", 1440, 1100]
];

function loadLocalEnv() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
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

async function addAdminSession(context) {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabase = createClient(
    supabaseUrl,
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
  await addAdminSession(context);
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    await page.goto(`${baseUrl}/admin/registrations?proof=${Date.now()}-${width}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000
    });
    await page.getByRole("heading", { name: "Verify the family match, then issue the right next step." }).waitFor({ timeout: 30_000 });
    const state = await page.evaluate(() => {
      const surface = document.querySelector(".registration-review-page");
      const controls = [...(surface?.querySelectorAll("button, a, input, select, textarea") ?? [])]
        .filter((element) => {
          const style = getComputedStyle(element);
          return style.visibility !== "hidden" && style.display !== "none";
        })
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            text: (element.textContent ?? "").trim().slice(0, 60)
          };
        });
      return {
        surfaceExists: Boolean(surface),
        bodyWidth: document.body.scrollWidth,
        viewportWidth: innerWidth,
        mainRect: (() => {
          const rect = document.querySelector(".main")?.getBoundingClientRect();
          return rect ? { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) } : null;
        })(),
        surfaceRect: (() => {
          const rect = surface?.getBoundingClientRect();
          return rect ? { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) } : null;
        })(),
        documentOverflow: document.body.scrollWidth > innerWidth + 1,
        overflowElements: [...document.querySelectorAll("body *")]
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              selector: `${element.tagName.toLowerCase()}.${[...element.classList].join(".")}`,
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width)
            };
          })
          .filter((item) => item.left < -1 || item.right > innerWidth + 1)
          .slice(0, 8),
        overflowChain: (() => {
          let element = [...document.querySelectorAll("body *")].find((candidate) => candidate.getBoundingClientRect().right > innerWidth + 1);
          const chain = [];
          while (element && chain.length < 8) {
            const rect = element.getBoundingClientRect();
            chain.push({
              selector: `${element.tagName.toLowerCase()}.${[...element.classList].join(".")}`,
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
              minWidth: getComputedStyle(element).minWidth,
              margin: getComputedStyle(element).margin
            });
            element = element.parentElement;
          }
          return chain;
        })(),
        undersized: controls.filter((control) => control.width > 0 && control.height > 0 && (control.width < 44 || control.height < 44)),
        evidenceNoteBlank: (surface?.querySelector("textarea")?.value ?? "") === "",
        hasSelectableReviewer: Boolean(surface?.querySelector("select")),
        hasProviderBoundary: surface?.textContent?.includes("not sent automatically") ?? false
      };
    });
    if (!state.surfaceExists) throw new Error(`${name} did not render registration review.`);
    if (state.documentOverflow) throw new Error(`${name} has document overflow: ${JSON.stringify(state)}`);
    if (state.undersized.length) throw new Error(`${name} has undersized controls: ${JSON.stringify(state.undersized.slice(0, 8))}`);
    if (!state.evidenceNoteBlank) throw new Error(`${name} prefilled the consequential review note.`);
    if (state.hasSelectableReviewer) throw new Error(`${name} allowed the client to select an acting reviewer.`);
    if (!state.hasProviderBoundary) throw new Error(`${name} omitted the manual/provider boundary.`);
    if (pageErrors.length) throw new Error(`${name} emitted page errors: ${pageErrors.join(" | ")}`);
    await page.screenshot({ fullPage: true, path: join(screenshotDir, `${name}.png`) });
    return {
      name,
      path: "/admin/registrations",
      width,
      height,
      documentOverflow: state.documentOverflow,
      undersizedInteractiveCount: state.undersized.length,
      evidenceNoteBlank: state.evidenceNoteBlank,
      selectableReviewerCount: state.hasSelectableReviewer ? 1 : 0,
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
