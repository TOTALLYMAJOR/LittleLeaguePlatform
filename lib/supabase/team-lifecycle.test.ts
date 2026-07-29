import { describe, expect, it } from "vitest";
import { isCurrentTeamRow, orderCurrentTeamsFirst, selectCurrentTeamsOrAll } from "./team-lifecycle";

describe("team lifecycle helpers", () => {
  it("treats active teams in active seasons as current", () => {
    expect(isCurrentTeamRow({ status: "active", seasons: { status: "active" } })).toBe(true);
    expect(isCurrentTeamRow({ status: "archived", seasons: { status: "active" } })).toBe(false);
    expect(isCurrentTeamRow({ status: "active", seasons: { status: "archived" } })).toBe(false);
  });

  it("orders active current teams before archived rows", () => {
    const rows = orderCurrentTeamsFirst([
      { id: "archived", name: "Archived Tigers", division: "3U", status: "archived", seasons: { status: "archived" } },
      { id: "active", name: "Tiny Tigers", division: "6U", status: "active", seasons: { status: "active" } }
    ]);

    expect(rows.map((row) => row.id)).toEqual(["active", "archived"]);
  });

  it("selects current rows for public workflows when available", () => {
    const rows = selectCurrentTeamsOrAll([
      { id: "archived", name: "Archived Tigers", division: "3U", status: "archived", seasons: { status: "archived" } },
      { id: "active", name: "Tiny Tigers", division: "6U", status: "active", seasons: { status: "active" } }
    ]);

    expect(rows.map((row) => row.id)).toEqual(["active"]);
  });
});
