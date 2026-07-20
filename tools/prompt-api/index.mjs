import { resolveSystemProfile, supportedProofLevels } from "./profiles.mjs";

function requireText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new Error(`${name} is required.`);
  }
  return text;
}

function list(value, fallback = []) {
  if (Array.isArray(value)) {
    const normalized = value.map((item) => String(item).trim()).filter(Boolean);
    return normalized.length > 0 ? normalized : fallback;
  }
  if (typeof value === "string") {
    const normalized = value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
    return normalized.length > 0 ? normalized : fallback;
  }
  return fallback;
}

function section(title, lines) {
  return [`## ${title}`, ...lines.map((line) => `- ${line}`)].join("\n");
}

function profileSections(profile) {
  return [
    `Repository: ${profile.repoPath}`,
    section("System invariants", profile.invariants),
    section("Proof boundaries", profile.proofBoundaries),
    section("Default validation", profile.validation),
    section("Stop conditions", profile.stopConditions),
  ].join("\n\n");
}

/**
 * Build a reviewable, side-effect-free implementation prompt.
 */
export function codex_spec({
  system,
  goal,
  scope = [],
  constraints = [],
  authority = "Read and change only the named repository scope.",
  proofLevel = "local",
  validation = [],
}) {
  const profile = resolveSystemProfile(system);
  const normalizedProof = requireText(proofLevel, "proofLevel").toLowerCase();
  if (!supportedProofLevels.includes(normalizedProof)) {
    throw new Error(
      `Unsupported proofLevel "${proofLevel}". Use ${supportedProofLevels.join(", ")}.`,
    );
  }

  const requestedValidation = list(validation, profile.validation);
  const requestedScope = list(scope, ["Discover the smallest repo-native vertical slice that achieves the goal."]);
  const requestedConstraints = list(constraints, [
    "Preserve current route contracts and unrelated worktree changes.",
    "Label implemented, inferred, and unknown evidence accurately.",
  ]);

  return [
    `# ${profile.name} implementation specification`,
    "",
    "Start by reading the current repository, its agent instructions, routes, services, tests, and product copy. Treat current repo truth as authoritative. Do not invent unsupported functionality.",
    "",
    `Goal: ${requireText(goal, "goal")}`,
    `Requested proof level: ${normalizedProof}`,
    `Authority: ${requireText(authority, "authority")}`,
    "",
    section("Scope", requestedScope),
    "",
    section("Constraints", requestedConstraints),
    "",
    profileSections(profile),
    "",
    section("Requested validation", requestedValidation),
    "",
    "## Required handoff",
    "- Lead with the implemented outcome.",
    "- Separate local implementation, browser evidence, hosted evidence, provider evidence, and operational evidence.",
    "- Report every blocked or unknown proof boundary without converting it into a success claim.",
    "- Preserve unrelated worktree changes and list the files changed for this slice.",
  ].join("\n");
}

/**
 * Build a reviewable, side-effect-free debugging prompt.
 */
export function codex_debug({
  system,
  symptom,
  expected,
  reproduction = [],
  evidence = [],
  allowedChanges = "Diagnose first; change only the smallest confirmed cause.",
}) {
  const profile = resolveSystemProfile(system);
  const reproductionSteps = list(reproduction, ["Reproduce from the exact affected route or API journey."]);
  const availableEvidence = list(evidence, ["Collect current logs, response status, and scoped browser or test evidence."]);

  return [
    `# ${profile.name} debugging brief`,
    "",
    "Diagnose from current repository and runtime evidence. Do not implement a speculative fix. Preserve unrelated worktree changes and all authority/proof boundaries.",
    "",
    `Symptom: ${requireText(symptom, "symptom")}`,
    `Expected: ${requireText(expected, "expected")}`,
    `Allowed changes: ${requireText(allowedChanges, "allowedChanges")}`,
    "",
    section("Reproduction", reproductionSteps),
    "",
    section("Available evidence", availableEvidence),
    "",
    profileSections(profile),
    "",
    "## Required method",
    "- Reproduce and identify the first incorrect boundary or state transition.",
    "- Label the cause as verified, inferred, or unknown.",
    "- If changes are allowed, patch the smallest cause and run risk-matched validation.",
    "- Report what remains unverified, especially hosted, provider, payment, delivery, privacy, and recovery behavior.",
  ].join("\n");
}
