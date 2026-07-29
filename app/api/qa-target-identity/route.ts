const ENABLED_VALUE = "enabled";
const PROTECTED_PRODUCTION_PROJECT_REF = "dkwghvvlbdnnwzbnscvu";
const PROTECTED_PRODUCTION_HOSTS = new Set(["leaguepilot.us", "www.leaguepilot.us"]);
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const ALLOWED_DEPLOYMENT_CLASSES = new Set([
  "development",
  "local",
  "preview",
  "qa",
  "test"
]);

type PublicSupabaseIdentity = {
  projectRef: string | null;
  targetId: string;
};

function normalizedHostname(hostname: string): string {
  const withoutTrailingDots = hostname.toLowerCase().replace(/\.+$/, "");
  if (withoutTrailingDots.startsWith("[") && withoutTrailingDots.endsWith("]")) {
    return withoutTrailingDots.slice(1, -1);
  }
  return withoutTrailingDots;
}

function isLoopback(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(normalizedHostname(hostname));
}

function publicSupabaseIdentity(): PublicSupabaseIdentity | null {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      (parsed.pathname !== "/" && parsed.pathname !== "")
    ) {
      return null;
    }

    if (isLoopback(parsed.hostname)) {
      if (!["http:", "https:"].includes(parsed.protocol) || !parsed.port) return null;
      return {
        projectRef: null,
        targetId: `local:${parsed.origin.toLowerCase()}`
      };
    }

    if (parsed.protocol !== "https:") return null;
    const projectRef = normalizedHostname(parsed.hostname).match(
      /^([a-z0-9-]+)\.supabase\.co$/
    )?.[1];
    if (!projectRef) return null;
    return {
      projectRef,
      targetId: `project:${projectRef}`
    };
  } catch {
    return null;
  }
}

function deploymentClass(): string | null {
  const value = (
    process.env.QA_TARGET_DEPLOYMENT_CLASS ||
    process.env.VERCEL_ENV ||
    (process.env.NODE_ENV === "development" ? "development" : "")
  ).trim().toLowerCase();
  return ALLOWED_DEPLOYMENT_CLASSES.has(value) ? value : null;
}

function hasProductionDeploymentSignal(): boolean {
  return [
    process.env.QA_TARGET_DEPLOYMENT_CLASS,
    process.env.VERCEL_ENV,
    process.env.VERCEL_TARGET_ENV
  ].some((value) => value?.trim().toLowerCase() === "production");
}

function requestTargetsProtectedHost(request?: Request): boolean {
  if (!request) return false;
  const candidates = [
    new URL(request.url).hostname,
    request.headers.get("host"),
    request.headers.get("x-forwarded-host"),
    request.headers.get("x-vercel-forwarded-host")
  ];

  return candidates.some((candidate) => {
    if (!candidate) return false;
    for (const entry of candidate.split(",")) {
      try {
        const hostname = new URL(`https://${entry.trim()}`).hostname;
        if (PROTECTED_PRODUCTION_HOSTS.has(normalizedHostname(hostname))) return true;
      } catch {
        return true;
      }
    }
    return false;
  });
}

function unavailable(status: 403 | 503) {
  return Response.json(
    { ok: false },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(request?: Request) {
  if (process.env.QA_TARGET_IDENTITY_ENABLED !== ENABLED_VALUE) {
    return Response.json(
      { ok: false },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  const configuredDeploymentClass = deploymentClass();
  const supabaseIdentity = publicSupabaseIdentity();
  if (
    hasProductionDeploymentSignal() ||
    requestTargetsProtectedHost(request) ||
    supabaseIdentity?.projectRef === PROTECTED_PRODUCTION_PROJECT_REF
  ) {
    return unavailable(403);
  }
  if (!configuredDeploymentClass || !supabaseIdentity) {
    return unavailable(503);
  }

  return Response.json(
    {
      deploymentClass: configuredDeploymentClass,
      supabaseProjectRef: supabaseIdentity.projectRef,
      supabaseTargetId: supabaseIdentity.targetId
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
