import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function openingMainCount(value: string) {
  return value.match(/<main(?:\s|>)/g)?.length ?? 0;
}

describe("/parent main landmark ownership", () => {
  it("leaves the normal, loading, and error states inside the one private AppShell main", () => {
    const shell = source("components/ui/AppShell.tsx");
    const privateShellStart = shell.indexOf('return (\n    <AppStateProvider key={activeContext');
    expect(privateShellStart).toBeGreaterThan(-1);
    const privateShell = shell.slice(privateShellStart);
    expect(openingMainCount(privateShell)).toBe(1);

    for (const stateFile of [
      "components/parent-weekly-dashboard.tsx",
      "app/parent/loading.tsx",
      "app/parent/error.tsx"
    ]) {
      expect(openingMainCount(source(stateFile)), `${stateFile} must not own a nested main`).toBe(0);
    }
  });
});
