import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { seedState } from "@/lib/domain";
import { OfficialCommunicationWorkbench } from "./official-communication-workbench";

describe("OfficialCommunicationWorkbench", () => {
  it("makes human review, immutable correction, event version, and separate delivery visible", () => {
    const event = { ...seedState.events[0], scheduleVersion: 3 };
    const html = renderToStaticMarkup(
      <OfficialCommunicationWorkbench
        events={[event]}
        teams={seedState.teams.filter((team) => team.id === event.teamId)}
        initialData={{
          ok: true,
          message: "Current history loaded.",
          threads: [{
            id: "thread-1",
            organizationId: event.organizationId,
            teamId: event.teamId,
            eventId: event.id,
            category: "official_update",
            state: "published",
            currentVersionNumber: 2,
            currentVersionId: "version-2",
            title: "Arrival time changed",
            body: "Please arrive at 5:30 PM.",
            reason: "Coach confirmed the updated arrival time.",
            priority: "action_required",
            approvedByUserId: "admin-1",
            approvedByName: "Alex Morgan",
            publishedAt: "2026-04-04T07:00:00.000Z",
            eventScheduleVersion: 3,
            requiredProjectionCount: 4,
            readyProjectionCount: 3,
            openIncident: true
          }]
        }}
      />
    );
    expect(html).toContain("Publish one official message version everywhere families look.");
    expect(html).toContain("official event version 3");
    expect(html).toContain("I reviewed the event version");
    expect(html).toContain("Never started by publish");
    expect(html).toContain("Correct");
    expect(html).toContain("Withdraw");
    expect(html).toContain("A required family surface does not match this version");
  });
});
