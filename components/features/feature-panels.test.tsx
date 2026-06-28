import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { seedState, type AppState } from "@/lib/domain";
import { AdminAuditPanel, CoachTeamPanel, ParentDashboardPanel } from ".";

const parentActor = {
  userId: "user-parent-jordan",
  role: "parent",
  organizationId: seedState.organization.id
} as const;

const coachActor = {
  userId: "user-coach-taylor",
  role: "coach",
  organizationId: seedState.organization.id
} as const;

const adminActor = {
  userId: "user-admin",
  role: "admin",
  organizationId: seedState.organization.id
} as const;

describe("feature panels", () => {
  it("renders parent dashboard data only for the parent role and linked players", () => {
    const html = renderToStaticMarkup(<ParentDashboardPanel actor={parentActor} state={seedState} now="2026-04-01T12:00:00.000Z" />);

    expect(html).toContain("Parent dashboard");
    expect(html).toContain("Mason T.");
    expect(html).toContain("Tiny Tigers");
    expect(html).not.toContain("Ella Q.");
  });

  it("blocks coach users from the parent dashboard panel", () => {
    const html = renderToStaticMarkup(<ParentDashboardPanel actor={coachActor} state={seedState} />);

    expect(html).toContain("Coach cannot view this panel");
    expect(html).not.toContain("Mason T.");
  });

  it("renders only coach-visible teams in the coach team panel", () => {
    const html = renderToStaticMarkup(<CoachTeamPanel actor={coachActor} state={seedState} now="2026-04-01T12:00:00.000Z" />);

    expect(html).toContain("Coach team panel");
    expect(html).toContain("Tiny Tigers");
    expect(html).not.toContain("Happy Hawks");
  });

  it("renders audit events for admins only", () => {
    const state: AppState = {
      ...seedState,
      auditEvents: [
        {
          id: "audit-test",
          actorUserId: "user-admin",
          action: "registration_reviewed",
          targetType: "registration_request",
          targetId: "registration-test",
          summary: "Registration review stayed admin-scoped.",
          createdAt: "2026-04-01T12:00:00.000Z"
        }
      ]
    };

    const adminHtml = renderToStaticMarkup(<AdminAuditPanel actor={adminActor} state={state} now="2026-04-01T12:00:00.000Z" />);
    const parentHtml = renderToStaticMarkup(<AdminAuditPanel actor={parentActor} state={state} />);

    expect(adminHtml).toContain("Admin audit panel");
    expect(adminHtml).toContain("registration_reviewed");
    expect(parentHtml).toContain("Parent cannot view this panel");
    expect(parentHtml).not.toContain("registration_reviewed");
  });
});
