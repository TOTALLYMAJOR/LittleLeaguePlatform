import { describe, expect, it } from "vitest";
import {
  evaluateGovernance,
  parseDeclaredSlugs,
  parseRegisteredOwners,
  findDocumentAuthorityClaims,
  lpUxNumber,
  parseFrontMatter,
  readAgentflowBacklogPath,
  summarize
} from "../scripts/verify-governance-authority.mjs";

function doc(path, frontMatter, body = "") {
  const lines = Object.entries(frontMatter ?? {}).map(([key, value]) => {
    if (value === null) return `${key}: null`;
    if (Array.isArray(value)) return `${key}: [${value.join(", ")}]`;
    return `${key}: ${value}`;
  });
  const source = frontMatter ? `---\n${lines.join("\n")}\n---\n\n${body}` : body;
  return { path, source, frontMatter: parseFrontMatter(source) };
}

const register = "docs/AUTHORITY.md";

function run(documents, { backlogPath = "BACKLOG.md", registerSource = "" } = {}) {
  return evaluateGovernance({ documents, agentflowBacklogPath: backlogPath, registerSource });
}

describe("front matter parsing", () => {
  it("reads scalars, nulls, and inline arrays", () => {
    const parsed = parseFrontMatter("---\nauthority: active\nanswers: null\nsupersedes: [a.md, b.md]\n---\nbody");
    expect(parsed).toEqual({ authority: "active", answers: null, supersedes: ["a.md", "b.md"] });
  });

  it("returns null when there is no front matter", () => {
    expect(parseFrontMatter("# Just a heading")).toBeNull();
  });

  it("reads an empty array", () => {
    expect(parseFrontMatter("---\nsupersedes: []\n---\n").supersedes).toEqual([]);
  });
});

describe("authority prose detection", () => {
  it("flags a claim made about a document", () => {
    const claims = findDocumentAuthorityClaims("docs/backlog-closeout.md is now authoritative for gates.");
    expect(claims).toHaveLength(1);
    expect(claims[0].phrase).toBe("is now authoritative");
  });

  it("does not flag a domain sentence about records", () => {
    const claims = findDocumentAuthorityClaims(
      "The approved guardian-link record is authoritative for access, and admin is the responsible authority."
    );
    expect(claims).toHaveLength(0);
  });
});

describe("deferring to a registered owner is compliant", () => {
  const owners = parseRegisteredOwners("| schema | `supabase/migrations/` | code |\n| nav | `lib/navigation/route-topology.ts` | code |");

  it("parses full owner paths only, never basenames", () => {
    expect(owners.has("supabase/migrations/")).toBe(true);
    expect(owners.has("lib/navigation/route-topology.ts")).toBe(true);
    expect(owners.has("route-topology.ts")).toBe(false);
  });

  it("does not flag a document deferring to a registered code owner", () => {
    const claims = findDocumentAuthorityClaims(
      "| Data model | docs/enterprise/data-model-erd.md | Drafted overview; supabase/migrations/ remain source of truth. |",
      undefined,
      owners
    );
    expect(claims).toHaveLength(0);
  });

  it("flags a document claiming authority without naming an owner", () => {
    const claims = findDocumentAuthorityClaims("This file is now authoritative for the queue.", undefined, owners);
    expect(claims).toHaveLength(1);
  });
});

describe("lp-ux numbering", () => {
  it("extracts the number", () => {
    expect(lpUxNumber("lp-ux-016-shared-open-items.md")).toBe("016");
  });

  it("ignores unrelated names", () => {
    expect(lpUxNumber("06-saturday-ready-target-state.md")).toBeNull();
  });
});

describe("agentflow backlog path", () => {
  it("reads the nested path", () => {
    expect(readAgentflowBacklogPath("version: 1\n\nbacklog:\n  path: BACKLOG.md\n\nworkers:\n  maximum: 3\n")).toBe("BACKLOG.md");
  });
});

describe("R2 — one active owner per question", () => {
  it("reports two active owners of the same question", () => {
    const findings = run([
      doc("a.md", { authority: "active", answers: "execution-queue" }),
      doc("b.md", { authority: "active", answers: "execution-queue" })
    ]);
    const r2 = findings.filter((finding) => finding.rule === "R2");
    expect(r2).toHaveLength(1);
    expect(r2[0].level).toBe("error");
  });

  it("accepts a single active owner", () => {
    const findings = run([doc("BACKLOG.md", { authority: "active", answers: "execution-queue" })]);
    expect(findings.filter((finding) => finding.rule === "R2")).toHaveLength(0);
  });
});

describe("R3 — historical requires a resolvable pointer", () => {
  it("reports a historical document with no superseded_by", () => {
    const findings = run([doc("old.md", { authority: "historical", answers: null, superseded_by: null })]);
    const r3 = findings.filter((finding) => finding.rule === "R3");
    expect(r3).toHaveLength(1);
    expect(r3[0].level).toBe("error");
  });

  it("accepts a pointer to a known document", () => {
    const findings = run([
      doc("old.md", { authority: "historical", answers: null, superseded_by: "new.md" }),
      doc("new.md", { authority: "active", answers: "execution-queue" })
    ]);
    expect(findings.filter((finding) => finding.rule === "R3")).toHaveLength(0);
  });
});

describe("R7 — automation and prose agree on the queue", () => {
  it("reports a mismatch between .agentflow.yaml and the active owner", () => {
    const findings = run(
      [doc("docs/other-queue.md", { authority: "active", answers: "execution-queue" })],
      { backlogPath: "BACKLOG.md" }
    );
    const r7 = findings.filter((finding) => finding.rule === "R7");
    expect(r7).toHaveLength(1);
    expect(r7[0].level).toBe("error");
    expect(r7[0].message).toContain("BACKLOG.md");
  });

  it("passes when they agree", () => {
    const findings = run(
      [doc("BACKLOG.md", { authority: "active", answers: "execution-queue" })],
      { backlogPath: "BACKLOG.md" }
    );
    expect(findings.filter((finding) => finding.rule === "R7" && finding.level === "error")).toHaveLength(0);
  });
});

describe("R6 — lp-ux primary uniqueness", () => {
  it("reports two primaries sharing a number", () => {
    const findings = run([
      doc("docs/lp-ux-009-a.md", { authority: "evidence", answers: "product-direction" }),
      doc("docs/lp-ux-009-b.md", { authority: "evidence", answers: "product-direction" })
    ]);
    expect(findings.filter((finding) => finding.rule === "R6")).toHaveLength(1);
  });

  it("ignores supporting files that declare answers: null", () => {
    const findings = run([
      doc("docs/lp-ux-009-a.md", { authority: "active", answers: "product-direction" }),
      doc("docs/lp-ux-009-b.md", { authority: "evidence", answers: null })
    ]);
    expect(findings.filter((finding) => finding.rule === "R6")).toHaveLength(0);
  });
});

describe("R8 — reachability", () => {
  it("exempts evidence and reference documents", () => {
    const findings = run([
      doc("docs/proof.md", { authority: "evidence", answers: null }),
      doc("docs/enterprise/srs.md", { authority: "reference", answers: null })
    ]);
    expect(findings.filter((finding) => finding.rule === "R8")).toHaveLength(0);
  });

  it("reports an unreachable active document", () => {
    const findings = run([doc("docs/stray.md", { authority: "active", answers: "code-rules" })], {
      registerSource: "nothing here"
    });
    expect(findings.filter((finding) => finding.rule === "R8")).toHaveLength(1);
  });
});

describe("summarize", () => {
  it("counts by level", () => {
    expect(summarize([{ level: "error" }, { level: "warn" }, { level: "warn" }])).toEqual({ errors: 1, warnings: 2 });
  });
});

describe("register presence", () => {
  it("treats the register itself as exempt from prose and reachability rules", () => {
    const findings = run([doc(register, { authority: "active", answers: "authority-register" }, "docs/x.md is now authoritative")]);
    expect(findings.filter((finding) => finding.rule === "R5")).toHaveLength(0);
    expect(findings.filter((finding) => finding.rule === "R8")).toHaveLength(0);
  });
});

const REGISTER = [
  "## Register",
  "",
  "| Question | Owner | Kind |",
  "| --- | --- | --- |",
  "| queue | `BACKLOG.md` | doc |",
  "| gates | `docs/backlog-closeout-2026-07-27.md` | doc |",
  "| schema | `supabase/migrations/` | code |",
  "| contracts | `lib/domain/` | code |",
  "",
  "## Retired",
  "",
  "| `docs/Features.md` | `docs/capability-matrix.md` |",
  "",
  "## Front-matter contract",
  "",
  "`answers` uses a stable slug, not a sentence: `execution-queue`, `implementation-truth`."
].join("\n");

describe("readAgentflowBacklogPath — regressions", () => {
  it("reads backlog when it is the final block (no trailing key)", () => {
    expect(readAgentflowBacklogPath("version: 1\n\nbacklog:\n  path: BACKLOG.md\n")).toBe("BACKLOG.md");
  });

  it("does not truncate a path containing a capital Z", () => {
    expect(readAgentflowBacklogPath("backlog:\n  path: docs/ZONES.md\n\nworkers:\n  maximum: 3\n")).toBe("docs/ZONES.md");
  });
});

describe("parseRegisteredOwners — scope", () => {
  const owners = parseRegisteredOwners(REGISTER);

  it("reads only the Register section, not Retired", () => {
    expect(owners.has("BACKLOG.md")).toBe(true);
    expect(owners.has("docs/Features.md")).toBe(false);
    expect(owners.has("docs/capability-matrix.md")).toBe(false);
  });

  it("does not register bare basenames", () => {
    expect(owners.has("domain")).toBe(false);
    expect(owners.has("migrations")).toBe(false);
  });
});

describe("parseDeclaredSlugs", () => {
  it("reads the declared vocabulary", () => {
    const slugs = parseDeclaredSlugs(REGISTER);
    expect(slugs.has("execution-queue")).toBe(true);
    expect(slugs.has("implementation-truth")).toBe(true);
  });
});

describe("R5 — sentence scoping", () => {
  const owners = parseRegisteredOwners(REGISTER);

  it("a bare word does not stand in for a directory owner", () => {
    expect(findDocumentAuthorityClaims("This document is now authoritative for the domain model.", undefined, owners)).toHaveLength(1);
  });

  it("an owner in a neighbouring sentence does not suppress the claim", () => {
    const text = "Update `BACKLOG.md` when scope changes.\nUse `docs/agentic-architecture.md` as the source of truth for boundaries.";
    expect(findDocumentAuthorityClaims(text, undefined, owners)).toHaveLength(1);
  });

  it("accepts a relative link that omits the docs/ prefix", () => {
    const text = "The [closeout ledger](backlog-closeout-2026-07-27.md) is authoritative for gates.";
    expect(findDocumentAuthorityClaims(text, undefined, owners)).toHaveLength(0);
  });
});

describe("severities that must fail --enforce", () => {
  it("R1 errors on missing front matter", () => {
    const findings = run([{ path: "docs/stray.md", source: "# No front matter", frontMatter: null }]);
    const r1 = findings.filter((f) => f.rule === "R1");
    expect(r1[0].level).toBe("error");
  });

  it("R1 errors on an undeclared slug", () => {
    const findings = run([doc("docs/x.md", { authority: "active", answers: "implementation-truthh" })], { registerSource: REGISTER });
    expect(findings.some((f) => f.rule === "R1" && f.level === "error" && f.message.includes("Unknown question slug"))).toBe(true);
  });

  it("R2 errors when a contested document disputes an active owner", () => {
    const findings = run([
      doc("a.md", { authority: "active", answers: "execution-queue" }),
      doc("b.md", { authority: "contested", answers: "execution-queue" })
    ]);
    expect(findings.some((f) => f.rule === "R2" && f.level === "error")).toBe(true);
  });

  it("R7 errors when the execution-queue owner disappears", () => {
    const findings = run([doc("BACKLOG.md", { authority: "historical", answers: null, superseded_by: "BACKLOG.md" })]);
    expect(findings.some((f) => f.rule === "R7" && f.level === "error")).toBe(true);
  });

  it("R9 errors when supersession is not reciprocal", () => {
    const findings = run([
      doc("old.md", { authority: "historical", answers: null, superseded_by: "new.md" }),
      doc("new.md", { authority: "active", answers: "execution-queue", supersedes: [] })
    ]);
    expect(findings.some((f) => f.rule === "R9" && f.level === "error")).toBe(true);
  });

  it("R9 passes when both sides agree", () => {
    const findings = run([
      doc("old.md", { authority: "historical", answers: null, superseded_by: "new.md" }),
      doc("new.md", { authority: "active", answers: "execution-queue", supersedes: ["old.md"] })
    ]);
    expect(findings.filter((f) => f.rule === "R9")).toHaveLength(0);
  });
});

describe("R8 — path matching", () => {
  it("a shared basename is not reachability", () => {
    const findings = run([doc("docs/archive/BACKLOG.md", { authority: "active", answers: "execution-queue" })], {
      backlogPath: "docs/archive/BACKLOG.md",
      registerSource: "| queue | `BACKLOG.md` | doc |"
    });
    expect(findings.some((f) => f.rule === "R8")).toBe(true);
  });
});
