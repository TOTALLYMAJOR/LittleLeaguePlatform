const HOSTED_QA_CONFIRMATION = "seed-isolated-qa-target";
const HOSTED_APP_MUTATION_CONFIRMATION = "mutate-isolated-qa-app";
const PROTECTED_PRODUCTION_PROJECT_REF = "dkwghvvlbdnnwzbnscvu";
const PROTECTED_PRODUCTION_HOSTS = new Set(["leaguepilot.us", "www.leaguepilot.us"]);
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const ALLOWED_QA_DEPLOYMENT_CLASSES = new Set(["development", "local", "preview", "qa", "test"]);
const DEFAULT_PREFLIGHT_TIMEOUT_MS = 10_000;

function parseUrl(value, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid URL.`);
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error(`${label} must not contain credentials, a query, or a fragment.`);
  }
  return parsed;
}

function isLoopback(hostname) {
  return LOOPBACK_HOSTS.has(hostname.toLowerCase());
}

function projectRefFromApiUrl(value) {
  const parsed = parseUrl(value, "NEXT_PUBLIC_SUPABASE_URL");
  if (parsed.pathname !== "/" && parsed.pathname !== "") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must not contain a path.");
  }

  if (isLoopback(parsed.hostname)) {
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Local QA Supabase targets must use HTTP or HTTPS.");
    }
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

function normalizedBaseUrl(value) {
  const parsed = parseUrl(value, "QA application base URL");
  if (parsed.pathname !== "/" && parsed.pathname !== "") {
    throw new Error("QA application base URL must not contain a path.");
  }
  parsed.pathname = "/";
  return parsed.toString().replace(/\/$/, "");
}

function timeoutSignal(timeoutMs) {
  return AbortSignal.timeout(timeoutMs);
}

function safeFetchError(error, subject) {
  if (error instanceof Error && error.name === "TimeoutError") {
    return new Error(`${subject} timed out.`);
  }
  return new Error(`${subject} was unreachable.`);
}

export function captureQaAppInvocation() {
  return Object.freeze({
    targetUrl: process.env.QA_APP_TARGET_URL?.trim() || "",
    mutationConfirm: process.env.QA_APP_MUTATION_CONFIRM?.trim() || ""
  });
}

export function assertIsolatedQaTarget(url, action = "QA mutation") {
  const target = projectRefFromApiUrl(url);
  const expectedRef = process.env.SUPABASE_QA_TARGET_REF?.trim();
  const parentRef = process.env.SUPABASE_QA_PARENT_PROJECT_REF?.trim();

  if (target.projectRef === PROTECTED_PRODUCTION_PROJECT_REF) {
    throw new Error("QA mutations are forbidden on the protected LeaguePilot production project.");
  }
  if (target.kind === "local") return target;

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

export function assertQaApplicationTarget(baseUrl, invocation = captureQaAppInvocation()) {
  const normalized = normalizedBaseUrl(baseUrl);
  const parsed = new URL(normalized);
  const hostname = parsed.hostname.toLowerCase();

  if (PROTECTED_PRODUCTION_HOSTS.has(hostname)) {
    throw new Error("QA application mutations are forbidden on the canonical LeaguePilot production host.");
  }
  if (isLoopback(hostname)) {
    return { kind: "local", baseUrl: normalized };
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Hosted QA application targets must use HTTPS.");
  }
  if (!invocation.targetUrl || normalizedBaseUrl(invocation.targetUrl) !== normalized) {
    throw new Error("QA_APP_TARGET_URL must exactly match the hosted application URL in this invocation.");
  }
  if (invocation.mutationConfirm !== HOSTED_APP_MUTATION_CONFIRMATION) {
    throw new Error(
      `Hosted application mutation requires QA_APP_MUTATION_CONFIRM=${HOSTED_APP_MUTATION_CONFIRMATION}.`
    );
  }

  return { kind: "hosted", baseUrl: normalized };
}

export function assertServiceRoleCredential(value) {
  if (!value || typeof value !== "string") {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required.");
  }
  if (value.startsWith("sb_publishable_")) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY cannot be a publishable key.");
  }
  if (value.startsWith("sb_secret_")) return;

  const segments = value.split(".");
  if (segments.length !== 3) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY must be a service-role JWT or Supabase secret key.");
  }

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

export async function preflightServiceRoleCredential(
  supabaseUrl,
  credential,
  { fetchImpl = fetch, timeoutMs = DEFAULT_PREFLIGHT_TIMEOUT_MS } = {}
) {
  assertServiceRoleCredential(credential);
  const target = assertIsolatedQaTarget(supabaseUrl, "Service-role preflight");
  const endpoint = new URL("/auth/v1/admin/users?page=1&per_page=1", supabaseUrl);
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: "GET",
      headers: {
        apikey: credential,
        Authorization: `Bearer ${credential}`
      },
      cache: "no-store",
      redirect: "error",
      signal: timeoutSignal(timeoutMs)
    });
  } catch (error) {
    throw safeFetchError(error, "Supabase service-role preflight");
  }
  if (!response.ok) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY was not accepted by the guarded Supabase project.");
  }
  if (response.redirected || (response.url && new URL(response.url).origin !== endpoint.origin)) {
    throw new Error("Supabase service-role preflight crossed the guarded project origin.");
  }
  return target;
}

export async function preflightQaApplicationIdentity(
  baseUrl,
  supabaseTarget,
  {
    invocation = captureQaAppInvocation(),
    fetchImpl = fetch,
    timeoutMs = DEFAULT_PREFLIGHT_TIMEOUT_MS
  } = {}
) {
  const appTarget = assertQaApplicationTarget(baseUrl, invocation);
  const endpoint = new URL("/api/qa-target-identity", `${appTarget.baseUrl}/`);
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: timeoutSignal(timeoutMs)
    });
  } catch (error) {
    throw safeFetchError(error, "QA target identity route");
  }
  if (!response.ok) {
    throw new Error("QA target identity route is disabled or returned a non-success response.");
  }
  if (
    response.redirected ||
    (response.url && new URL(response.url).origin !== endpoint.origin)
  ) {
    throw new Error("QA target identity route redirected across origins.");
  }

  let identity;
  try {
    identity = await response.json();
  } catch {
    throw new Error("QA target identity route returned malformed JSON.");
  }
  const keys =
    identity && typeof identity === "object" && !Array.isArray(identity)
      ? Object.keys(identity).sort()
      : [];
  if (
    keys.join(",") !== "deploymentClass,supabaseProjectRef" ||
    typeof identity.deploymentClass !== "string" ||
    !(typeof identity.supabaseProjectRef === "string" || identity.supabaseProjectRef === null)
  ) {
    throw new Error("QA target identity route returned a malformed identity.");
  }
  if (
    !ALLOWED_QA_DEPLOYMENT_CLASSES.has(identity.deploymentClass) ||
    identity.deploymentClass === "production"
  ) {
    throw new Error("QA target identity route identified a production deployment.");
  }
  if (identity.supabaseProjectRef !== supabaseTarget.projectRef) {
    throw new Error("QA application and Supabase target project refs do not match.");
  }

  return { appTarget, identity };
}
