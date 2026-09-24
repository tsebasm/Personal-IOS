/**
 * Credenciales públicas de Supabase, leídas en un solo lugar.
 *
 * Acepta también los nombres que crea la integración Vercel ↔ Supabase
 * (SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_ANON_KEY)
 * para que un proyecto de Vercel conectado por integración funcione sin
 * renombrar variables. En el navegador solo existen las NEXT_PUBLIC_*
 * (Next las incrusta en el build), así que esas van primero.
 */
export type SupabaseEnv = { url: string; key: string };

export class MissingSupabaseEnvError extends Error {
  constructor(public missing: string[]) {
    super(
      `Faltan variables de entorno de Supabase: ${missing.join(", ")}. ` +
        "Configúralas en .env.local (local) o en Vercel → Project → Settings → Environment Variables, y vuelve a desplegar."
    );
    this.name = "MissingSupabaseEnvError";
  }
}

export function readSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;
  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!key) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (missing.length > 0) throw new MissingSupabaseEnvError(missing);
  return { url: url!, key: key! };
}
