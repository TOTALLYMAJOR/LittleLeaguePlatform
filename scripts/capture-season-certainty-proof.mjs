import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const envFile = ".env.local";
const baseUrl = process.env.SEASON_CERTAINTY_BASE_URL || process.env.QA_PROOF_BASE_URL || "http://localhost:3001";
const screenshotDir = process.env.SEASON_CERTAINTY_SCREENSHOT_DIR || "output/playwright/season-certainty";
const routeSpecs = [
  {
    role: "parent",
    path: "/parent",
    credentialKeys: ["QA_PARENT_EMAIL", "QA_PARENT_PASSWORD"],
    readyTexts: [
      "Family Mission Control",
      "RSVP needed",
      "Next event confirmed",
      "Sign in to see your family home.",
      "Family access is not active yet."
    ]
  },
  {
    role: "parent-schedule",
    path: "/parent/schedule",
    credentialKeys: ["QA_PARENT_EMAIL", "QA_PARENT_PASSWORD"],
    readyTexts: [
      "Family schedule",
      "RSVP needed",
      "Sign in to see your family home.",
      "Family access is not active yet."
    ]
  },
  {
    role: "parent-transportation",
    path: "/parent/transportation",
    credentialKeys: ["QA_PARENT_EMAIL", "QA_PARENT_PASSWORD"],
    readyTexts: [
      "Who is getting this child there and home?",
      "Sign in to see your family home.",
      "Family access is not active yet."
    ]
  },
  {
    role: "parent-caregiver",
    path: "/parent/family-access",
    credentialKeys: ["QA_PARENT_EMAIL", "QA_PARENT_PASSWORD"],
    readyTexts: [
      "Choose exactly what one adult may see and do.",
      "Temporary caregiver access is temporarily unavailable.",
      "Sign in to see your family home.",
      "Family access is not active yet."
    ]
  },
  {
    role: "caregiver-acceptance",
    path: "/caregiver/accept",
    credentialKeys: ["QA_PARENT_EMAIL", "QA_PARENT_PASSWORD"],
    readyTexts: [
      "Review every permission before accepting."
    ]
  },
  {
    role: "caregiver-portal",
    path: "/caregiver",
    credentialKeys: ["QA_PARENT_EMAIL", "QA_PARENT_PASSWORD"],
    readyTexts: [
      "No current temporary access.",
      "Temporary caregiver access is temporarily unavailable."
    ]
  },
  {
    role: "coach",
    path: "/coach",
    credentialKeys: ["QA_COACH_EMAIL", "QA_COACH_PASSWORD"],
    readyTexts: [
      "items need attention",
      "Next event ready",
      "Sign in to see coach readiness.",
      "No active coach team is assigned."
    ]
  },
  {
    role: "coach-schedule",
    path: "/coach/schedule",
    credentialKeys: ["QA_COACH_EMAIL", "QA_COACH_PASSWORD"],
    readyTexts: [
      "Now, next, later",
      "Readiness matrix",
      "Sign in to see coach readiness.",
      "No active coach team is assigned."
    ]
  },
  {
    role: "parent-replay",
    path: "/coach/practice-recaps",
    credentialKeys: ["QA_COACH_EMAIL", "QA_COACH_PASSWORD"],
    readyTexts: [
      "Draft awaiting approval",
      "Parent Replay turns every practice",
      "No active coach membership is assigned"
    ]
  },
  {
    role: "admin",
    path: "/admin",
    credentialKeys: ["QA_ADMIN_EMAIL", "QA_ADMIN_PASSWORD"],
    readyTexts: [
      "What is blocking launch?",
      "Organization admin access is required"
    ]
  },
  {
    role: "admin-schedule",
    path: "/admin/schedule-venues",
    credentialKeys: ["QA_ADMIN_EMAIL", "QA_ADMIN_PASSWORD"],
    readyTexts: [
      "League schedule control room",
      "Change lens",
      "Organization admin access is required"
    ]
  }
];
const viewportSpecs = [
  ["mobile-375", 375, 812],
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

function chromiumExecutablePath() {
  const candidates = [
    process.env.PLAYWRIGHT_MCP_EXECUTABLE_PATH,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    process.env.HOME ? `${process.env.HOME}/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome` : ""
  ];
  return candidates.find((candidate) => candidate && existsSync(candidate));
}

function hasCredentials([emailKey, passwordKey]) {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env[emailKey] && process.env[passwordKey]);
}

function supabaseProjectRef() {
  return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
}

async function signIn(page, [emailKey, passwordKey]) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env[emailKey],
    password: process.env[passwordKey]
  });
  if (error || !data.session) throw new Error(error?.message ?? "Supabase session was not returned.");

  const encodedSession = Buffer.from(JSON.stringify(data.session), "utf8").toString("base64url");
  await page.context().addCookies([{
    name: `sb-${supabaseProjectRef()}-auth-token`,
    value: `base64-${encodedSession}`,
    domain: new URL(baseUrl).hostname,
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
    expires: Math.floor(Date.now() / 1000) + 60 * 60
  }]);
}

async function waitForAnyText(page, texts) {
  try {
    return await Promise.any(texts.map(async (text) => {
      await page.getByText(text, { exact: false }).first().waitFor({ timeout: 12_000 });
      return text;
    }));
  } catch {
    throw new Error(`None of the expected route texts rendered: ${texts.join(" | ")}`);
  }
}

function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}

async function captureRoute(browser, routeSpec) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    extraHTTPHeaders: {
      "Cache-Control": "no-cache"
    }
  });
  const page = await context.newPage();
  const browserErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  const signedIn = hasCredentials(routeSpec.credentialKeys);
  const proof = {
    role: routeSpec.role,
    path: routeSpec.path,
    signedIn,
    matchedText: "",
    firstViewportText: "",
    browserErrors,
    viewports: []
  };

  try {
    console.log(`starting ${routeSpec.role} proof on ${baseUrl}${routeSpec.path}`);
    if (signedIn) {
      try {
        await signIn(page, routeSpec.credentialKeys);
      } catch (error) {
        proof.signedIn = false;
        proof.signInError = error instanceof Error ? error.message : String(error);
      }
    }

    for (const [name, width, height] of viewportSpecs) {
      await page.setViewportSize({ width, height });
      await page.goto(`${baseUrl}${routeSpec.path}?season_certainty_proof=${Date.now()}-${width}`, { waitUntil: "domcontentloaded" });
      proof.matchedText = await waitForAnyText(page, routeSpec.readyTexts);
      await page.waitForTimeout(500);
      await page.evaluate(() => window.scrollTo(0, 0));
      const layout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth
      }));
      proof.viewports.push({ name, width, height, ...layout });
      if (layout.scrollWidth > layout.clientWidth) {
        const overflowElements = await page.evaluate(() => [...document.querySelectorAll("body *")]
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              selector: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${[...element.classList].slice(0, 3).map((name) => `.${name}`).join("")}`,
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
              clientWidth: element.clientWidth,
              scrollWidth: element.scrollWidth,
              minWidth: getComputedStyle(element).minWidth
            };
          })
          .filter((rect) => rect.left < 0 || rect.right > document.documentElement.clientWidth || rect.scrollWidth > rect.clientWidth)
          .sort((left, right) => (right.scrollWidth - right.clientWidth) - (left.scrollWidth - left.clientWidth))
          .slice(0, 16));
        throw new Error(`${routeSpec.role} ${name} has document overflow: ${layout.scrollWidth}px > ${layout.clientWidth}px. ${JSON.stringify(overflowElements)}`);
      }
      if (name === "mobile-375") {
        proof.firstViewportText = normalizeText(await page.locator("body").innerText({ timeout: 15_000 }));
      }
      await page.screenshot({
        path: join(screenshotDir, `${routeSpec.role}-${name}.png`),
        caret: "initial"
      });
      console.log(`captured ${routeSpec.role}-${name}.png`);
      if (routeSpec.role === "parent-schedule" && name === "mobile-390") {
        const sheetTrigger = page.getByRole("button", { name: "Game-day sheet" }).first();
        if (await sheetTrigger.count()) {
          await sheetTrigger.click();
          const sheet = page.getByText("Game-day command sheet", { exact: true }).first();
          try {
            await sheet.waitFor({ timeout: 8_000 });
            await sheet.scrollIntoViewIfNeeded();
            await page.screenshot({
              path: join(screenshotDir, "parent-schedule-sheet-mobile-390.png"),
              caret: "initial"
            });
            console.log("captured parent-schedule-sheet-mobile-390.png");
          } catch {
            console.log("skipped optional parent schedule sheet capture because the sheet did not open in this access state");
          }
        }
      }
      if (routeSpec.role === "admin-schedule" && name === "desktop-1440") {
        const proposedLocation = page.getByLabel("Proposed location").first();
        if (await proposedLocation.count()) {
          await proposedLocation.fill("Field 2");
          try {
            await page.getByText("1 changed", { exact: true }).first().waitFor({ timeout: 8_000 });
            await page.screenshot({
              path: join(screenshotDir, "admin-schedule-change-lens-desktop-1440.png"),
              caret: "initial"
            });
            console.log("captured admin-schedule-change-lens-desktop-1440.png");
          } catch {
            console.log("skipped optional admin change-lens capture because editable schedule data is unavailable in this access state");
          }
        }
      }
    }
  } finally {
    await context.close();
  }

  return proof;
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
    const proofs = [];
    const requestedRole = process.env.SEASON_CERTAINTY_ROLE;
    const requestedRoles = requestedRole?.split(",").map((role) => role.trim()).filter(Boolean) ?? [];
    const selectedRouteSpecs = requestedRoles.length
      ? routeSpecs.filter((routeSpec) => requestedRoles.includes(routeSpec.role))
      : routeSpecs;
    if (selectedRouteSpecs.length !== (requestedRoles.length || routeSpecs.length)) {
      throw new Error(`Unknown or duplicate SEASON_CERTAINTY_ROLE selection: ${requestedRole}`);
    }
    for (const routeSpec of selectedRouteSpecs) {
      proofs.push(await captureRoute(browser, routeSpec));
    }

    for (const proof of proofs) {
      const signInState = proof.signedIn ? "signed-in QA state" : "access-gated or signed-out state";
      const signInNote = proof.signInError ? ` (${proof.signInError})` : "";
      console.log(`${proof.role}: captured ${signInState}${signInNote}; matched "${proof.matchedText}"`);
      if (proof.browserErrors.length) throw new Error(`${proof.role} emitted browser errors: ${proof.browserErrors.join(" | ")}`);
    }
    writeFileSync(join(screenshotDir, "proof.json"), `${JSON.stringify({
      baseUrl,
      capturedAt: new Date().toISOString(),
      proofs
    }, null, 2)}\n`);
    console.log(`Season Certainty screenshots saved under ${screenshotDir}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
