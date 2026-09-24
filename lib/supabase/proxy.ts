import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { readSupabaseEnv, type SupabaseEnv } from "./env";

const PUBLIC_PATHS = ["/login", "/signup", "/auth"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/**
 * Refreshes the Supabase session on every request and gates every route
 * except the auth pages themselves. This is the whole of "Auth" for Fase
 * 1: no route under the app shell renders for a signed-out visitor.
 *
 * Named `updateSession` (not `proxy`) because it's a helper called from
 * the root `proxy.ts` — the actual Next.js 16 file-convention entry point
 * (renamed from `middleware.ts`/`middleware()` to `proxy.ts`/`proxy()`).
 */
export async function updateSession(request: NextRequest) {
  let env: SupabaseEnv;
  try {
    env = readSupabaseEnv();
  } catch (err) {
    // Sin esto, un despliegue sin variables devuelve un "Internal Server
    // Error" opaco en TODAS las rutas (el proxy corre antes que cualquier página).
    console.error(err);
    return new NextResponse(err instanceof Error ? err.message : "Configuración de Supabase incompleta.", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  const { url, key } = env;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Si Supabase no responde (proyecto pausado, red), se trata como sesión
  // ausente: el usuario llega al login en vez de a un 500.
  let user: User | null = null;
  try {
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch (err) {
    console.error("Supabase auth.getUser falló en el proxy:", err);
  }

  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
