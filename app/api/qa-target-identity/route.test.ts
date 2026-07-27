import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("GET /api/qa-target-identity", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults disabled without exposing target configuration", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://private-ref.supabase.co");
    vi.stubEnv("QA_TARGET_DEPLOYMENT_CLASS", "qa");

    const response = await GET();

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ ok: false });
  });

  it("exposes only deployment class and public project ref when enabled", async () => {
    vi.stubEnv("QA_TARGET_IDENTITY_ENABLED", "enabled");
    vi.stubEnv("QA_TARGET_DEPLOYMENT_CLASS", "preview");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://gmrvnnkxksqkcxcmydhr.supabase.co");

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      deploymentClass: "preview",
      supabaseProjectRef: "gmrvnnkxksqkcxcmydhr"
    });
  });

  it("returns a null public ref for loopback Supabase", async () => {
    vi.stubEnv("QA_TARGET_IDENTITY_ENABLED", "enabled");
    vi.stubEnv("QA_TARGET_DEPLOYMENT_CLASS", "local");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      deploymentClass: "local",
      supabaseProjectRef: null
    });
  });

  it("fails closed when deployment class is missing or unknown", async () => {
    vi.stubEnv("QA_TARGET_IDENTITY_ENABLED", "enabled");
    vi.stubEnv("QA_TARGET_DEPLOYMENT_CLASS", "staging-ish");
    vi.stubEnv("NODE_ENV", "test");

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false });
  });
});
