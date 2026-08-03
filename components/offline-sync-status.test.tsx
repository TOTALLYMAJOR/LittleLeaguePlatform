import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { OfflineSyncStatus } from "./offline-sync-status";

vi.mock("@/lib/offline/game-day-outbox", () => ({
  getOfflineStatusSummary: vi.fn()
}));

describe("OfflineSyncStatus", () => {
  it("renders an accessible, payload-free initial summary for a signed-in actor", () => {
    const html = renderToStaticMarkup(<OfflineSyncStatus actorId="actor-1" contextKey="parent:org-1:season-1:team-1" />);
    expect(html).toContain('aria-label="Offline sync status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Nothing waiting to sync.");
    expect(html).toContain("Counts only.");
    expect(html).not.toContain("actor-1");
    expect(html).not.toContain("team-1");
  });

  it("defines every truthful state label without rendering payload contents", () => {
    const source = readFileSync(join(process.cwd(), "components", "offline-sync-status.tsx"), "utf8");
    expect(source).toContain("Queued:");
    expect(source).toContain("Retrying:");
    expect(source).toContain("Conflict:");
    expect(source).toContain("Sign-in required:");
    expect(source).toContain("Review required:");
    expect(source).toContain("Synced:");
    expect(source).not.toContain("action.payload");
  });

  it("hides another actor's summary after sign-out", () => {
    expect(renderToStaticMarkup(<OfflineSyncStatus />)).toBe("");
  });
});
