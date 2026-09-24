import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { readSupabaseEnv } from "./env";

/**
 * Server-side Supabase client for use in Server Components, Route
 * Handlers and Server Actions. Reads/writes the auth session via cookies
 * so a signed-in user stays signed in across server-rendered navigations.
 *
 * `cookies()` is async as of Next.js 15+, and @supabase/ssr's current
 * cookie contract is the batched getAll/setAll shape (not the older
 * get/set/remove trio) — this file follows both.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = readSupabaseEnv();

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — the proxy (formerly
            // "middleware") refreshes the session instead, so this can be
            // safely ignored.
          }
        },
      },
    }
  );
}
