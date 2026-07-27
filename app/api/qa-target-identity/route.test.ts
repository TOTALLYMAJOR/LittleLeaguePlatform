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
      supabaseProjectRef: "gmrvnnkxksqkcxcmydhr",
      supabaseTargetId: "project:gmrvnnkxksqkcxcmydhr"
    });
  });

  it("returns the exact normalized loopback origin and port", async () => {
    vi.stubEnv("QA_TARGET_IDENTITY_ENABLED", "enabled");
    vi.stubEnv("QA_TARGET_DEPLOYMENT_CLASS", "local");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      deploymentClass: "local",
      supabaseProjectRef: null,
      supabaseTargetId: "local:http://127.0.0.1:54321"
    });

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://[::1]:65432");
    const ipv6Response = await GET();

    expect(ipv6Response.status).toBe(200);
    expect(await ipv6Response.json()).toEqual({
      deploymentClass: "local",
      supabaseProjectRef: null,
      supabaseTargetId: "local:http://[::1]:65432"
    });
  });

  it("fails closed when deployment class or Supabase identity is missing or invalid", async () => {
    vi.stubEnv("QA_TARGET_IDENTITY_ENABLED", "enabled");
    vi.stubEnv("QA_TARGET_DEPLOYMENT_CLASS", "staging-ish");
    vi.stubEnv("NODE_ENV", "test");

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false });

    vi.stubEnv("QA_TARGET_DEPLOYMENT_CLASS", "local");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect((await GET()).status).toBe(503);

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost");
    expect((await GET()).status).toBe(503);

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://not-supabase.example");
    expect((await GET()).status).toBe(503);
  });

  it("rejects every production deployment signal even when a QA override is present", async () => {
    vi.stubEnv("QA_TARGET_IDENTITY_ENABLED", "enabled");
    vi.stubEnv("QA_TARGET_DEPLOYMENT_CLASS", "preview");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://gmrvnnkxksqkcxcmydhr.supabase.co");
    vi.stubEnv("VERCEL_ENV", "production");

    expect((await GET()).status).toBe(403);

    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_TARGET_ENV", "production");
    expect((await GET()).status).toBe(403);

    vi.stubEnv("VERCEL_TARGET_ENV", "preview");
    vi.stubEnv("QA_TARGET_DEPLOYMENT_CLASS", "production");
    expect((await GET()).status).toBe(403);
  });

  it("rejects the protected production project including a trailing-dot hostname", async () => {
    vi.stubEnv("QA_TARGET_IDENTITY_ENABLED", "enabled");
    vi.stubEnv("QA_TARGET_DEPLOYMENT_CLASS", "preview");
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      "https://dkwghvvlbdnnwzbnscvu.supabase.co."
    );

    const response = await GET(
      new Request("https://qa.leaguepilot.example/api/qa-target-identity")
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false });
  });

  it.each([
    "https://leaguepilot.us/api/qa-target-identity",
    "https://www.leaguepilot.us./api/qa-target-identity"
  ])("rejects canonical production request host %s", async (url) => {
    vi.stubEnv("QA_TARGET_IDENTITY_ENABLED", "enabled");
    vi.stubEnv("QA_TARGET_DEPLOYMENT_CLASS", "preview");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://gmrvnnkxksqkcxcmydhr.supabase.co");

    const response = await GET(new Request(url));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false });
  });

  it("rejects a normalized canonical production forwarded host", async () => {
    vi.stubEnv("QA_TARGET_IDENTITY_ENABLED", "enabled");
    vi.stubEnv("QA_TARGET_DEPLOYMENT_CLASS", "preview");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://gmrvnnkxksqkcxcmydhr.supabase.co");

    const response = await GET(
      new Request("https://internal.example/api/qa-target-identity", {
        headers: { "x-forwarded-host": "LEAGUEPILOT.US.:443" }
      })
    );

    expect(response.status).toBe(403);
  });
});
