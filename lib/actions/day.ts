"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { isoDateInTimezone } from "@/lib/date";
import { loadDayExecution } from "@/lib/data/day";
import { PROVIDERS } from "@/lib/engine/metric-providers";
import type { ActionState } from "./types";

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
const scale = z.coerce.number().int().min(1).max(5).optional();

const schema = z.object({
  mission: z.string().trim().max(300).optional(),
  energy: scale,
  focus: scale,
  notes: z.string().trim().max(2000).optional(),
});

/**
 * Cerrar el día (§35, B4): el snapshot (P0/P1/P2, score, métricas objetivo vs
 * real, minutos trabajados) lo calcula el servidor con los mismos datos que
 * muestra Hoy; el usuario solo agrega lo cualitativo. Queda inmutable.
 */
export async function closeDay(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  const parsed = schema.safeParse({
    mission: formData.get("mission") || undefined,
    energy: formData.get("energy") || undefined,
    focus: formData.get("focus") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const profile = await getCurrentProfile();
  const timezone = profile?.timezone ?? "America/Bogota";
  const today = isoDateInTimezone(timezone);
  const [day, { data: minutesRows }] = await Promise.all([
    loadDayExecution(supabase, today, timezone),
    supabase.from("time_entries").select("minutes").eq("date", today),
  ]);

  // Métricas del día: objetivo (suma de tareas cuantificables) vs real (datos).
  const byMetric = new Map<string, { target: number; actual: number | null }>();
  for (const i of day.items) {
    if (!i.metric_key || i.target_qty === null) continue;
    const cur = byMetric.get(i.metric_key) ?? { target: 0, actual: i.completion.actual };
    byMetric.set(i.metric_key, { target: cur.target + i.target_qty, actual: i.completion.actual });
  }
  const providerOf = (key: string) => PROVIDERS.find((p) => p.keys.includes(key))?.id ?? "manual";
  const metrics = [...byMetric].map(([metric_key, v]) => ({ metric_key, target: v.target, actual: v.actual, source: providerOf(metric_key) }));

  const firstP0 = day.items.find((i) => i.tier === "p0");
  const { error } = await supabase.rpc("close_daily_log", {
    p: {
      date: today,
      mission: parsed.data.mission ?? (firstP0 ? `P0: ${firstP0.title}` : null),
      tiers: day.score.byTier,
      execution_score: day.score.score,
      minutes_worked: (minutesRows ?? []).reduce((s, r) => s + Number(r.minutes), 0),
      energy: parsed.data.energy ?? null,
      focus: parsed.data.focus ?? null,
      problems: lines(formData.get("problems")),
      blockers: lines(formData.get("blockers")),
      learnings: lines(formData.get("learnings")),
      tomorrow: lines(formData.get("tomorrow")),
      notes: parsed.data.notes ?? null,
      metrics,
    },
  });
  if (error) return { ok: false, error: error.message.includes("ya está cerrado") ? "Este día ya está cerrado." : `No se pudo cerrar el día: ${error.message}` };
  revalidatePath("/dashboard/today");
  revalidatePath("/dashboard/reviews");
  return { ok: true };
}
