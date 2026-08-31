import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Elementos estructurales (áreas, metas, hábitos) solo se editan/eliminan en
 * modo configuración — protege contra modificación accidental en el uso
 * diario. Se revalida server-side porque el toggle de modo es una
 * salvaguarda de UX, no un control de acceso entre usuarios (eso ya lo
 * cubre RLS), pero igual debe respetarse aunque la UI quede desincronizada.
 */
export async function isConfigMode(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase.from("profiles").select("system_mode").eq("id", userId).maybeSingle();
  return data?.system_mode === "config";
}
