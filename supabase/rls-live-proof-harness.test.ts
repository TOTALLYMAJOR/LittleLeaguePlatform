import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error The executable MJS harness intentionally has no TS declaration.
import * as actorModule from "../scripts/verify-rls-actor-action-matrix.mjs";
// @ts-expect-error The executable MJS harness intentionally has no TS declaration.
import * as realtimeModule from "../scripts/verify-realtime-boundaries.mjs";

type ProofFixtureCounts = {
  organizations: number;
  teams: number;
  families: number;
  events?: number;
  chatChannels?: number;
  providerRecords: number;
};

type ProofCheck = [name: string, expected: "allow" | "deny", ...details: unknown[]];
type GuardPreflight = (
  url: string,
  credential: string
) => Promise<unknown>;
type GuardResult = {
  url: string;
  target: { kind: string; projectRef: string };
};
type RealtimeChange = {
  table: string;
  id: string;
  event: string;
  version: string;
};

const actor = actorModule as unknown as {
  buildActorActionPlan: () => {
    runId: string;
    ids: { organizations: string[] };
    fixtureCounts: ProofFixtureCounts;
    cleanup: { strategy: string; status: string; order: string[] };
    waves: Array<{ checks: ProofCheck[] }>;
  };
  guardActorActionExecution: (
    env: NodeJS.ProcessEnv,
    options: { preflight: GuardPreflight }
  ) => Promise<GuardResult>;
  main: (argv?: string[]) => Promise<void>;
};
const realtime = realtimeModule as unknown as {
  buildRealtimePlan: () => {
    fixtureCounts: ProofFixtureCounts;
    checks: ProofCheck[];
  };
  guardRealtimeExecution: (
    env: NodeJS.ProcessEnv,
    options: { preflight: GuardPreflight }
  ) => Promise<GuardResult>;
  createVersionedChangeCollector: () => {
    accept: (change: RealtimeChange) => { accepted: boolean; reason: string };
    count: () => number;
  };
  main: (argv?: string[]) => Promise<void>;
};

const QA_REF = "gmrvnnkxksqkcxcmydhr";
const PRODUCTION_REF = "dkwghvvlbdnnwzbnscvu";
const QA_URL = `https://${QA_REF}.supabase.co`;

function jwtForRole(role: string) {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ role })}.signature`;
}

function hostedEnv(kind: "actor" | "realtime"): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    NEXT_PUBLIC_SUPABASE_URL: QA_URL,
    SUPABASE_SERVICE_ROLE_KEY: jwtForRole("service_role"),
    SUPABASE_QA_TARGET_REF: QA_REF,
    SUPABASE_QA_PARENT_PROJECT_REF: PRODUCTION_REF,
    SUPABASE_QA_TARGET_CONFIRM: "seed-isolated-qa-target",
    ...(kind === "actor"
      ? { RLS_PROOF_EXECUTE_CONFIRM: "run-ephemeral-rls-proof" }
      : { REALTIME_PROOF_EXECUTE_CONFIRM: "run-ephemeral-realtime-proof" })
  };
}

describe("live proof harness plans", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses randomized, provider-free, multi-tenant fixtures and explicit cleanup", () => {
    const first = actor.buildActorActionPlan();
    const second = actor.buildActorActionPlan();
    expect(first.runId).not.toBe(second.runId);
    expect(first.ids.organizations).not.toEqual(second.ids.organizations);
    expect(first.fixtureCounts).toMatchObject({
      organizations: 2,
      teams: 2,
      families: 2,
      events: 2,
      chatChannels: 2,
      providerRecords: 0
    });
    expect(first.cleanup).toMatchObject({
      strategy: "delete-exact-randomized-fixtures-only",
      status: "planned"
    });
    expect(first.cleanup.order.at(-1)).toBe("auth.users");

    const dimensions = first.waves.flatMap((wave) =>
      wave.checks.map(([name]) => name)
    ).join(" ");
    expect(dimensions).toMatch(/wrong-role/);
    expect(dimensions).toMatch(/cross-team/);
    expect(dimensions).toMatch(/cross-family/);
    expect(dimensions).toMatch(/cross-organization/);
    expect(first.waves.every((wave) => wave.checks.every((check) =>
      ["allow", "deny"].includes(check[1])
    ))).toBe(true);
  });

  it("keeps dry-run output redacted and never contacts a hosted target", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await actor.main([]);
    await realtime.main(["--plan"]);

    expect(fetchSpy).not.toHaveBeenCalled();
    const output = log.mock.calls.map(([value]) => String(value)).join("\n");
    expect(output).toContain('"mode": "plan"');
    expect(output).toContain('"providerRecords": 0');
    expect(output).not.toMatch(/@example\.invalid/);
    expect(output).not.toMatch(/[0-9a-f]{8}-[0-9a-f-]{27}/i);
    expect(output).not.toContain("password");
  });

  it("enumerates Realtime auth, isolation, reconnect, and version checks separately from REST", () => {
    const plan = realtime.buildRealtimePlan();
    const checks = plan.checks.map(([name]) => name).join(" ");
    expect(plan.fixtureCounts).toMatchObject({
      organizations: 2,
      teams: 2,
      families: 2,
      providerRecords: 0
    });
    expect(checks).toMatch(/authorized parent subscription/);
    expect(checks).toMatch(/authorized coach subscription/);
    expect(checks).toMatch(/wrong-team actor/);
    expect(checks).toMatch(/team filter/);
    expect(checks).toMatch(/disconnect/);
    expect(checks).toMatch(/reconnect/);
    expect(checks).toMatch(/duplicate event version/);
    expect(checks).toMatch(/new change version/);
    expect(checks).not.toMatch(/REST/i);
  });

  it("deduplicates exact event versions while accepting later versions", () => {
    const collector = realtime.createVersionedChangeCollector();
    const event = {
      table: "team_chat_messages",
      id: "redacted-row",
      event: "UPDATE",
      version: "v1"
    };
    expect(collector.accept(event)).toEqual({ accepted: true, reason: "new-version" });
    expect(collector.accept(event)).toEqual({ accepted: false, reason: "duplicate" });
    expect(collector.accept({ ...event, version: "v2" })).toEqual({
      accepted: true,
      reason: "new-version"
    });
    expect(collector.count()).toBe(2);
  });
});

describe("fail-closed execution guards", () => {
  it.each([
    ["actor", actor.guardActorActionExecution],
    ["realtime", realtime.guardRealtimeExecution]
  ] as const)("binds the %s service credential before client creation", async (kind, guard) => {
    const preflight = vi.fn().mockResolvedValue({
      kind: "hosted",
      projectRef: QA_REF
    });
    await expect(
      guard(hostedEnv(kind), { preflight })
    ).resolves.toMatchObject({
      url: QA_URL,
      target: { kind: "hosted", projectRef: QA_REF }
    });
    expect(preflight).toHaveBeenCalledOnce();
    expect(preflight.mock.calls[0][0]).toBe(QA_URL);
  });

  it.each([
    ["actor", actor.guardActorActionExecution],
    ["realtime", realtime.guardRealtimeExecution]
  ] as const)("rejects production, production-like URLs, missing parent evidence, and credential mismatch for %s", async (kind, guard) => {
    const preflight = vi.fn().mockResolvedValue({});
    const env = hostedEnv(kind);

    await expect(guard({
      ...env,
      NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_REF}.supabase.co`,
      SUPABASE_QA_TARGET_REF: PRODUCTION_REF
    }, { preflight })).rejects.toThrow("protected LeaguePilot production project");

    await expect(guard({
      ...env,
      NEXT_PUBLIC_SUPABASE_URL: "https://qa.leaguepilot.us"
    }, { preflight })).rejects.toThrow("explicit Supabase project URL");

    await expect(guard({
      ...env,
      SUPABASE_QA_PARENT_PROJECT_REF: ""
    }, { preflight })).rejects.toThrow("SUPABASE_QA_PARENT_PROJECT_REF");

    await expect(guard({
      ...env,
      SUPABASE_SERVICE_ROLE_KEY: jwtForRole("anon")
    }, { preflight })).rejects.toThrow("service_role claim");

    const rejectedPreflight = vi.fn().mockRejectedValue(
      new Error("SUPABASE_SERVICE_ROLE_KEY was not accepted by the guarded Supabase project.")
    );
    await expect(guard(env, { preflight: rejectedPreflight })).rejects.toThrow(
      "was not accepted"
    );
    expect(preflight).not.toHaveBeenCalled();
  });

  it("imports Supabase and creates clients only after both guard calls", () => {
    for (const file of [
      "scripts/verify-rls-actor-action-matrix.mjs",
      "scripts/verify-realtime-boundaries.mjs"
    ]) {
      const source = readFileSync(file, "utf8");
      const isolated = source.indexOf("assertIsolatedQaTarget(url");
      const credential = source.indexOf("assertServiceRoleCredential(credential");
      const preflight = source.indexOf("await preflight(url, credential)");
      const dynamicImport = source.indexOf('await import("@supabase/supabase-js")');
      const clientCreation = source.indexOf("createClient(guarded.url");
      expect(isolated).toBeGreaterThan(-1);
      expect(credential).toBeGreaterThan(isolated);
      expect(preflight).toBeGreaterThan(credential);
      expect(dynamicImport).toBeGreaterThan(preflight);
      expect(clientCreation).toBeGreaterThan(dynamicImport);
      expect(source).not.toContain('import { createClient } from "@supabase/supabase-js"');
    }
  });
});
