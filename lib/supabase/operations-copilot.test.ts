import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Operations Copilot persistence contract", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20260818172017_operations_copilot_control_plane.sql"),
    "utf8"
  );

  it("keeps agent runs and approvals service-only behind RLS", () => {
    expect(sql).toContain("alter table public.agent_runs enable row level security");
    expect(sql).toContain("alter table public.approval_requests enable row level security");
    expect(sql).toContain("revoke all on table public.agent_runs from public, anon, authenticated");
    expect(sql).toContain("grant select, insert, update, delete on table public.approval_requests to service_role");
  });

  it("records generation and review audit evidence in atomic RPCs", () => {
    expect(sql).toContain("create_operations_copilot_brief");
    expect(sql).toContain("review_operations_copilot_approval");
    expect(sql).toContain("operations_copilot_brief_created");
    expect(sql).toContain("No underlying league action was executed");
    expect(sql).toContain("unique (organization_id, request_key)");
  });
});
