"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "./types";

const scale = z
  .string()
  .optional()
  .transform((v) => (v ? Number(v) : null))
  .refine((n) => n === null || (Number.isInteger(n) && n >= 1 && n <= 5), "Usa una escala de 1 a 5.");

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  energy: scale,
  focus: scale,
  progress: z.enum(["si", "parcial", "no"]).optional(),
  note: z.string().trim().max(1000).optional(),
});

/**
 * Registro diario (SER + cierre del día): energía, enfoque y la pregunta
 * "¿lo que hice hoy produjo progreso?". Vive en `reviews` (type 'diaria'),
 * una fila por día; guardar de nuevo actualiza la del día.
 */
export async function saveDailyCheckin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const parsed = schema.safeParse({
    date: formData.get("date"),
    energy: formData.get("energy") || undefined,
    focus: formData.get("focus") || undefined,
    progress: formData.get("progress") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const content = { v: 1, energy: d.energy, focus: d.focus, progress: d.progress ?? null, note: d.note || null };

  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("type", "diaria")
    .eq("period_start", d.date)
    .limit(1)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from("reviews").update({ content }).eq("id", existing.id)
    : await supabase.from("reviews").insert({ type: "diaria", period_start: d.date, period_end: d.date, content });
  if (error) return { ok: false, error: "No pudimos guardar el registro del día." };

  revalidatePath("/dashboard/today");
  revalidatePath("/dashboard/reviews");
  return { ok: true };
}
