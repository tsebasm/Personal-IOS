import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts` and
// the exported function from `middleware` to `proxy` (same job: intercept
// every matched request before it reaches a route). See
// https://nextjs.org/docs/messages/middleware-to-proxy
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and Next internals,
     * so every real page goes through the auth gate.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
