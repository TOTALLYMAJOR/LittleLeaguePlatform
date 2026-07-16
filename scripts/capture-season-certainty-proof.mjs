import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const envFile = ".env.local";
const baseUrl = process.env.SEASON_CERTAINTY_BASE_URL || process.env.QA_PROOF_BASE_URL || "http://localhost:3001";
const screenshotDir = "output/playwright/season-certainty";
const routeSpecs = [
  {
    role: "parent",
    path: "/parent",
    credentialKeys: ["QA_PARENT_EMAIL", "QA_PARENT_PASSWORD"],
    readyTexts: [
      "What do I need to know before the next event?",
      "Sign in to see your family home.",
      "Family access is not active yet."
    ]
  },
  {
    role: "coach",
    path: "/coach",
    credentialKeys: ["QA_COACH_EMAIL", "QA_COACH_PASSWORD"],
    readyTexts: [
      "Is the next event ready?",
      "Sign in to see coach readiness.",
      "No active coach team is assigned."
    ]
  },
  {
    role: "admin",
    path: "/admin",
    credentialKeys: ["QA_ADMIN_EMAIL", "QA_ADMIN_PASSWORD"],
    readyTexts: [
      "Which teams need help before families complain?",
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
  for (const text of texts) {
    const locator = page.getByText(text, { exact: false }).first();
    try {
      await locator.waitFor({ timeout: 8_000 });
      return text;
    } catch {
      // Try the next known state.
    }
  }
  throw new Error(`None of the expected route texts rendered: ${texts.join(" | ")}`);
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
  const signedIn = hasCredentials(routeSpec.credentialKeys);
  const proof = {
    role: routeSpec.role,
    path: routeSpec.path,
    signedIn,
    matchedText: "",
    firstViewportText: ""
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
      if (name === "mobile-375") {
        proof.firstViewportText = normalizeText(await page.locator("body").innerText({ timeout: 15_000 }));
      }
      await page.screenshot({
        path: join(screenshotDir, `${routeSpec.role}-${name}.png`)
      });
      console.log(`captured ${routeSpec.role}-${name}.png`);
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
    for (const routeSpec of routeSpecs) {
      proofs.push(await captureRoute(browser, routeSpec));
    }

    for (const proof of proofs) {
      const signInState = proof.signedIn ? "signed-in QA state" : "access-gated or signed-out state";
      const signInNote = proof.signInError ? ` (${proof.signInError})` : "";
      console.log(`${proof.role}: captured ${signInState}${signInNote}; matched "${proof.matchedText}"`);
    }
    console.log(`Season Certainty screenshots saved under ${screenshotDir}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
