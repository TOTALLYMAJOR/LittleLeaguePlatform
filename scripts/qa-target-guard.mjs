const HOSTED_QA_CONFIRMATION = "seed-isolated-qa-target";
const PROTECTED_PRODUCTION_PROJECT_REF = "dkwghvvlbdnnwzbnscvu";

function projectRefFromApiUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid URL.");
  }

  if (["127.0.0.1", "localhost", "::1"].includes(parsed.hostname)) {
    return { kind: "local", projectRef: null };
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Hosted QA Supabase targets must use HTTPS.");
  }

  const projectRef = parsed.hostname.match(/^([a-z0-9-]+)\.supabase\.co$/)?.[1];
  if (!projectRef) {
    throw new Error("Hosted QA must use an explicit Supabase project URL.");
  }

  return { kind: "hosted", projectRef };
}

export function assertIsolatedQaTarget(url, action = "QA mutation") {
  const target = projectRefFromApiUrl(url);
  if (target.kind === "local") return target;

  const expectedRef = process.env.SUPABASE_QA_TARGET_REF?.trim();
  const parentRef = process.env.SUPABASE_QA_PARENT_PROJECT_REF?.trim();
  if (target.projectRef === PROTECTED_PRODUCTION_PROJECT_REF) {
    throw new Error("QA mutations are forbidden on the protected LeaguePilot production project.");
  }
  if (!expectedRef || expectedRef !== target.projectRef) {
    throw new Error(
      "SUPABASE_QA_TARGET_REF must match the explicitly selected hosted QA project."
    );
  }
  if (parentRef !== PROTECTED_PRODUCTION_PROJECT_REF || parentRef === expectedRef) {
    throw new Error(
      "SUPABASE_QA_PARENT_PROJECT_REF must identify the protected LeaguePilot parent and differ from the hosted QA target."
    );
  }
  if (process.env.SUPABASE_QA_TARGET_CONFIRM !== HOSTED_QA_CONFIRMATION) {
    throw new Error(
      `${action} requires SUPABASE_QA_TARGET_CONFIRM=${HOSTED_QA_CONFIRMATION}.`
    );
  }

  return target;
}

export function assertServiceRoleCredential(value) {
  if (value.startsWith("sb_publishable_")) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY cannot be a publishable key.");
  }

  const segments = value.split(".");
  if (segments.length !== 3) return;

  try {
    const role = JSON.parse(Buffer.from(segments[1], "base64url").toString()).role;
    if (role !== "service_role") {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY must carry the service_role claim.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("service_role claim")) throw error;
    throw new Error("SUPABASE_SERVICE_ROLE_KEY contains an invalid JWT.");
  }
}
