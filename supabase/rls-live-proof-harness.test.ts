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
  players?: number;
  guardianLinks?: number;
  events?: number;
  chatChannels?: number;
  providerRecords: number;
};

type ProofExpectation =
  | "allow"
  | "deny"
  | "deliver"
  | "absent"
  | "deduplicate"
  | "apply";
type ProofCheck = [
  name: string,
  expected: ProofExpectation,
  ...details: unknown[]
];
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
  assertActorCredentialSeparation: (
    anonKey: string,
    serviceCredential: string
  ) => void;
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
  assertRealtimeCredentialSeparation: (
    anonKey: string,
    serviceCredential: string
  ) => void;
  createVersionedChangeCollector: () => {
    accept: (change: RealtimeChange) => { accepted: boolean; reason: string };
    count: () => number;
  };
  normalizeChangeVersion: (value: unknown) => unknown;
  assertCollectorCountsStable: (
    expectations: Array<{
      collector: { count: () => number };
      expectedCount: number;
    }>,
    label: string,
    quiescenceMs?: number
  ) => Promise<void>;
  removeTrackedChannel: (
    registrations: Array<{ client: unknown; channel: unknown }>,
    client: { removeChannel: (channel: unknown) => Promise<string> },
    channel: unknown
  ) => Promise<void>;
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

  it("uses a browser-granted family table and tracks every denied insert for cleanup", () => {
    const actorSource = readFileSync(
      new URL(
        "../scripts/verify-rls-actor-action-matrix.mjs",
        import.meta.url
      ),
      "utf8"
    );
    const grants = readFileSync(
      new URL(
        "./migrations/20260726134836_data_api_service_role_grants.sql",
        import.meta.url
      ),
      "utf8"
    );
    const browserGrantBlock =
      grants.match(
        /grant select, insert, update, delete on table([\s\S]*?)to anon, authenticated, service_role;/
      )?.[1] ?? "";
    const serverOnlyRevokeBlock =
      grants.match(
        /revoke all on table([\s\S]*?)from public, anon, authenticated;/
      )?.[1] ?? "";

    expect(browserGrantBlock).toContain("public.emergency_contacts");
    expect(serverOnlyRevokeBlock).not.toContain("public.emergency_contacts");
    expect(serverOnlyRevokeBlock).toContain("public.family_event_handoffs");
    expect(actorSource).toContain('.from("emergency_contacts")');
    expect(actorSource).not.toContain('.from("family_event_handoffs")');
    expect(actorSource).toContain("users.coachOtherOrg");
    expect(actorSource).toContain(
      "parentB, coachOtherOrg } = clients"
    );
    expect(actorSource).not.toContain("parentOtherOrg");

    expect(actorSource).toContain(
      "if (!trackedIds.includes(row.id))"
    );
    expect(actorSource).toContain(
      "denial fixture ID is not tracked for cleanup"
    );
    expect(
      actorSource.match(/await assertTrackedDeniedInsert\(/g)
    ).toHaveLength(2);
    expect(actorSource).not.toMatch(
      /assertDenied\(\s*await[^;]*\.insert\(\{/
    );
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
      players: 2,
      guardianLinks: 2,
      providerRecords: 0
    });
    expect(checks).toMatch(/authorized parent subscription/);
    expect(checks).toMatch(/authorized coach subscription/);
    expect(checks).toMatch(/wrong-team actor/);
    expect(checks).toMatch(/cross-organization coach/);
    expect(checks).toMatch(/sibling-team INSERT reaches its authorized parent/);
    expect(checks).toMatch(/team filter/);
    expect(checks).toMatch(/disconnect/);
    expect(checks).toMatch(/reconnect/);
    expect(checks).toMatch(/duplicate event version/);
    expect(checks).toMatch(/new change version/);
    expect(checks).not.toMatch(/REST/i);
  });

  it("tracks each Realtime channel before awaiting subscription and removes it with its owner", () => {
    const source = readFileSync(
      new URL("../scripts/verify-realtime-boundaries.mjs", import.meta.url),
      "utf8"
    );
    const subscribeStart = source.indexOf("async function subscribe(");
    const subscribeEnd = source.indexOf(
      "async function removeTrackedChannel(",
      subscribeStart
    );
    const subscribeBody = source.slice(subscribeStart, subscribeEnd);

    expect(subscribeBody.indexOf("channelRegistrations.push")).toBeGreaterThan(
      -1
    );
    expect(subscribeBody.indexOf("channelRegistrations.push")).toBeLessThan(
      subscribeBody.indexOf("await waitFor")
    );
    expect(source).toContain(
      "registrationsToClose.map(({ client, channel }) =>"
    );
    expect(source).toContain(
      'throw new Error("Realtime channel removal was incomplete.")'
    );
    expect(source).toContain("client.realtime.disconnect()");
    expect(source).not.toContain("clients.flatMap");
  });

  it("retains failed channel removals and rejects delayed isolation leaks", async () => {
    const channel = { name: "tracked-channel" };
    const removeChannel = vi.fn().mockResolvedValue("timed out");
    const client = { removeChannel };
    const registrations = [{ client, channel }];

    await expect(
      realtime.removeTrackedChannel(registrations, client, channel)
    ).rejects.toThrow("removal was incomplete");
    expect(registrations).toEqual([{ client, channel }]);

    removeChannel.mockResolvedValue("ok");
    await expect(
      realtime.removeTrackedChannel(registrations, client, channel)
    ).resolves.toBeUndefined();
    expect(registrations).toEqual([]);

    vi.useFakeTimers();
    try {
      let count = 0;
      const stable = realtime.assertCollectorCountsStable(
        [{ collector: { count: () => count }, expectedCount: 0 }],
        "delayed leak",
        300
      );
      const rejected = expect(stable).rejects.toThrow("delayed leak");
      count = 1;
      await vi.advanceTimersByTimeAsync(300);
      await rejected;
    } finally {
      vi.useRealTimers();
    }
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
    expect(
      realtime.normalizeChangeVersion("2026-07-27T15:00:00+00:00")
    ).toBe("2026-07-27T15:00:00.000Z");
    expect(realtime.normalizeChangeVersion("v2")).toBe("v2");
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

  it.each([
    ["actor", actor.assertActorCredentialSeparation],
    ["realtime", realtime.assertRealtimeCredentialSeparation]
  ] as const)("rejects privileged or malformed browser credentials for %s", (_kind, guard) => {
    const serviceCredential = jwtForRole("service_role");

    expect(() => guard(jwtForRole("anon"), serviceCredential)).not.toThrow();
    expect(() => guard("sb_publishable_qa_public", serviceCredential)).not.toThrow();
    expect(() => guard(serviceCredential, serviceCredential)).toThrow(
      "must differ"
    );
    expect(() => guard(jwtForRole("service_role"), "sb_secret_qa_service")).toThrow(
      "anon JWT or publishable key"
    );
    expect(() => guard(jwtForRole("authenticated"), serviceCredential)).toThrow(
      "must carry the anon role"
    );
    expect(() => guard("malformed-public-key", serviceCredential)).toThrow(
      "must carry the anon role"
    );
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
      const publicCredential = source.indexOf(
        "CredentialSeparation(anonKey",
        preflight
      );
      const dynamicImport = source.indexOf('await import("@supabase/supabase-js")');
      const clientCreation = source.indexOf("createClient(guarded.url");
      expect(isolated).toBeGreaterThan(-1);
      expect(credential).toBeGreaterThan(isolated);
      expect(preflight).toBeGreaterThan(credential);
      expect(publicCredential).toBeGreaterThan(preflight);
      expect(dynamicImport).toBeGreaterThan(publicCredential);
      expect(clientCreation).toBeGreaterThan(dynamicImport);
      expect(source).not.toContain('import { createClient } from "@supabase/supabase-js"');
    }
  });
});
