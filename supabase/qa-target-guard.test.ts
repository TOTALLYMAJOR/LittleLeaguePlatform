import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertIsolatedQaTarget,
  assertServiceRoleCredential
} from "../scripts/qa-target-guard.mjs";

const QA_REF = "gmrvnnkxksqkcxcmydhr";
const PRODUCTION_REF = "dkwghvvlbdnnwzbnscvu";

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

describe("isolated QA target guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows localhost without hosted confirmation", () => {
    expect(assertIsolatedQaTarget("http://127.0.0.1:54321")).toEqual({
      kind: "local",
      projectRef: null
    });
  });

  it("allows the explicitly bound preview project", () => {
    confirmHostedQa();
    expect(assertIsolatedQaTarget(`https://${QA_REF}.supabase.co`)).toEqual({
      kind: "hosted",
      projectRef: QA_REF
    });
  });

  it("rejects the protected production project even with confirmation", () => {
    confirmHostedQa(PRODUCTION_REF);
    expect(() =>
      assertIsolatedQaTarget(`https://${PRODUCTION_REF}.supabase.co`)
    ).toThrow("forbidden on the protected LeaguePilot production project");
  });

  it("rejects a target-ref mismatch and non-Supabase hosted URL", () => {
    confirmHostedQa();
    expect(() =>
      assertIsolatedQaTarget("https://differentref.supabase.co")
    ).toThrow("SUPABASE_QA_TARGET_REF must match");
    expect(() => assertIsolatedQaTarget("https://qa.example.com")).toThrow(
      "explicit Supabase project URL"
    );
  });

  it("rejects browser credentials in the service-role slot", () => {
    expect(() => assertServiceRoleCredential("sb_publishable_example")).toThrow(
      "cannot be a publishable key"
    );
    expect(() => assertServiceRoleCredential(jwtForRole("anon"))).toThrow(
      "service_role claim"
    );
    expect(() => assertServiceRoleCredential(jwtForRole("service_role"))).not.toThrow();
  });
});
