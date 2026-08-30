import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client. Safe to call from Client Components — it
 * uses the public URL + anon key, which are meant to be exposed; every
 * table this app touches is protected by Row Level Security, so the anon
 * key alone never grants access to another user's rows.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
