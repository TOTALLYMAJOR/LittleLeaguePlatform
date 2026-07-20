const sharedProofLevels = Object.freeze([
  "local",
  "browser",
  "provider-sandbox",
  "hosted",
  "operational",
]);

export const systemProfiles = Object.freeze({
  leaguepilot: Object.freeze({
    name: "LeaguePilot",
    repoPath: "/home/administrator/projects/youth-sports-platform-mvp-v3",
    invariants: Object.freeze([
      "Children do not log in; guardians own child access.",
      "Parent, coach, and administrator authority stays explicit and server-derived.",
      "Keep draft, approval, publication, provider acceptance, delivery, read, and acknowledgment separate.",
      "Preserve existing workflow enums and derive presentation states from evidence.",
      "Archived seasons are read-only.",
    ]),
    proofBoundaries: Object.freeze([
      "A saved record is not proof of publication or delivery.",
      "A local test is not hosted, RLS, provider, or operational proof.",
      "Provider sends, media release, and payments remain disabled until their gates and evidence pass.",
    ]),
    validation: Object.freeze([
      "npm run check:skills",
      "npm run typecheck",
      "npm test",
      "npm run build",
      "npm audit",
      "npm run qa:rls-proof",
    ]),
    stopConditions: Object.freeze([
      "Stop before granting child access, publishing, sending, charging, or releasing media without the required human and service authority.",
      "Stop when the active organization, season, team, or role cannot be verified.",
      "Report unknown provider or hosted state instead of inferring success.",
    ]),
  }),
  quietpilot: Object.freeze({
    name: "QuietPilot",
    repoPath: "/home/administrator/QP/QuietPilot",
    invariants: Object.freeze([
      "Keep quote, proposal, acceptance, payment, job activation, and operational readiness distinct.",
      "Preserve tenant and workspace authorization at every route and service boundary.",
      "Retain idempotency, outbox, and accepted-commercial-snapshot semantics.",
    ]),
    proofBoundaries: Object.freeze([
      "A proposal handoff is not acceptance.",
      "A browser return is not payment settlement.",
      "A created job is not operational readiness.",
    ]),
    validation: Object.freeze([
      "Use the repository-defined focused tests first.",
      "Run repository typecheck and build gates.",
      "Use authorized hosted probes only when hosted proof is requested.",
    ]),
    stopConditions: Object.freeze([
      "Stop before expanding commercial or machine authority beyond the named workflow.",
      "Stop if a refactor would blur accepted-state, payment, activation, or readiness boundaries.",
    ]),
  }),
  littlelegend: Object.freeze({
    name: "Little Legend Studios",
    repoPath: "/home/administrator/projects/LittleLegendStudios2",
    invariants: Object.freeze([
      "Parent identity and child-project authority must be independently verified.",
      "Preview sessions and child-director workflows cannot expose or overwrite another family's work.",
      "Isolate database and Redis resources from other local products.",
    ]),
    proofBoundaries: Object.freeze([
      "Route presence is not authentication or production-readiness proof.",
      "Synthetic media fixtures are not provider or hosted proof.",
      "An untracked or unborn branch has no released provenance.",
    ]),
    validation: Object.freeze([
      "Run the repository smoke command when available.",
      "Exercise the relevant browser and API journey.",
      "Verify authentication and ownership checks around the exact feature.",
    ]),
    stopConditions: Object.freeze([
      "Stop when the parent, child, project, or preview-session owner cannot be verified.",
      "Stop before claiming release status without a tracked baseline and deployment evidence.",
    ]),
  }),
  championcoach: Object.freeze({
    name: "Champion Coach OS",
    repoPath: "/home/administrator/projects/champion_coach_os_repo",
    invariants: Object.freeze([
      "Canonical truth precedes comparison, recommendations, and promotion.",
      "Agent outputs remain candidates until independent validation promotes them.",
      "Causal and performance claims require evidence stronger than synthetic replay.",
    ]),
    proofBoundaries: Object.freeze([
      "A scaffold or local synthetic test is not authorization.",
      "Telemetry presence is not causal validation.",
      "A renamed pattern is not automatically novel.",
    ]),
    validation: Object.freeze([
      "Run the repository documentation sync audit.",
      "Run focused decision-intelligence and feature-flag tests.",
      "Verify hosted routes and flags before making hosted claims.",
    ]),
    stopConditions: Object.freeze([
      "Stop before promoting a candidate without the required independent evidence.",
      "Stop if telemetry or agent output can bypass a controlling feature flag.",
    ]),
  }),
});

export const supportedProofLevels = sharedProofLevels;

export function resolveSystemProfile(system) {
  const normalized = String(system ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  const aliases = {
    leaguepilot: "leaguepilot",
    littleleaguehq: "leaguepilot",
    quietpilot: "quietpilot",
    littlelegend: "littlelegend",
    littlelegendstudios: "littlelegend",
    championcoach: "championcoach",
    championcoachos: "championcoach",
  };

  const key = aliases[normalized];
  if (!key) {
    throw new Error(
      `Unsupported system "${system}". Use LeaguePilot, QuietPilot, Little Legend Studios, or Champion Coach OS.`,
    );
  }

  return systemProfiles[key];
}
