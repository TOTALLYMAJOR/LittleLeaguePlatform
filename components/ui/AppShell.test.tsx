import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("AppShell private sign-out boundary", () => {
  it("awaits the actor-scoped generation-fenced clear before Supabase sign-out and navigation", () => {
    const shell = readFileSync(join(process.cwd(), "components", "ui", "AppShell.tsx"), "utf8");
    const clearIndex = shell.indexOf("await clearPrivateGameDayData(access.userId)");
    const authIndex = shell.indexOf("await supabase.auth.signOut()");
    const navigationIndex = shell.indexOf('window.location.assign("/auth")');

    expect(shell).toContain("Sign out");
    expect(clearIndex).toBeGreaterThan(-1);
    expect(authIndex).toBeGreaterThan(clearIndex);
    expect(navigationIndex).toBeGreaterThan(authIndex);
    expect(shell).toContain("detail: { actorId: access.userId }");
    expect(shell).not.toContain("clearPrivateGameDayData()");
  });
});
