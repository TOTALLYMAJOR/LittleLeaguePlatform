import { existsSync, readFileSync } from "node:fs";

const envFiles = [".env.local", ".env"];
const defaultRedirectUrls = [
  "https://www.leaguepilot.us/auth/callback",
  "https://leaguepilot.us/auth/callback",
  "http://localhost:3000/auth/callback",
  "http://127.0.0.1:3000/auth/callback"
];

function parseEnvLine(line) {
  if (!line || line.trim().startsWith("#")) return null;
  const separator = line.indexOf("=");
  if (separator === -1) return null;
  return [
    line.slice(0, separator).trim(),
    line.slice(separator + 1).trim().replace(/^"|"$/g, "")
  ];
}

function loadLocalEnv() {
  for (const file of envFiles) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const entry = parseEnvLine(line);
      if (!entry) continue;
      const [key, value] = entry;
      if (key && !(key in process.env)) process.env[key] = value;
    }
  }
}

function env(name) {
  const value = process.env[name]?.trim();
  return value && !value.includes("[YOUR-") ? value : "";
}

function projectRefFromEnv() {
  if (env("SUPABASE_PROJECT_REF")) return env("SUPABASE_PROJECT_REF");
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  if (!url) return "";
  try {
    return new URL(url).hostname.split(".")[0] ?? "";
  } catch {
    return "";
  }
}

function splitUriAllowList(value) {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(values) {
  return Array.from(new Set(values));
}

function redactedStatus(name, value) {
  return `${name}: ${value ? "set" : "missing"}`;
}

function providerPayload() {
  const googleClientId = env("GOOGLE_CLIENT_ID");
  const googleSecret = env("GOOGLE_CLIENT_SECRET");
  const facebookClientId = env("FACEBOOK_CLIENT_ID") || env("FACEBOOK_APP_ID");
  const facebookSecret = env("FACEBOOK_CLIENT_SECRET") || env("FACEBOOK_APP_SECRET");

  return {
    googleClientId,
    googleSecret,
    facebookClientId,
    facebookSecret,
    body: {
      external_google_enabled: true,
      external_google_client_id: googleClientId,
      external_google_secret: googleSecret,
      external_facebook_enabled: true,
      external_facebook_client_id: facebookClientId,
      external_facebook_secret: facebookSecret
    }
  };
}

async function managementRequest(path, options = {}) {
  const token = env("SUPABASE_ACCESS_TOKEN") || env("SUPABASE_MANAGEMENT_TOKEN");
  const response = await fetch(`https://api.supabase.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`Supabase Management API ${options.method ?? "GET"} ${path} failed with ${response.status}: ${body?.message ?? body?.error ?? "unknown error"}`);
  }
  return body;
}

function assertRequired({ projectRef, managementToken, googleClientId, googleSecret, facebookClientId, facebookSecret }) {
  const missing = [];
  if (!projectRef) missing.push("SUPABASE_PROJECT_REF or NEXT_PUBLIC_SUPABASE_URL");
  if (!managementToken) missing.push("SUPABASE_ACCESS_TOKEN or SUPABASE_MANAGEMENT_TOKEN");
  if (!googleClientId) missing.push("GOOGLE_CLIENT_ID");
  if (!googleSecret) missing.push("GOOGLE_CLIENT_SECRET");
  if (!facebookClientId) missing.push("FACEBOOK_CLIENT_ID or FACEBOOK_APP_ID");
  if (!facebookSecret) missing.push("FACEBOOK_CLIENT_SECRET or FACEBOOK_APP_SECRET");
  return missing;
}

async function main() {
  loadLocalEnv();
  const apply = process.argv.includes("--apply");
  const projectRef = projectRefFromEnv();
  const managementToken = env("SUPABASE_ACCESS_TOKEN") || env("SUPABASE_MANAGEMENT_TOKEN");
  const provider = providerPayload();
  const extraRedirects = splitUriAllowList(env("OAUTH_REDIRECT_URLS"));
  const required = {
    projectRef,
    managementToken,
    googleClientId: provider.googleClientId,
    googleSecret: provider.googleSecret,
    facebookClientId: provider.facebookClientId,
    facebookSecret: provider.facebookSecret
  };
  const missing = assertRequired(required);

  console.log("Supabase OAuth configuration target");
  console.log(`Project ref: ${projectRef || "missing"}`);
  console.log(redactedStatus("Management token", managementToken));
  console.log(redactedStatus("Google client ID", provider.googleClientId));
  console.log(redactedStatus("Google client secret", provider.googleSecret));
  console.log(redactedStatus("Facebook client ID/app ID", provider.facebookClientId));
  console.log(redactedStatus("Facebook client secret/app secret", provider.facebookSecret));
  console.log(`Default app redirect URLs: ${defaultRedirectUrls.join(", ")}`);
  if (extraRedirects.length) console.log(`Extra redirect URLs: ${extraRedirects.join(", ")}`);

  if (missing.length) {
    console.error(`Missing required configuration: ${missing.join(", ")}`);
    process.exit(1);
  }

  if (!apply) {
    console.log("Dry run only. Re-run with --apply to merge redirect URLs and enable Google/Facebook providers.");
    return;
  }

  const current = await managementRequest(`/v1/projects/${projectRef}/config/auth`);
  const redirectUrls = unique([
    ...splitUriAllowList(String(current.uri_allow_list ?? "")),
    ...defaultRedirectUrls,
    ...extraRedirects
  ]);
  const body = {
    ...provider.body,
    uri_allow_list: redirectUrls.join(",")
  };

  await managementRequest(`/v1/projects/${projectRef}/config/auth`, {
    method: "PATCH",
    body: JSON.stringify(body)
  });

  console.log("Supabase Google and Facebook OAuth providers enabled.");
  console.log(`Redirect allow list now includes: ${redirectUrls.join(", ")}`);
  console.log(`Provider callback URL for Google/Facebook developer consoles: https://${projectRef}.supabase.co/auth/v1/callback`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
