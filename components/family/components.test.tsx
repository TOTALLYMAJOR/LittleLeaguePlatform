import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChangeBand } from "./change-band";
import { FamilyFilter } from "./family-filter";
import { ReadinessStrip } from "./readiness-strip";
import { RsvpControl } from "./rsvp-control";

describe("Family reference components", () => {
  it("renders one three-option RSVP grammar with pressed-state semantics", () => {
    const html = renderToStaticMarkup(
      <RsvpControl
        eventId="event-1"
        playerId="player-1"
        childLabel="Mason T."
        eventTitle="Tiny Tigers game"
        scheduleVersion={3}
        currentResponse="going"
        currentLockVersion={2}
        disabled={false}
      />
    );
    expect(html).toContain('data-response="going" aria-pressed="true"');
    expect(html).toContain('data-response="maybe" aria-pressed="false"');
    expect(html).toContain('data-response="not_going" aria-pressed="false"');
    expect(html).toContain("Can’t go");
    expect(html).not.toContain("Can’t attend");

    const source = readFileSync(join(process.cwd(), "components/family/rsvp-control.tsx"), "utf8");
    expect(source).toContain("The schedule changed since this page loaded.");
    expect(source).toContain("Another guardian already answered");
    expect(source).toContain("RSVP saved for ${childLabel}");
  });

  it("renders both honest readiness states", () => {
    const ready = renderToStaticMarkup(<ReadinessStrip eventTitle="Tiny Tigers game" items={[]} />);
    expect(ready).toContain("Nothing unresolved");
    expect(ready).toContain("is-ready");

    const needsAction = renderToStaticMarkup(
      <ReadinessStrip
        eventTitle="Tiny Tigers game"
        items={[{ id: "rsvp", label: "Mason T.: RSVP is required", href: "/parent/rsvp?eventId=event-1&playerId=player-1" }]}
      />
    );
    expect(needsAction).toContain("1 thing needs you");
    expect(needsAction).toContain("needs-action");
    expect(needsAction).toContain("eventId=event-1");
  });

  it("keeps FamilyFilter selection explicit and What Changed review non-authoritative", () => {
    const filter = renderToStaticMarkup(
      <FamilyFilter
        childrenList={[
          { id: "player-1", label: "Mason T.", teamId: "team-1", teamName: "Tiny Tigers" },
          { id: "player-2", label: "Avery T.", teamId: "team-2", teamName: "Rookie Rockets" }
        ]}
        selectedChildId=""
        onSelect={() => undefined}
      />
    );
    expect(filter).toContain("Everyone");
    expect(filter).toContain('aria-pressed="true"');
    expect(filter.match(/aria-pressed="false"/g)).toHaveLength(2);

    const changes = renderToStaticMarkup(
      <ChangeBand
        changes={[{
          id: "change-1",
          eventId: "event-1",
          eventTitle: "Tiny Tigers game",
          teamName: "Tiny Tigers",
          childIds: ["player-1"],
          childLabels: ["Mason T."],
          changeType: "time_changed",
          actorLabel: "Coach Taylor",
          changedAt: "2026-04-03T12:00:00.000Z",
          canonicalHref: "/parent/schedule?eventId=event-1",
          seenAt: null,
          acknowledgedAt: null,
          requiresAcknowledgment: true,
          diffs: [{
            field: "start_time",
            label: "Start time",
            previousValue: "6:00 PM",
            currentValue: "5:30 PM"
          }]
        }]}
        querySucceeded
        timeZone="America/Chicago"
        onAcknowledge={async () => ({
          ok: true,
          message: "Event change acknowledged.",
          seenAt: "2026-04-03T12:05:00.000Z",
          acknowledgedAt: "2026-04-03T12:05:00.000Z"
        })}
      />
    );
    expect(changes).toContain("Recent event changes for your family");
    expect(changes).toContain("Acknowledgment needed");
    expect(changes).toContain("Checking connection");
    expect(changes).toContain("Acknowledgment requires the button and never changes attendance or RSVP.");
    expect(changes).toContain('aria-label="changed to 5:30 PM"');
  });

  it("never renders an acknowledgment control for informational or unconfirmed receipt state", () => {
    const baseChange = {
      id: "change-1",
      eventId: "event-1",
      eventTitle: "Tiny Tigers game",
      teamName: "Tiny Tigers",
      childIds: ["player-1"],
      childLabels: ["Mason T."],
      actorLabel: "Coach Taylor",
      changedAt: "2026-04-03T12:00:00.000Z",
      canonicalHref: "/parent/schedule?eventId=event-1",
      seenAt: null,
      acknowledgedAt: null,
      diffs: []
    };
    const onAcknowledge = async () => ({
      ok: true,
      message: "Recorded.",
      seenAt: "2026-04-03T12:05:00.000Z",
      acknowledgedAt: null
    });
    const informational = renderToStaticMarkup(
      <ChangeBand
        changes={[{ ...baseChange, changeType: "created", requiresAcknowledgment: false }]}
        querySucceeded
        timeZone="America/Chicago"
        onAcknowledge={onAcknowledge}
      />
    );
    expect(informational).toContain("Recording view");
    expect(informational).not.toContain("Acknowledge change");

    const unconfirmed = renderToStaticMarkup(
      <ChangeBand
        changes={[{ ...baseChange, changeType: "cancelled", requiresAcknowledgment: true }]}
        querySucceeded={false}
        timeZone="America/Chicago"
        onAcknowledge={onAcknowledge}
      />
    );
    expect(unconfirmed).toContain("Receipt unconfirmed");
    expect(unconfirmed).not.toContain("Acknowledge change");
  });
});
