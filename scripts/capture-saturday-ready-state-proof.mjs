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
const outputDir = process.env.SATURDAY_READY_PROOF_DIR || "output/playwright/lp-ux-002-saturday-ready";

const scenarios = [
  { name: "multi-mixed-320", state: "multi-mixed", width: 320, height: 844, colorScheme: "light", forcedColors: "none" },
  { name: "multi-mixed-390", state: "multi-mixed", width: 390, height: 844, colorScheme: "light", forcedColors: "none" },
  { name: "multi-mixed-768", state: "multi-mixed", width: 768, height: 1024, colorScheme: "light", forcedColors: "none" },
  { name: "multi-mixed-1024", state: "multi-mixed", width: 1024, height: 900, colorScheme: "light", forcedColors: "none" },
  { name: "multi-mixed-1440", state: "multi-mixed", width: 1440, height: 1000, colorScheme: "light", forcedColors: "none" },
  { name: "single-unresolved-390", state: "single-unresolved", width: 390, height: 844, colorScheme: "light", forcedColors: "none" },
  { name: "single-resolved-390", state: "single-resolved", width: 390, height: 844, colorScheme: "light", forcedColors: "none" },
  { name: "loading-390", state: "loading", width: 390, height: 844, colorScheme: "light", forcedColors: "none" },
  { name: "error-390", state: "error", width: 390, height: 844, colorScheme: "light", forcedColors: "none" },
  { name: "multi-device-dark-390", state: "multi-mixed", width: 390, height: 844, colorScheme: "dark", forcedColors: "none" },
  { name: "multi-forced-colors-390", state: "multi-mixed", width: 390, height: 844, colorScheme: "light", forcedColors: "active" }
];

function fixtureSource() {
  return `
import React from "react";
import { createRoot } from "react-dom/client";
import "${resolve(repoRoot, "app/globals.css")}";
import "${resolve(repoRoot, "app/parent/parent-weekly.css")}";
import { EventPassport } from "${resolve(repoRoot, "components/family/event-passport.tsx")}";
import { MultiChildReadiness } from "${resolve(repoRoot, "components/family/multi-child-readiness.tsx")}";
import { ReadinessStrip } from "${resolve(repoRoot, "components/family/readiness-strip.tsx")}";
import { buildChildSaturdayReadiness } from "${resolve(repoRoot, "components/family/readiness.ts")}";
import ParentHomeLoading from "${resolve(repoRoot, "app/parent/loading.tsx")}";
import ParentHomeError from "${resolve(repoRoot, "app/parent/error.tsx")}";

const childA = { id: "player-a", label: "Avery P.", teamId: "team-a", teamName: "Riverside Rockets" };
const childB = { id: "player-b", label: "Mason T.", teamId: "team-b", teamName: "Northside Waves" };
const childC = { id: "player-c", label: "Noah B.", teamId: "team-c", teamName: "Parkside Stars" };
function event(child, overrides = {}) {
  return {
    projectionId: "event-" + child.id + ":" + child.id,
    eventId: "event-" + child.id,
    scheduleVersion: 3,
    childId: child.id,
    childLabel: child.label,
    teamId: child.teamId,
    teamName: child.teamName,
    title: child.id === "player-a" ? "Rockets Saturday Game" : "Waves Saturday Practice",
    activityLabel: "Game",
    dateLabel: "Sat, Aug 8",
    startLabel: child.id === "player-a" ? "9:00 AM" : "1:30 PM",
    startsAt: child.id === "player-a" ? "2026-08-08T14:00:00.000Z" : "2026-08-08T18:30:00.000Z",
    endsAt: child.id === "player-a" ? "2026-08-08T16:00:00.000Z" : "2026-08-08T20:00:00.000Z",
    arrivalLabel: "8:30 AM",
    leaveLabel: "8:00 AM",
    opponentLabel: "Northside Waves",
    venueLabel: "Demo Field 1",
    addressLabel: "100 Demo League Way",
    fieldLabel: "Field 1",
    status: "scheduled",
    statusLabel: "Scheduled",
    rsvpLabel: "Needs reply",
    rsvpNeedsAction: true,
    rsvpOutdated: false,
    responsibleAdultLabel: "Not assigned",
    transportationAssigned: false,
    outboundResponsibilityLabel: "Not assigned",
    returnResponsibilityLabel: "Not assigned",
    bringLabel: "Glove · water",
    changed: false,
    changedLabel: "No changes",
    sourceLabel: "Official team schedule",
    freshnessLabel: "Loaded live · updated Aug 1",
    primaryAction: { label: "Open schedule", href: "/parent/schedule?eventId=event-" + child.id },
    unresolved: [],
    ...overrides
  };
}
const eventA = event(childA);
const eventB = event(childB, {
  rsvpLabel: "Going",
  rsvpNeedsAction: false,
  responsibleAdultLabel: "Outbound: Jordan P. · Return: Riley P.",
  transportationAssigned: true
});
const criticalReceipt = {
  notificationId: "critical-a",
  organizationId: "org-1",
  teamId: "team-a",
  eventId: eventA.eventId,
  recipientUserId: "parent-1",
  title: "Weather delay",
  body: "Review the official delay.",
  channel: "email",
  notificationType: "weather_alert",
  notificationStatus: "read",
  providerApprovalStatus: "approved",
  createdAt: "2026-08-07T12:00:00.000Z",
  evidence: { attemptStatus: "sent" }
};
const acknowledgedCriticalReceipt = {
  ...criticalReceipt,
  notificationId: "critical-b",
  teamId: childB.teamId,
  eventId: eventB.eventId,
  evidence: {
    ...criticalReceipt.evidence,
    acknowledgedAt: "2026-08-07T14:00:00.000Z"
  }
};
const openRide = {
  id: "ride-a",
  eventId: eventA.eventId,
  playerId: childA.id,
  childLabel: childA.label,
  teamName: childA.teamName,
  eventTitle: eventA.title,
  startsAt: eventA.startsAt,
  direction: "outbound",
  state: "open",
  stateLabel: "Needs a driver",
  scheduleVersion: 3,
  currentScheduleVersion: 3,
  requestedByLabel: "Jordan P.",
  requestedAt: "2026-08-07T10:00:00.000Z",
  canOffer: false,
  canAccept: false,
  canWithdrawRequest: true,
  canWithdrawAssignment: false,
  explanation: "Waiting for an offer."
};
const transportBase = { ok: true, message: "Loaded.", events: [], requests: [], responsibilities: [] };
const changeA = {
  id: "change-a",
  eventId: eventA.eventId,
  eventTitle: eventA.title,
  teamName: childA.teamName,
  childIds: [childA.id],
  childLabels: [childA.label],
  changeType: "time_changed",
  actorLabel: "Coach Taylor",
  changedAt: "2026-08-07T13:00:00.000Z",
  canonicalHref: "/parent/schedule?eventId=" + eventA.eventId,
  diffs: [{ field: "start_time", label: "Start time", previousValue: "10:00 AM", currentValue: "9:00 AM" }]
};
function summary({ child, nextEvent, response, receipts = [], transportationData = transportBase, changes = [] }) {
  return buildChildSaturdayReadiness({
    child,
    event: nextEvent,
    currentRsvp: response,
    notificationReceipts: receipts,
    notificationLoadOk: true,
    transportationData,
    visibleChanges: changes,
    eventChangeLoadOk: true,
    conflicts: []
  });
}
function Single({ resolved }) {
  const receipts = resolved
    ? [{ ...criticalReceipt, evidence: { ...criticalReceipt.evidence, acknowledgedAt: "2026-08-07T14:00:00.000Z" } }]
    : [criticalReceipt];
  const transportationData = resolved
    ? {
      ...transportBase,
      responsibilities: [
        { eventId: eventA.eventId, playerId: childA.id, direction: "outbound", state: "assigned", adultLabel: "Jordan P." },
        { eventId: eventA.eventId, playerId: childA.id, direction: "return", state: "assigned", adultLabel: "Riley P." }
      ]
    }
    : { ...transportBase, requests: [openRide] };
  const selectedEvent = resolved ? { ...eventA, rsvpNeedsAction: false, rsvpLabel: "Going", transportationAssigned: true } : eventA;
  const selected = summary({
    child: childA,
    nextEvent: selectedEvent,
    response: resolved ? "going" : undefined,
    receipts,
    transportationData,
    changes: resolved ? [] : [changeA]
  });
  return <div className="parent-weekly-dashboard">
    <MultiChildReadiness summaries={[selected]} />
    <EventPassport
      event={selectedEvent}
      currentResponse={resolved ? "going" : undefined}
      currentLockVersion={2}
      canWriteRsvp
      transportationLane={selected.lanes.find((lane) => lane.id === "transportation")}
    />
    <ReadinessStrip eventTitle={selectedEvent.title} items={selected.unresolvedItems} />
  </div>;
}
function Multi() {
  const summaries = [
    summary({
      child: childA,
      nextEvent: eventA,
      receipts: [criticalReceipt],
      transportationData: { ...transportBase, requests: [openRide] },
      changes: [changeA]
    }),
    summary({
      child: childB,
      nextEvent: eventB,
      response: "going",
      receipts: [acknowledgedCriticalReceipt],
      transportationData: transportBase
    }),
    summary({ child: childC })
  ];
  return <div className="parent-weekly-dashboard"><MultiChildReadiness summaries={summaries} /></div>;
}
function App() {
  const state = new URLSearchParams(location.search).get("state");
  if (state === "loading") return <main id="main-content"><ParentHomeLoading /></main>;
  if (state === "error") return <main id="main-content"><ParentHomeError reset={() => undefined} /></main>;
  return <main id="main-content"><div data-surface-family="family" style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>{state === "single-unresolved" ? <Single resolved={false} /> : state === "single-resolved" ? <Single resolved /> : <Multi />}</div></main>;
}
createRoot(document.getElementById("root")).render(<App />);
`;
}

function nextLinkShim() {
  return `import React from "react"; export default function Link({ href, children, ...props }) { return <a href={typeof href === "string" ? href : href?.pathname || "#"} {...props}>{children}</a>; }`;
}

function providersShim() {
  return "export function markLeaguePilotValueExperienced() {}";
}

function browserClientShim() {
  return "export function createSupabaseBrowserClient() { return { auth: { getSession: async () => ({ data: { session: null } }) } }; }";
}

async function runAxe(page, forcedColorsActive) {
  await page.addScriptTag({ path: axePath });
  return page.evaluate(async ({ forcedColorsActive }) => {
    const report = await window.axe.run(document, {
      resultTypes: ["violations"],
      rules: forcedColorsActive ? { "color-contrast": { enabled: false } } : undefined,
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]
      }
    });
    return report.violations
      .filter((violation) => violation.impact === "critical" || violation.impact === "serious")
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        targets: violation.nodes.map((node) => node.target.join(" ")),
        summaries: violation.nodes.map((node) => node.failureSummary)
      }));
  }, { forcedColorsActive });
}

async function inspect(page, scenario) {
  return page.evaluate(({ scenario }) => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const controls = [...document.querySelectorAll("button, a[href]")].filter(visible).map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        label: element.getAttribute("aria-label") || element.textContent?.trim() || element.tagName,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        href: element.getAttribute("href")
      };
    });
    const text = document.body.innerText.replace(/\s+/g, " ").trim();
    return {
      state: scenario.state,
      mainCount: document.querySelectorAll("main").length,
      headingCount: document.querySelectorAll("h1").length,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      forcedColorsActive: matchMedia("(forced-colors: active)").matches,
      familyLightMarker: document.querySelector("[data-surface-family='family']")
        ? getComputedStyle(document.querySelector("[data-surface-family='family']")).colorScheme
        : null,
      controls,
      text,
      childSummaries: document.querySelectorAll(".family-child-readiness").length
    };
  }, { scenario });
}

function assertScenario(metrics, scenario) {
  assert.equal(metrics.mainCount, 1, `${scenario.name} must contain exactly one main.`);
  assert.equal(metrics.documentWidth, metrics.viewportWidth, `${scenario.name} overflowed horizontally.`);
  assert.equal(metrics.forcedColorsActive, scenario.forcedColors === "active", `${scenario.name} forced-colors mode drifted.`);
  for (const control of metrics.controls) {
    assert.ok(control.height >= 44, `${scenario.name} control "${control.label}" is ${control.height}px tall.`);
  }
  if (scenario.state === "multi-mixed") {
    assert.equal(metrics.childSummaries, 3, `${scenario.name} did not render every linked child fixture.`);
    for (const text of [
      "Rockets Saturday Game",
      "Waves Saturday Practice",
      "No upcoming official Saturday event is visible for this child.",
      "A critical message needs your acknowledgement",
      "Ride help was requested and awaits an offer",
      "Acknowledged by you",
      "Nothing unresolved",
      "No ride help requested"
    ]) {
      assert.ok(metrics.text.includes(text), `${scenario.name} is missing "${text}".`);
    }
    assert.ok(metrics.controls.some((control) => control.href?.includes("#communication-message-critical-a")), `${scenario.name} lost its exact critical-message link.`);
    assert.ok(metrics.controls.some((control) => control.href?.includes("#transportation-request-ride-a")), `${scenario.name} lost its exact transportation link.`);
  }
  if (scenario.state === "single-unresolved") {
    for (const text of ["Going", "Maybe", "Can’t go", "A critical message needs your acknowledgement", "Ride help was requested and awaits an offer"]) {
      assert.ok(metrics.text.includes(text), `${scenario.name} is missing "${text}".`);
    }
  }
  if (scenario.state === "single-resolved") {
    assert.ok(metrics.text.includes("Nothing unresolved for Saturday"), `${scenario.name} is not honestly resolved.`);
    assert.ok(metrics.text.includes("Acknowledged by you"), `${scenario.name} lost viewer acknowledgement evidence.`);
    assert.ok(metrics.text.includes("Outbound: Jordan P. · Return: Riley P."), `${scenario.name} lost accepted transportation evidence.`);
  }
  if (scenario.state === "loading") {
    assert.equal(metrics.headingCount, 1, "Loading state lost its accessible heading.");
    assert.ok(metrics.text.includes("Loading Family Home"), "Loading state lost its announcement.");
  }
  if (scenario.state === "error") {
    assert.equal(metrics.headingCount, 1, "Error state lost its accessible heading.");
    assert.ok(metrics.text.includes("Try again"), "Error state lost its retry action.");
  }
}

async function main() {
  mkdirSync(outputDir, { recursive: true });
  const tempRoot = mkdtempSync(join(tmpdir(), "leaguepilot-saturday-ready-"));
  writeFileSync(join(tempRoot, "index.html"), '<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>LP-UX-002 Saturday Ready proof</title></head><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>');
  writeFileSync(join(tempRoot, "main.tsx"), fixtureSource());
  writeFileSync(join(tempRoot, "next-link.tsx"), nextLinkShim());
  writeFileSync(join(tempRoot, "providers.ts"), providersShim());
  writeFileSync(join(tempRoot, "browser-client.ts"), browserClientShim());

  const server = await createServer({
    root: tempRoot,
    logLevel: "error",
    optimizeDeps: {
      include: ["lucide-react"]
    },
    resolve: {
      alias: [
        { find: "react-dom/client", replacement: require.resolve("react-dom/client") },
        { find: "react/jsx-dev-runtime", replacement: require.resolve("react/jsx-dev-runtime") },
        { find: "react/jsx-runtime", replacement: require.resolve("react/jsx-runtime") },
        { find: "react", replacement: require.resolve("react") },
        { find: "lucide-react", replacement: require.resolve("lucide-react") },
        { find: "next/link", replacement: join(tempRoot, "next-link.tsx") },
        { find: "@/app/providers", replacement: join(tempRoot, "providers.ts") },
        { find: "@/lib/supabase/browser", replacement: join(tempRoot, "browser-client.ts") },
        { find: "@", replacement: repoRoot }
      ]
    },
    server: { host: "127.0.0.1", port: 0 }
  });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === "string") throw new Error("Vite proof server did not return a local port.");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch({ headless: true });
  const proof = {
    generatedAt: new Date().toISOString(),
    proofType: "isolated-browser-component-state-matrix",
    sourceComponents: [
      "components/family/event-passport.tsx",
      "components/family/multi-child-readiness.tsx",
      "components/family/readiness-strip.tsx",
      "components/family/readiness.ts",
      "app/parent/loading.tsx",
      "app/parent/error.tsx"
    ],
    results: []
  };

  try {
    for (const scenario of scenarios) {
      const context = await browser.newContext({
        viewport: { width: scenario.width, height: scenario.height },
        colorScheme: scenario.colorScheme,
        forcedColors: scenario.forcedColors
      });
      const page = await context.newPage();
      const consoleErrors = [];
      const failedRequests = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => consoleErrors.push(error.message));
      page.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? "failed"}`));
      try {
        await page.goto(`${baseUrl}/?state=${scenario.state}`, { waitUntil: "networkidle" });
        await page.locator("#main-content").waitFor();
        const metrics = await inspect(page, scenario);
        assertScenario(metrics, scenario);
        const axeViolations = await runAxe(page, scenario.forcedColors === "active");
        assert.deepEqual(axeViolations, [], `${scenario.name} has critical or serious axe findings.`);
        assert.deepEqual(consoleErrors, [], `${scenario.name} emitted console errors.`);
        assert.deepEqual(failedRequests, [], `${scenario.name} had failed requests.`);
        const focusTarget = page.locator("button:not(:disabled), a[href]").first();
        let focus = null;
        if (await focusTarget.count()) {
          await focusTarget.focus();
          focus = await focusTarget.evaluate((element) => {
            const style = getComputedStyle(element);
            return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
          });
          assert.notEqual(focus.outlineStyle, "none", `${scenario.name} focus indicator is not visible.`);
          assert.notEqual(focus.outlineWidth, "0px", `${scenario.name} focus indicator is not visible.`);
        }
        await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
        const screenshotPath = join(outputDir, `${scenario.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false, caret: "initial" });
        proof.results.push({
          scenario,
          mainLandmarks: metrics.mainCount,
          horizontalOverflow: false,
          childSummaries: metrics.childSummaries,
          controlCount: metrics.controls.length,
          axeViolations,
          consoleErrors,
          failedRequests,
          focus,
          screenshotPath
        });
        console.log(`proved ${scenario.name}`);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
    await server.close();
    rmSync(tempRoot, { recursive: true, force: true });
  }

  const proofPath = join(outputDir, "proof.json");
  const summaryPath = join(outputDir, "summary.md");
  writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`);
  writeFileSync(summaryPath, [
    "# LP-UX-002 Saturday Ready State Proof",
    "",
    `Generated: ${proof.generatedAt}`,
    `Scenarios: ${proof.results.length} passed`,
    "Coverage: 320, 390, 768, 1024, 1440; multi-child mixed readiness; different next events; honest no-event child; single unresolved; single resolved; loading; error; device dark; forced colors.",
    "Every scenario: exactly one main, no horizontal overflow, critical/serious axe findings 0, unexpected console errors 0, failed requests 0.",
    "This is isolated browser component-state proof using the production components listed in proof.json. Authenticated route and authorization proof remain separate in the Family shell and contrast artifacts.",
    ""
  ].join("\n"));
  console.log(`Saturday Ready state proof passed: ${proofPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
