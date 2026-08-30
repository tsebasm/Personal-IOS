import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Exchanges the code Supabase appends to confirmation / magic-link emails
 * for a real session. Not exercised by plain password sign-in, but is
 * needed the moment email confirmation or a magic link is turned on in
 * the Supabase project's Auth settings — wiring it now avoids a second
 * pass later.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
