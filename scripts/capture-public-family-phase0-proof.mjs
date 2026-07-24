import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.PUBLIC_FAMILY_BASE_URL || "http://127.0.0.1:3022";
const screenshotDir = process.env.PUBLIC_FAMILY_SCREENSHOT_DIR || "output/playwright/public-family-phase0";
const executablePath = process.env.PLAYWRIGHT_MCP_EXECUTABLE_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const viewports = [
  ["reflow-320", 320, 800],
  ["mobile-390", 390, 844],
  ["tablet-768", 768, 1024],
  ["desktop-1440", 1440, 1100]
];
const routes = [
  ["home", "/"],
  ["schedule", "/schedule"],
  ["request-access", "/registration"],
  ["sign-in", "/auth"]
];
const forbiddenFamilyCopy = [
  "access grant",
  "invite token",
  "local request",
  "self-registration",
  "raw ics"
];

async function inspectPage(page, routeName, viewportName) {
  const metrics = await page.evaluate(() => {
    const interactive = [...document.querySelectorAll("main button, main a, main input, main select, main textarea")]
      .filter((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label: (element.getAttribute("aria-label") || element.textContent || element.getAttribute("placeholder") || element.tagName).trim().slice(0, 80),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
      });
    return {
      bodyText: document.querySelector("main")?.textContent?.replace(/\s+/g, " ").trim() ?? "",
      actionLabels: interactive.map((item) => item.label.toLowerCase()),
      documentOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      undersized: interactive.filter((item) => item.width < 44 || item.height < 44)
    };
  });

  assert.equal(
    metrics.documentOverflow,
    false,
    `${routeName} ${viewportName} overflows: ${metrics.documentWidth}px document in ${metrics.viewportWidth}px viewport`
  );
  assert.deepEqual(
    metrics.undersized,
    [],
    `${routeName} ${viewportName} has interactive controls smaller than 44px`
  );
  const normalizedCopy = metrics.bodyText.toLowerCase();
  for (const forbidden of forbiddenFamilyCopy) {
    assert.equal(normalizedCopy.includes(forbidden), false, `${routeName} exposes family-facing implementation copy: ${forbidden}`);
  }
  assert.equal(
    metrics.actionLabels.some((label) => label === "create account" || label === "sign up"),
    false,
    `${routeName} must not offer a production create-account action.`
  );
  return metrics;
}

async function assertRouteContract(page, routeName) {
  if (routeName === "home") {
    await page.getByRole("heading", { name: "Stop chasing families. Run the season." }).waitFor();
    await page.getByRole("link", { name: "Request Team Access" }).first().waitFor();
    await page.getByText("Example Parent Replay", { exact: true }).waitFor();
    return;
  }

  if (routeName === "schedule") {
    await page.getByRole("heading", { name: "Know when and where the league plays." }).waitFor();
    await page.getByRole("heading", { name: "League events" }).waitFor();
    await page.getByRole("link", { name: "Apple Calendar" }).waitFor();
    await page.getByRole("link", { name: "Google Calendar" }).waitFor();
    await page.getByRole("link", { name: "Outlook" }).waitFor();
    await page.getByRole("link", { name: "Download calendar" }).waitFor();
    const text = (await page.locator("main").innerText()).toLowerCase();
    assert.equal(text.includes("archived tigers"), false, "Archived teams must not appear on the public schedule.");
    assert.equal(text.includes("leaguepilot demo league"), false, "Another organization must not appear on the public schedule.");
    await page.getByRole("button", { name: "View event" }).first().click();
    assert.equal(
      await page.evaluate(() => window.localStorage.getItem("leaguepilot-install-value-experienced")),
      null,
      "Public schedule browsing must not make the install prompt eligible before a signed-in family action."
    );
    return;
  }

  if (routeName === "request-access") {
    await page.getByRole("heading", { name: "Connect your family to the right team." }).waitFor();
    for (const label of ["Your name", "Your email", "Child's first name", "Child's last initial"]) {
      assert.equal(await page.getByLabel(label, { exact: true }).inputValue(), "", `${label} must not be prefilled.`);
    }
    const teamSelect = page.getByRole("combobox", { name: "Team" });
    assert.equal(await teamSelect.inputValue(), "", "Team must begin unselected.");
    await page.getByRole("heading", { name: "What happens next" }).waitFor();
    await page.getByText(/Privacy promise: children do not create LeaguePilot accounts/).waitFor();
    const options = (await teamSelect.locator("option").allTextContents()).join(" ").toLowerCase();
    assert.equal(options.includes("archived"), false, "Archived teams must not be offered for access requests.");
    assert.equal(options.includes("demo league"), false, "Another organization must not be offered for access requests.");
    return;
  }

  await page.getByRole("heading", { name: "Sign in to your LeaguePilot account." }).waitFor();
  assert.equal(await page.getByLabel("Email", { exact: true }).inputValue(), "", "Sign-in email must not be prefilled.");
  assert.equal(await page.getByLabel("Password", { exact: true }).inputValue(), "", "Sign-in password must not be prefilled.");
  await page.getByRole("heading", { name: "Need access to a team?" }).waitFor();
}

mkdirSync(screenshotDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(executablePath && existsSync(executablePath) ? { executablePath } : {})
});

try {
  const proof = [];
  for (const [viewportName, width, height] of viewports) {
    for (const [routeName, path] of routes) {
      const context = await browser.newContext({
        viewport: { width, height },
        extraHTTPHeaders: { "Cache-Control": "no-cache" }
      });
      const page = await context.newPage();
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));

      try {
        await page.goto(`${baseUrl}${path}?public_family_proof=${Date.now()}-${width}`, {
          timeout: 60_000,
          waitUntil: "domcontentloaded"
        });
        await page.locator("main").waitFor({ timeout: 20_000 });
        await assertRouteContract(page, routeName);
        const metrics = await inspectPage(page, routeName, viewportName);
        assert.deepEqual(pageErrors, [], `${routeName} ${viewportName} emitted browser errors.`);
        await page.evaluate(() => document.querySelector("nextjs-portal")?.remove());
        const screenshot = `${routeName}-${viewportName}.png`;
        await page.screenshot({ fullPage: true, path: join(screenshotDir, screenshot) });
        proof.push({
          routeName,
          path,
          viewportName,
          width,
          height,
          screenshot,
          documentOverflow: metrics.documentOverflow,
          undersizedInteractiveCount: metrics.undersized.length,
          pageErrors
        });
        console.log(`proved ${routeName} at ${viewportName}`);
      } finally {
        await context.close();
      }
    }
  }

  writeFileSync(
    join(screenshotDir, "proof.json"),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, proof }, null, 2)}\n`
  );
} finally {
  await browser.close();
}
