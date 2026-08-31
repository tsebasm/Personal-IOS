import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type CurrentProfile = {
  userId: string;
  email: string | null;
  fullName: string | null;
  timezone: string;
  theme: "system" | "light" | "dark";
  mode: "normal" | "config";
};

/**
 * Cached per-request: both the root layout (theme, before first paint) and
 * the dashboard layout (sidebar profile block) need this same row — cache()
 * dedupes the query across both instead of hitting Supabase twice.
 */
export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, timezone, theme, system_mode")
    .eq("id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? null,
    timezone: profile?.timezone ?? "America/Bogota",
    theme: (profile?.theme as CurrentProfile["theme"]) ?? "system",
    mode: (profile?.system_mode as CurrentProfile["mode"]) ?? "normal",
  };
});
