import { describe, expect, it } from "vitest";
import {
  evaluateGovernance,
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
