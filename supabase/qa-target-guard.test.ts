import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as guardModule from "../scripts/qa-target-guard.mjs";

type QaTarget =
  | { kind: "local"; projectRef: null; targetId: string }
  | { kind: "hosted"; projectRef: string; targetId: string };
type AppInvocation = { targetUrl: string; mutationConfirm: string };
type FetchOptions = { fetchImpl?: typeof fetch; timeoutMs?: number };
type IdentityOptions = FetchOptions & { invocation?: AppInvocation };
type GuardedMutationInput = FetchOptions & {
  action?: string;
  appBaseUrl?: string;
  appInvocation?: AppInvocation;
  serviceRoleCredential: string;
  supabaseUrl: string;
};

const {
  assertIsolatedQaTarget,
  assertQaApplicationTarget,
  assertServiceRoleCredential,
  preflightQaApplicationIdentity,
  preflightServiceRoleCredential,
  runGuardedQaMutation
} = guardModule as unknown as {
  assertIsolatedQaTarget: (url: string, action?: string) => QaTarget;
  assertQaApplicationTarget: (
    baseUrl: string,
    invocation?: AppInvocation
  ) => { kind: "local" | "hosted"; baseUrl: string };
  assertServiceRoleCredential: (value: string) => "secret" | "legacy-jwt";
  preflightQaApplicationIdentity: (
    baseUrl: string,
    target: QaTarget,
    options?: IdentityOptions
  ) => Promise<{
    identity: {
      deploymentClass: string;
      supabaseProjectRef: string | null;
      supabaseTargetId: string;
    };
  }>;
  preflightServiceRoleCredential: (
    url: string,
    credential: string,
    options?: FetchOptions
  ) => Promise<QaTarget>;
  runGuardedQaMutation: <T>(
    input: GuardedMutationInput,
    run: (context: { supabaseTarget: QaTarget }) => T | Promise<T>
  ) => Promise<T>;
};

const QA_REF = "gmrvnnkxksqkcxcmydhr";
const PRODUCTION_REF = "dkwghvvlbdnnwzbnscvu";
const QA_URL = `https://${QA_REF}.supabase.co`;
const SERVICE_ROLE_JWT = jwtForRole("service_role");
const SERVICE_ROLE_SECRET = `sb_secret_${"A".repeat(22)}_${"b".repeat(8)}`;
const HOSTED_INVOCATION = {
  targetUrl: "https://qa.leaguepilot.example",
  mutationConfirm: "mutate-isolated-qa-app"
};

function confirmHostedQa(targetRef = QA_REF) {
  vi.stubEnv("SUPABASE_QA_TARGET_REF", targetRef);
  vi.stubEnv("SUPABASE_QA_PARENT_PROJECT_REF", PRODUCTION_REF);
  vi.stubEnv("SUPABASE_QA_TARGET_CONFIRM", "seed-isolated-qa-target");
}

function jwtForRole(role: string) {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ role })}.signature`;
}

function response(input: {
  ok?: boolean;
  status?: number;
  url?: string;
  redirected?: boolean;
  json?: unknown;
}) {
  return {
    ok: input.ok ?? true,
    status: input.status ?? 200,
    url: input.url ?? "",
    redirected: input.redirected ?? false,
    json: vi.fn().mockResolvedValue(input.json)
  } as unknown as Response;
}

describe("isolated QA target guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("allows loopback and the explicitly bound preview project", () => {
    expect(assertIsolatedQaTarget("http://127.0.0.1:54321")).toEqual({
      kind: "local",
      projectRef: null,
      targetId: "local:http://127.0.0.1:54321"
    });
    expect(assertIsolatedQaTarget("http://[::1]:65432")).toEqual({
      kind: "local",
      projectRef: null,
      targetId: "local:http://[::1]:65432"
    });
    expect(() => assertIsolatedQaTarget("http://localhost")).toThrow(
      "explicit port"
    );

    confirmHostedQa();
    expect(assertIsolatedQaTarget(QA_URL)).toEqual({
      kind: "hosted",
      projectRef: QA_REF,
      targetId: `project:${QA_REF}`
    });
  });

  it("rejects the protected production project unconditionally", () => {
    confirmHostedQa(PRODUCTION_REF);
    expect(() =>
      assertIsolatedQaTarget(`https://${PRODUCTION_REF}.supabase.co`)
    ).toThrow("forbidden on the protected LeaguePilot production project");
    expect(() =>
      assertIsolatedQaTarget(`https://${PRODUCTION_REF}.supabase.co.`)
    ).toThrow("forbidden on the protected LeaguePilot production project");
  });

  it("rejects mismatched, unconfirmed, insecure, and non-Supabase hosted targets", () => {
    confirmHostedQa();
    expect(() =>
      assertIsolatedQaTarget("https://differentref.supabase.co")
    ).toThrow("SUPABASE_QA_TARGET_REF must match");
    expect(() => assertIsolatedQaTarget("https://qa.example.com")).toThrow(
      "explicit Supabase project URL"
    );
    expect(() => assertIsolatedQaTarget(`http://${QA_REF}.supabase.co`)).toThrow(
      "must use HTTPS"
    );
    vi.stubEnv("SUPABASE_QA_TARGET_CONFIRM", "");
    expect(() => assertIsolatedQaTarget(QA_URL)).toThrow(
      "SUPABASE_QA_TARGET_CONFIRM"
    );
  });

  it("rejects production, insecure, mismatched, and unconfirmed application URLs", () => {
    expect(() =>
      assertQaApplicationTarget("https://leaguepilot.us", HOSTED_INVOCATION)
    ).toThrow("canonical LeaguePilot production host");
    expect(() =>
      assertQaApplicationTarget("https://www.leaguepilot.us", HOSTED_INVOCATION)
    ).toThrow("canonical LeaguePilot production host");
    expect(() =>
      assertQaApplicationTarget("https://LEAGUEPILOT.US.", HOSTED_INVOCATION)
    ).toThrow("canonical LeaguePilot production host");
    expect(() =>
      assertQaApplicationTarget("http://qa.leaguepilot.example", {
        ...HOSTED_INVOCATION,
        targetUrl: "http://qa.leaguepilot.example"
      })
    ).toThrow("must use HTTPS");
    expect(() =>
      assertQaApplicationTarget("https://other.leaguepilot.example", HOSTED_INVOCATION)
    ).toThrow("must exactly match");
    expect(() =>
      assertQaApplicationTarget("https://qa.leaguepilot.example", {
        ...HOSTED_INVOCATION,
        mutationConfirm: ""
      })
    ).toThrow("QA_APP_MUTATION_CONFIRM");
  });

  it("allows loopback application URLs without weakening identity preflight", () => {
    expect(
      assertQaApplicationTarget("http://localhost:3020", {
        targetUrl: "",
        mutationConfirm: ""
      })
    ).toEqual({ kind: "local", baseUrl: "http://localhost:3020" });
  });

  it("rejects browser keys and arbitrary opaque credentials", () => {
    expect(() => assertServiceRoleCredential("sb_publishable_example")).toThrow(
      "cannot be a publishable key"
    );
    expect(() => assertServiceRoleCredential(jwtForRole("anon"))).toThrow(
      "service_role claim"
    );
    expect(() => assertServiceRoleCredential("opaque-random-value")).toThrow(
      "service-role JWT or Supabase secret key"
    );
    expect(() => assertServiceRoleCredential(SERVICE_ROLE_JWT)).not.toThrow();
    expect(() => assertServiceRoleCredential(SERVICE_ROLE_SECRET)).not.toThrow();
    expect(() => assertServiceRoleCredential("sb_secret_example")).toThrow(
      "invalid Supabase secret key"
    );
    expect(() =>
      assertServiceRoleCredential(`sb_secret_${"A".repeat(21)}_${"b".repeat(8)}`)
    ).toThrow("invalid Supabase secret key");
  });

  it("proves service credential acceptance against the exact guarded project", async () => {
    confirmHostedQa();
    const fetchSpy = vi.fn().mockResolvedValue(
      response({ url: `${QA_URL}/auth/v1/admin/users?page=1&per_page=1` })
    );

    await expect(
      preflightServiceRoleCredential(QA_URL, SERVICE_ROLE_JWT, { fetchImpl: fetchSpy })
    ).resolves.toEqual({
      kind: "hosted",
      projectRef: QA_REF,
      targetId: `project:${QA_REF}`
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0] as [URL, RequestInit];
    expect(url.origin).toBe(QA_URL);
    expect(url.pathname).toBe("/auth/v1/admin/users");
    expect(init.method).toBe("GET");
    expect(init.redirect).toBe("error");
    expect(init.headers).toEqual({
      apikey: SERVICE_ROLE_JWT,
      Authorization: `Bearer ${SERVICE_ROLE_JWT}`
    });
  });

  it("sends documented secret keys only as the apikey header", async () => {
    confirmHostedQa();
    const fetchSpy = vi.fn().mockResolvedValue(
      response({ url: `${QA_URL}/auth/v1/admin/users?page=1&per_page=1` })
    );

    await preflightServiceRoleCredential(QA_URL, SERVICE_ROLE_SECRET, {
      fetchImpl: fetchSpy
    });

    const [, init] = fetchSpy.mock.calls[0] as [URL, RequestInit];
    expect(init.headers).toEqual({ apikey: SERVICE_ROLE_SECRET });
    expect(init.headers).not.toHaveProperty("Authorization");
  });

  it("fails credential preflight closed without exposing the credential", async () => {
    confirmHostedQa();
    const fetchSpy = vi.fn().mockResolvedValue(response({ ok: false, status: 401 }));

    await expect(
      preflightServiceRoleCredential(QA_URL, SERVICE_ROLE_JWT, { fetchImpl: fetchSpy })
    ).rejects.toThrow("was not accepted");
    await expect(
      preflightServiceRoleCredential(QA_URL, "opaque-random-value", {
        fetchImpl: fetchSpy
      })
    ).rejects.not.toThrow("opaque-random-value");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("requires a valid, matching, non-production application identity", async () => {
    confirmHostedQa();
    const target = assertIsolatedQaTarget(QA_URL);
    const goodIdentity = {
      deploymentClass: "preview",
      supabaseProjectRef: QA_REF,
      supabaseTargetId: `project:${QA_REF}`
    };
    const fetchSpy = vi.fn().mockResolvedValue(
      response({
        url: "https://qa.leaguepilot.example/api/qa-target-identity",
        json: goodIdentity
      })
    );

    await expect(
      preflightQaApplicationIdentity(
        "https://qa.leaguepilot.example",
        target,
        { invocation: HOSTED_INVOCATION, fetchImpl: fetchSpy }
      )
    ).resolves.toMatchObject({ identity: goodIdentity });

    fetchSpy.mockResolvedValueOnce(response({
      json: {
        ...goodIdentity,
        supabaseProjectRef: "wrong",
        supabaseTargetId: "project:wrong"
      }
    }));
    await expect(
      preflightQaApplicationIdentity(
        "https://qa.leaguepilot.example",
        target,
        { invocation: HOSTED_INVOCATION, fetchImpl: fetchSpy }
      )
    ).rejects.toThrow("target identities do not match");

    fetchSpy.mockResolvedValueOnce(response({ json: { ...goodIdentity, deploymentClass: "production" } }));
    await expect(
      preflightQaApplicationIdentity(
        "https://qa.leaguepilot.example",
        target,
        { invocation: HOSTED_INVOCATION, fetchImpl: fetchSpy }
      )
    ).rejects.toThrow("production deployment");
  });

  it("requires an exact local Supabase origin identity including the port", async () => {
    const target = assertIsolatedQaTarget("http://127.0.0.1:54321");
    const fetchSpy = vi.fn().mockResolvedValue(
      response({
        url: "http://127.0.0.1:3020/api/qa-target-identity",
        json: {
          deploymentClass: "local",
          supabaseProjectRef: null,
          supabaseTargetId: "local:http://127.0.0.1:54322"
        }
      })
    );

    await expect(
      preflightQaApplicationIdentity("http://127.0.0.1:3020", target, {
        fetchImpl: fetchSpy
      })
    ).rejects.toThrow("target identities do not match");
  });

  it("fails identity preflight on disabled, malformed, redirected, unreachable, and timed-out routes", async () => {
    const target = {
      kind: "local" as const,
      projectRef: null,
      targetId: "local:http://127.0.0.1:54321"
    };
    const cases = [
      {
        fetchImpl: vi.fn().mockResolvedValue(response({ ok: false, status: 404 })),
        message: "disabled or returned a non-success"
      },
      {
        fetchImpl: vi.fn().mockResolvedValue(response({ json: { deploymentClass: "local" } })),
        message: "malformed identity"
      },
      {
        fetchImpl: vi.fn().mockResolvedValue(
          response({
            redirected: true,
            url: "https://attacker.example/api/qa-target-identity",
            json: {
              deploymentClass: "local",
              supabaseProjectRef: null,
              supabaseTargetId: "local:http://127.0.0.1:54321"
            }
          })
        ),
        message: "redirected across origins"
      },
      {
        fetchImpl: vi.fn().mockRejectedValue(new Error("private network detail")),
        message: "was unreachable"
      },
      {
        fetchImpl: vi.fn().mockRejectedValue(
          Object.assign(new Error("elapsed"), { name: "TimeoutError" })
        ),
        message: "timed out"
      }
    ];

    for (const testCase of cases) {
      await expect(
        preflightQaApplicationIdentity("http://127.0.0.1:3020", target, {
          fetchImpl: testCase.fetchImpl
        })
      ).rejects.toThrow(testCase.message);
    }
  });

  it("keeps injected script side effects untouched across every async preflight rejection", async () => {
    const localSupabaseUrl = "http://127.0.0.1:54321";
    const localIdentity = {
      deploymentClass: "local",
      supabaseProjectRef: null,
      supabaseTargetId: `local:${localSupabaseUrl}`
    };
    const identityUrl = "http://127.0.0.1:3020/api/qa-target-identity";
    const cases = [
      {
        label: "production identity",
        fetchImpl: vi.fn().mockResolvedValue(response({
          url: identityUrl,
          json: { ...localIdentity, deploymentClass: "production" }
        })),
        message: "production deployment"
      },
      {
        label: "target mismatch",
        fetchImpl: vi.fn().mockResolvedValue(response({
          url: identityUrl,
          json: {
            ...localIdentity,
            supabaseTargetId: "local:http://127.0.0.1:54322"
          }
        })),
        message: "target identities do not match"
      },
      {
        label: "disabled route",
        fetchImpl: vi.fn().mockResolvedValue(response({ ok: false, status: 404 })),
        message: "disabled or returned a non-success"
      },
      {
        label: "malformed route",
        fetchImpl: vi.fn().mockResolvedValue(response({
          url: identityUrl,
          json: { deploymentClass: "local" }
        })),
        message: "malformed identity"
      },
      {
        label: "redirected route",
        fetchImpl: vi.fn().mockResolvedValue(response({
          redirected: true,
          url: "https://attacker.example/api/qa-target-identity",
          json: localIdentity
        })),
        message: "redirected across origins"
      },
      {
        label: "timed out route",
        fetchImpl: vi.fn().mockRejectedValue(
          Object.assign(new Error("private timeout detail"), { name: "TimeoutError" })
        ),
        message: "timed out"
      },
      {
        label: "rejected service credential",
        fetchImpl: vi.fn()
          .mockResolvedValueOnce(response({ url: identityUrl, json: localIdentity }))
          .mockResolvedValueOnce(response({ ok: false, status: 401 })),
        message: "was not accepted"
      }
    ];

    for (const testCase of cases) {
      const sideEffects = {
        client: vi.fn(),
        browser: vi.fn(),
        auth: vi.fn(),
        filesystem: vi.fn(),
        insert: vi.fn(),
        upsert: vi.fn()
      };

      await expect(
        runGuardedQaMutation(
          {
            action: `test ${testCase.label}`,
            appBaseUrl: "http://127.0.0.1:3020",
            fetchImpl: testCase.fetchImpl,
            serviceRoleCredential: SERVICE_ROLE_JWT,
            supabaseUrl: localSupabaseUrl
          },
          async () => {
            for (const effect of Object.values(sideEffects)) await effect();
          }
        )
      ).rejects.toThrow(testCase.message);

      for (const effect of Object.values(sideEffects)) {
        expect(effect, testCase.label).not.toHaveBeenCalled();
      }
    }
  });

  it("routes all three scripts through the tested orchestration before side effects", () => {
    const scripts = [
      {
        path: "scripts/bootstrap-demo-tenant.mjs",
        callback: "}, async () => {",
        effects: ["appendMissingEnv({", "const supabase = createClient("]
      },
      {
        path: "scripts/capture-communication-room-record-proof.mjs",
        callback: "}, () => runCommunicationRoomProof(supabaseUrl, serviceRoleKey))",
        effectFunction: "runCommunicationRoomProof",
        effects: []
      },
      {
        path: "scripts/verify-qa-session-paths.mjs",
        callback: "}, async () => {",
        effects: [
          "const supabase = createQaAdminClient(",
          "mkdirSync(screenshotDir",
          "chromium.launch("
        ]
      }
    ];

    for (const script of scripts) {
      const source = readFileSync(script.path, "utf8");
      const mainStart = source.indexOf("export async function main(");
      const executableSource = source.slice(mainStart);
      const guardStart = executableSource.indexOf("return guard({");
      const callbackStart = executableSource.indexOf(script.callback);
      const directRunGate = executableSource.indexOf("if (isDirectRun)");

      expect(source, `${script.path}: common guard import`).toContain(
        "runGuardedQaMutation"
      );
      expect(mainStart, `${script.path}: exported testable main`).toBeGreaterThan(-1);
      expect(guardStart, `${script.path}: shared guard call`).toBeGreaterThan(-1);
      expect(callbackStart, `${script.path}: guarded callback`).toBeGreaterThan(guardStart);
      expect(executableSource, `${script.path}: credential binding`).toContain(
        "serviceRoleCredential: serviceRoleKey"
      );
      expect(executableSource, `${script.path}: target binding`).toContain(
        "supabaseUrl"
      );
      expect(directRunGate, `${script.path}: import-safe direct-run gate`).toBeGreaterThan(
        callbackStart
      );

      for (const marker of script.effects) {
        const index = executableSource.indexOf(marker);
        expect(index, `${script.path}: missing ${marker}`).toBeGreaterThan(callbackStart);
        expect(index, `${script.path}: unguarded ${marker}`).toBeLessThan(directRunGate);
      }

      if (script.effectFunction) {
        expect(
          source.match(new RegExp(`${script.effectFunction}\\(`, "g"))?.length,
          `${script.path}: effect function must only be defined and injected`
        ).toBe(2);
      }
    }
  });
});
