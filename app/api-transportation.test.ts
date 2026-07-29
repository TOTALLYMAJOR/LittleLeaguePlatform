import { describe, expect, it, vi } from "vitest";
import { POST as requestRide } from "./api/parent/transportation/request/route";
import { POST as offerRide } from "./api/parent/transportation/[requestId]/offer/route";
import { POST as acceptRide } from "./api/parent/transportation/assignments/[assignmentId]/accept/route";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import {
  acceptTransportationAssignment,
  offerTransportation,
  requestTransportation
} from "@/lib/supabase/transportation";

vi.mock("@/lib/supabase/route-auth", () => ({ requireAuthenticatedRouteUser: vi.fn() }));
vi.mock("@/lib/supabase/transportation", () => ({
  requestTransportation: vi.fn(),
  offerTransportation: vi.fn(),
  acceptTransportationAssignment: vi.fn(),
  withdrawTransportationRequest: vi.fn(),
  withdrawTransportationAssignment: vi.fn()
}));

const authMock = vi.mocked(requireAuthenticatedRouteUser);
const requestMock = vi.mocked(requestTransportation);
const offerMock = vi.mocked(offerTransportation);
const acceptMock = vi.mocked(acceptTransportationAssignment);

describe("transportation APIs", () => {
  it("derives the requesting guardian from the verified session", async () => {
    authMock.mockResolvedValue({ ok: true, user: { id: "parent-verified" } });
    requestMock.mockResolvedValue({ ok: true, message: "Saved.", result: {} });
    const response = await requestRide(new Request("http://localhost/api/parent/transportation/request", {
      method: "POST",
      headers: { authorization: "Bearer token", "content-type": "application/json" },
      body: JSON.stringify({
        eventId: "event-1",
        playerId: "player-1",
        direction: "outbound",
        expectedScheduleVersion: 2,
        actorUserId: "attacker"
      })
    }));
    expect(response.status).toBe(201);
    expect(requestMock).toHaveBeenCalledWith({
      eventId: "event-1",
      playerId: "player-1",
      actorUserId: "parent-verified",
      direction: "outbound",
      expectedScheduleVersion: 2
    });
  });

  it("derives the offering guardian and bounds seats", async () => {
    authMock.mockResolvedValue({ ok: true, user: { id: "driver-verified" } });
    offerMock.mockResolvedValue({ ok: true, message: "Saved.", result: {} });
    const response = await offerRide(
      new Request("http://localhost/api/parent/transportation/request-1/offer", {
        method: "POST",
        headers: { authorization: "Bearer token", "content-type": "application/json" },
        body: JSON.stringify({ seats: 2, actorUserId: "attacker" })
      }),
      { params: Promise.resolve({ requestId: "request-1" }) }
    );
    expect(response.status).toBe(201);
    expect(offerMock).toHaveBeenCalledWith({ requestId: "request-1", actorUserId: "driver-verified", seats: 2 });
  });

  it("passes the current version to mutual acceptance", async () => {
    authMock.mockResolvedValue({ ok: true, user: { id: "requester-verified" } });
    acceptMock.mockResolvedValue({ ok: true, message: "Accepted.", result: {} });
    const response = await acceptRide(
      new Request("http://localhost/api/parent/transportation/assignments/assignment-1/accept", {
        method: "POST",
        headers: { authorization: "Bearer token", "content-type": "application/json" },
        body: JSON.stringify({ expectedScheduleVersion: 3, actorUserId: "attacker" })
      }),
      { params: Promise.resolve({ assignmentId: "assignment-1" }) }
    );
    expect(response.status).toBe(200);
    expect(acceptMock).toHaveBeenCalledWith({
      assignmentId: "assignment-1",
      actorUserId: "requester-verified",
      expectedScheduleVersion: 3
    });
  });
});
