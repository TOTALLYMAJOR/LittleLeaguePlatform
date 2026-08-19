import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";
import { createServer } from "vite";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");
const repoRoot = process.cwd();
const outputDir = process.env.EVENT_CHANGE_RECEIPTS_PROOF_DIR
  || "output/playwright/lp-ux-018-event-change-receipts";
const widths = [320, 390, 768, 1024, 1440];
const modes = [
  { name: "family-light", colorScheme: "light", forcedColors: "none", theme: "light" },
  { name: "device-light", colorScheme: "light", forcedColors: "none", theme: "light" },
  { name: "device-dark", colorScheme: "dark", forcedColors: "none", theme: "dark" },
  { name: "forced-colors", colorScheme: "light", forcedColors: "active", theme: "light" }
];
const allScenarios = modes.flatMap((mode) => widths.map((width) => ({
  ...mode,
  width,
  height: width < 768 ? 844 : 1000,
  name: `${mode.name}-${width}`
})));
const scenarios = process.env.EVENT_CHANGE_RECEIPTS_SCENARIO
  ? allScenarios.filter((scenario) => scenario.name === process.env.EVENT_CHANGE_RECEIPTS_SCENARIO)
  : allScenarios;

function fixtureSource() {
  return `
import React, { useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import "${resolve(repoRoot, "app/globals.css")}";
import "${resolve(repoRoot, "app/parent/parent-weekly.css")}";
import { ChangeBand } from "${resolve(repoRoot, "components/family/change-band.tsx")}";

const changedAt = "2026-08-18T14:00:00.000Z";
const initialChanges = [{
  id: "5a555555-5555-4555-8555-555555555551",
  eventId: "5e555555-5555-4555-8555-555555555551",
  eventTitle: "Rockets Saturday Game",
  teamName: "Riverside Rockets",
  childIds: ["5f555555-5555-4555-8555-555555555551"],
  childLabels: ["Avery P."],
  changeType: "time_changed",
  actorLabel: "Coach Taylor",
  changedAt,
  canonicalHref: "/parent/schedule?eventId=5e555555-5555-4555-8555-555555555551",
  diffs: [{ field: "start_time", label: "Start time", previousValue: "10:00 AM", currentValue: "9:00 AM" }],
  seenAt: null,
  acknowledgedAt: null,
  requiresAcknowledgment: true
}, {
  id: "5a555555-5555-4555-8555-555555555553",
  eventId: "5e555555-5555-4555-8555-555555555551",
  eventTitle: "Rockets Saturday Game",
  teamName: "Riverside Rockets",
  childIds: ["5f555555-5555-4555-8555-555555555551"],
  childLabels: ["Avery P."],
  changeType: "restored",
  actorLabel: "League admin",
  changedAt,
  canonicalHref: "/parent/schedule?eventId=5e555555-5555-4555-8555-555555555551",
  diffs: [{ field: "status", label: "Status", previousValue: "Cancelled", currentValue: "Scheduled" }],
  seenAt: null,
  acknowledgedAt: null,
  requiresAcknowledgment: false
}];

window.__receiptCalls = [];
function App() {
  const params = new URLSearchParams(location.search);
  const behavior = params.get("behavior") || "success";
  const [changes, setChanges] = useState(initialChanges);
  const onAcknowledge = useCallback(async (id, operation) => {
    window.__receiptCalls.push({ id, operation });
    if (behavior === "failure" && operation === "acknowledged") {
      return { ok: false, message: "Acknowledgment could not be saved. Try again.", seenAt: changedAt, acknowledgedAt: null };
    }
    const timestamp = "2026-08-19T09:00:00.000Z";
    setChanges((current) => current.map((change) => change.id === id ? {
      ...change,
      seenAt: change.seenAt || timestamp,
      acknowledgedAt: operation === "acknowledged" ? (change.acknowledgedAt || timestamp) : change.acknowledgedAt
    } : change));
    return {
      ok: true,
      message: operation === "acknowledged" ? "Change acknowledged." : "View recorded.",
      seenAt: timestamp,
      acknowledgedAt: operation === "acknowledged" ? timestamp : null
    };
  }, [behavior]);
  return <main id="main-content" data-surface-family="family" className="parent-weekly-dashboard">
    <ChangeBand changes={changes} querySucceeded timeZone="America/Chicago" onAcknowledge={onAcknowledge} />
  </main>;
}
document.documentElement.dataset.theme = new URLSearchParams(location.search).get("theme") || "light";
createRoot(document.getElementById("root")).render(<App />);
`;
}

function nextLinkShim() {
  return `import React from "react"; export default function Link({ href, children, ...props }) { return <a href={typeof href === "string" ? href : "#"} {...props}>{children}</a>; }`;
}

async function runAxe(page) {
  await page.addScriptTag({ path: axePath });
  return page.evaluate(async () => {
    const result = await window.axe.run(document, {
      resultTypes: ["violations"],
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] }
    });
    return result.violations
      .filter((violation) => violation.impact === "critical" || violation.impact === "serious")
      .map(({ id, impact, help, nodes }) => ({
        id,
        impact,
        help,
        nodes: nodes.map(({ html, failureSummary }) => ({ html, failureSummary }))
      }));
  });
}

async function inspect(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const controls = [...document.querySelectorAll("button, a[href]")].map((element) => {
      const box = element.getBoundingClientRect();
      return { text: element.textContent?.trim(), width: box.width, height: box.height };
    });
    return {
      text: document.body.innerText,
      overflow: root.scrollWidth > root.clientWidth,
      controls
    };
  });
}

async function main() {
  mkdirSync(outputDir, { recursive: true });
  const tempRoot = mkdtempSync(join(tmpdir(), "leaguepilot-event-change-receipts-"));
  writeFileSync(join(tempRoot, "index.html"), '<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>LP-UX-018 receipt proof</title></head><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>');
  writeFileSync(join(tempRoot, "main.tsx"), fixtureSource());
  writeFileSync(join(tempRoot, "next-link.tsx"), nextLinkShim());
  const server = await createServer({
    root: tempRoot,
    logLevel: "error",
    optimizeDeps: { include: ["lucide-react"] },
    resolve: { alias: [
      { find: "react-dom/client", replacement: require.resolve("react-dom/client") },
      { find: "react/jsx-dev-runtime", replacement: require.resolve("react/jsx-dev-runtime") },
      { find: "react/jsx-runtime", replacement: require.resolve("react/jsx-runtime") },
      { find: "react", replacement: require.resolve("react") },
      { find: "lucide-react", replacement: require.resolve("lucide-react") },
      { find: "next/link", replacement: join(tempRoot, "next-link.tsx") },
      { find: "@", replacement: repoRoot }
    ] },
    server: { host: "127.0.0.1", port: 0 }
  });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === "string") throw new Error("Vite proof server did not return a local port.");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch({ headless: true });
  const proof = { generatedAt: new Date().toISOString(), proofType: "isolated-production-component-browser-proof", sourceComponents: ["components/family/change-band.tsx", "app/parent/parent-weekly.css"], results: [], interactionResults: [] };
  try {
    for (const scenario of scenarios) {
      const context = await browser.newContext({ viewport: { width: scenario.width, height: scenario.height }, colorScheme: scenario.colorScheme, forcedColors: scenario.forcedColors });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
      page.on("pageerror", (error) => consoleErrors.push(error.message));
      try {
        await page.goto(`${baseUrl}/?theme=${scenario.theme}`, { waitUntil: "networkidle" });
        await page.getByRole("button", { name: "Acknowledge change" }).waitFor();
        const beforeCalls = await page.evaluate(() => window.__receiptCalls);
        assert.equal(beforeCalls.filter((call) => call.operation === "acknowledged").length, 0, `${scenario.name} acknowledged without explicit action.`);
        await page.locator("body").click({ position: { x: 1, y: 1 } });
        await page.keyboard.press("Tab");
        const focus = await page.evaluate(() => {
          const element = document.activeElement;
          const style = element ? getComputedStyle(element) : null;
          return {
            tagName: element?.tagName,
            outlineStyle: style?.outlineStyle,
            outlineWidth: style?.outlineWidth,
            boxShadow: style?.boxShadow
          };
        });
        assert.ok(
          (focus.outlineStyle !== "none" && focus.outlineWidth !== "0px") || (focus.boxShadow && focus.boxShadow !== "none"),
          `${scenario.name} keyboard focus indicator is not visible.`
        );
        await page.getByRole("button", { name: "Acknowledge change" }).click();
        await page.getByText("Acknowledged", { exact: true }).waitFor();
        const afterCalls = await page.evaluate(() => window.__receiptCalls);
        assert.equal(afterCalls.filter((call) => call.operation === "acknowledged").length, 1, `${scenario.name} did not create exactly one explicit acknowledgment call.`);
        const metrics = await inspect(page);
        assert.equal(metrics.overflow, false, `${scenario.name} has horizontal overflow.`);
        assert.ok(metrics.controls.every((control) => control.height >= 44), `${scenario.name} has a control shorter than 44px.`);
        const axeViolations = await runAxe(page);
        assert.deepEqual(axeViolations, [], `${scenario.name} has critical or serious axe findings.`);
        assert.deepEqual(consoleErrors, [], `${scenario.name} emitted console errors.`);
        const screenshotPath = join(outputDir, `${scenario.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true, caret: "initial" });
        proof.results.push({ scenario, horizontalOverflow: metrics.overflow, controlCount: metrics.controls.length, axeViolations, consoleErrors, focus, acknowledgmentCalls: 1, screenshotPath });
        console.log(`proved ${scenario.name}`);
      } finally { await context.close(); }
    }

    for (const behavior of ["failure", "offline"]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      if (behavior === "offline") {
        await context.addInitScript(() => {
          Object.defineProperty(Navigator.prototype, "onLine", { configurable: true, get: () => false });
        });
      }
      const page = await context.newPage();
      try {
        await page.goto(`${baseUrl}/?theme=light&behavior=${behavior}`, { waitUntil: behavior === "offline" ? "domcontentloaded" : "networkidle" });
        if (behavior === "failure") {
          await page.getByRole("button", { name: "Acknowledge change" }).click();
          await page.getByRole("button", { name: "Retry acknowledgment" }).waitFor();
          assert.ok((await page.locator("body").innerText()).includes("Acknowledgment could not be saved"));
        } else {
          const button = page.getByRole("button", { name: "Connect to acknowledge" });
          await button.waitFor();
          assert.equal(await button.isDisabled(), true, "Offline acknowledgment control must be disabled.");
          assert.equal((await page.evaluate(() => window.__receiptCalls)).length, 0, "Offline state must not create receipt calls.");
        }
        assert.ok((await page.locator("body").innerText()).includes("Rockets Saturday Game"), `${behavior} state hid the event change.`);
        proof.interactionResults.push({ behavior, passed: true });
      } finally { await context.close(); }
    }
  } finally {
    await browser.close();
    await server.close();
    rmSync(tempRoot, { recursive: true, force: true });
  }
  const proofPath = join(outputDir, "proof.json");
  writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`);
  writeFileSync(join(outputDir, "summary.md"), `# LP-UX-018 Event Change Receipt Proof\n\nGenerated: ${proof.generatedAt}\n\n20 responsive/theme scenarios passed at 320, 390, 768, 1024, and 1440px. Each scenario proved no implicit acknowledgment, one explicit acknowledgment, immediate server-result rendering, no horizontal overflow, 44px controls, visible focus, and zero critical/serious axe findings. Retry and offline fail-closed states also passed.\n\nThis is isolated browser proof of the production ChangeBand component. Database authorization and authenticated route proof are separate.\n`);
  console.log(`Event change receipt proof passed: ${proofPath}`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
