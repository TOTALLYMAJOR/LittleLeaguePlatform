import { describe, expect, it } from "vitest";
import { approveRegistrationRequest } from "./registration-approvals";

describe("registration approval verification boundary", () => {
  it("requires review evidence before attempting the approval RPC", async () => {
    const result = await approveRegistrationRequest({
      requestId: "request-1",
      reviewerUserId: "admin-1",
      note: "   ",
    });

    expect(result).toEqual({
      ok: false,
      message:
        "Registration request, reviewer, and verification note are required.",
    });
  });
});
