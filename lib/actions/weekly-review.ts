"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loadAnalytics } from "@/lib/data/analytics";
import { loadPlanContext } from "@/lib/data/plan";
import type { ActionState } from "./types";

const schema = z.object({
  analysis: z.string().trim().max(4000).optional(),
  adjustments: z.string().trim().min(1, "Escribe al menos un ajuste (o 'mantener el plan').").max(4000),
});

/**
 * Cierra la semana en curso: guarda un snapshot inmutable (plan, real,
 * varianza, tasas, cuello de botella) + el análisis y los ajustes del
 * usuario en `reviews` (type 'semanal'). Volver a cerrarla actualiza la misma fila.
 */
export async function closeWeek(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const parsed = schema.safeParse({
    analysis: formData.get("analysis") || undefined,
    adjustments: formData.get("adjustments"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const [analytics, planCtx] = await Promise.all([loadAnalytics(), loadPlanContext()]);
  if (!analytics || !planCtx) return { ok: false, error: "No pudimos calcular la semana." };
  const r = analytics.current;
  const b = planCtx.bottleneck.top;

  const content = {
    v: 1,
    snapshot: {
      plan: r.plan,
      actual: r.actual,
      variance: r.variance,
      rates: r.rates,
      previousRates: r.previousRates,
      efficiency: r.efficiency,
      execution: r.execution,
      observations: r.observations,
      bottleneck: b ? { kind: b.kind, observation: b.observation, hypotheses: b.hypotheses, action: b.action } : null,
      missingData: planCtx.bottleneck.missingData,
    },
    analysis: parsed.data.analysis ?? null,
    adjustments: parsed.data.adjustments,
  };

  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("type", "semanal")
    .eq("period_start", r.start)
    .limit(1)
    .maybeSingle();
  const { error } = existing
    ? await supabase.from("reviews").update({ content, period_end: r.end }).eq("id", existing.id)
    : await supabase.from("reviews").insert({ type: "semanal", period_start: r.start, period_end: r.end, content });
  if (error) return { ok: false, error: "No pudimos guardar la revisión semanal." };

  revalidatePath("/dashboard/reviews");
  revalidatePath("/dashboard/insights");
  return { ok: true };
}
