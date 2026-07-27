const ENABLED_VALUE = "enabled";
const ALLOWED_DEPLOYMENT_CLASSES = new Set([
  "development",
  "local",
  "preview",
  "production",
  "qa",
  "test"
]);

function publicSupabaseProjectRef(): string | null {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) return null;
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    if (["127.0.0.1", "localhost", "::1"].includes(hostname)) return null;
    return hostname.match(/^([a-z0-9-]+)\.supabase\.co$/)?.[1] ?? null;
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

export async function GET() {
  if (process.env.QA_TARGET_IDENTITY_ENABLED !== ENABLED_VALUE) {
    return Response.json(
      { ok: false },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  const configuredDeploymentClass = deploymentClass();
  const supabaseProjectRef = publicSupabaseProjectRef();
  if (!configuredDeploymentClass) {
    return Response.json(
      { ok: false },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  return Response.json(
    {
      deploymentClass: configuredDeploymentClass,
      supabaseProjectRef
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
