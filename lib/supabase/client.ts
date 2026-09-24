import { createBrowserClient } from "@supabase/ssr";
import { readSupabaseEnv } from "./env";

/**
 * Browser-side Supabase client. Safe to call from Client Components — it
 * uses the public URL + anon key, which are meant to be exposed; every
 * table this app touches is protected by Row Level Security, so the anon
 * key alone never grants access to another user's rows.
 */
export function createClient() {
  const { url, key } = readSupabaseEnv();
  return createBrowserClient(
    url,
    key
  );
}
