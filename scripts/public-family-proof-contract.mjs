import { createHash } from "node:crypto";

const localHostnames = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1"
]);

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function trimmed(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function isValidPublicOrganizationId(value) {
  return uuidPattern.test(trimmed(value));
}

export function createPublicOrganizationFingerprint(organizationId) {
  const normalized = trimmed(organizationId).toLowerCase();
  if (!isValidPublicOrganizationId(normalized)) return "";
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

export function normalizeProofText(value) {
  return trimmed(value).replace(/\s+/g, " ");
}

export function parsePublicFamilyTarget(value, blockers = []) {
  const rawTarget = trimmed(value) || "http://127.0.0.1:3022";
  try {
    const url = new URL(rawTarget);
    const hostname = url.hostname.toLowerCase();
    const mode = localHostnames.has(hostname) || hostname.endsWith(".localhost") || hostname.endsWith(".local")
      ? "local"
      : "hosted";
    return {
      ok: true,
      mode,
      baseUrl: url.origin + url.pathname.replace(/\/$/, ""),
      url
    };
  } catch {
    blockers.push("PUBLIC_FAMILY_BASE_URL must be a valid absolute URL.");
    return {
      ok: false,
      mode: "invalid",
      baseUrl: "",
      url: null
    };
  }
}

export function buildPublicFamilyProofPlan({
  baseUrl = process.env.PUBLIC_FAMILY_BASE_URL,
  expectedOrganizationId = process.env.PUBLIC_ORGANIZATION_ID,
  expectedReviewWindow = process.env.PUBLIC_ACCESS_REVIEW_WINDOW
} = {}) {
  const blockers = [];
  const target = parsePublicFamilyTarget(baseUrl, blockers);
  const organizationId = trimmed(expectedOrganizationId);
  const reviewWindow = normalizeProofText(expectedReviewWindow);
  const expectedOrganizationFingerprint = createPublicOrganizationFingerprint(organizationId);

  if (target.mode === "hosted") {
    if (!organizationId) {
      blockers.push("PUBLIC_ORGANIZATION_ID is required for hosted public-family proof.");
    } else if (!isValidPublicOrganizationId(organizationId)) {
      blockers.push("PUBLIC_ORGANIZATION_ID must be the expected hosted organization UUID.");
    }

    if (!reviewWindow) {
      blockers.push("PUBLIC_ACCESS_REVIEW_WINDOW is required for hosted public-family proof.");
    } else if (reviewWindow.length < 6 || reviewWindow.length > 120) {
      blockers.push("PUBLIC_ACCESS_REVIEW_WINDOW must be a human-readable review window between 6 and 120 characters.");
    }
  }

  return {
    ok: blockers.length === 0,
    blockers,
    mode: target.mode,
    baseUrl: target.baseUrl,
    expectedOrganizationFingerprint,
    expectedReviewWindow: reviewWindow
  };
}

export function evaluateRenderedPublicFamilyProof(plan, renderedEvidence = {}) {
  const blockers = [...(plan.blockers ?? [])];
  const checks = {
    expectedOrganizationFingerprint: plan.expectedOrganizationFingerprint || null,
    renderedOrganizationFingerprint: null,
    organizationFingerprintMatches: false,
    reviewWindowConfigured: false,
    reviewWindowCopyMatches: false
  };

  if (plan.mode !== "hosted") {
    return {
      ok: blockers.length === 0,
      blockers,
      mode: plan.mode,
      checks
    };
  }

  const renderedFingerprint = trimmed(renderedEvidence.publicOrganizationFingerprint);
  const renderedConfigured = renderedEvidence.reviewWindowConfigured === true
    || renderedEvidence.reviewWindowConfigured === "true";
  const renderedCopy = normalizeProofText(renderedEvidence.reviewWindowCopy);
  const expectedCopy = `The usual review target is ${plan.expectedReviewWindow}.`;

  checks.renderedOrganizationFingerprint = renderedFingerprint || null;
  checks.reviewWindowConfigured = renderedConfigured;
  checks.organizationFingerprintMatches = Boolean(
    plan.expectedOrganizationFingerprint
    && renderedFingerprint
    && renderedFingerprint === plan.expectedOrganizationFingerprint
  );
  checks.reviewWindowCopyMatches = Boolean(
    plan.expectedReviewWindow
    && renderedCopy.includes(expectedCopy)
  );

  if (!renderedFingerprint) {
    blockers.push("Rendered registration evidence is missing the public organization fingerprint.");
  } else if (!checks.organizationFingerprintMatches) {
    blockers.push("Rendered public organization fingerprint does not match the expected hosted organization.");
  }

  if (!renderedEvidence || !Object.hasOwn(renderedEvidence, "reviewWindowConfigured")) {
    blockers.push("Rendered registration evidence is missing the review-window configured state.");
  } else if (!renderedConfigured) {
    blockers.push("Rendered registration evidence says the review window was not configured.");
  }

  if (!checks.reviewWindowCopyMatches) {
    blockers.push("Rendered registration review-window copy does not include the expected hosted review window.");
  }

  return {
    ok: blockers.length === 0,
    blockers,
    mode: plan.mode,
    checks
  };
}
