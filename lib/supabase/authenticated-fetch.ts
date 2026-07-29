import { createSupabaseBrowserClient } from "./browser";

export async function authenticatedJsonPost(
  url: string,
  payload: unknown,
  extraHeaders?: Record<string, string>
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders
  };

  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      headers.authorization = `Bearer ${data.session.access_token}`;
    }
  } catch {
    // Private routes return an explicit session error when auth is unavailable.
  }

  return fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
}
