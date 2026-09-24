"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "./types";

/** Vacío = "no sé" (null), nunca 0: un 0 se trataría como dato. */
const optional = (min: number, max: number, message: string) =>
  z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((n) => n === null || (Number.isFinite(n) && n >= min && n <= max), message);

const assumptionsSchema = z.object({
  reply_rate: optional(0.01, 100, "La tasa de respuesta debe estar entre 0,01% y 100%."),
  booking_rate: optional(0.01, 100, "La tasa de agendamiento debe estar entre 0,01% y 100%."),
  show_rate: optional(0.01, 100, "La tasa de asistencia debe estar entre 0,01% y 100%."),
  close_rate: optional(0.01, 100, "La tasa de cierre debe estar entre 0,01% y 100%."),
  sales_cycle_days: optional(0, 365, "El ciclo de venta debe estar entre 0 y 365 días."),
  minutes_per_contact: optional(0, 240, "Los minutos por contacto deben estar entre 0 y 240."),
  outreach_days_per_week: optional(1, 7, "Los días de prospección por semana van de 1 a 7."),
  setup_fee: optional(0, 1e12, "Setup inválido."),
  monthly_fee: optional(0, 1e12, "Fee mensual inválido."),
  source: z.string().trim().max(500).optional(),
});

const pipelineSchema = z.object({
  replied: z.coerce.number().int().min(0).max(100000),
  booked: z.coerce.number().int().min(0).max(100000),
  showed: z.coerce.number().int().min(0).max(100000),
  as_of: z.string().min(1, "La fecha de corte es obligatoria."),
});

async function saveSettings(patch: Record<string, unknown>): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const { error } = await supabase.from("agencia_settings").upsert({ user_id: user.id, ...patch }, { onConflict: "user_id" });
  if (error) return { ok: false, error: "No pudimos guardar el plan." };

  revalidatePath("/dashboard/plan");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Supuestos del embudo (ESTIMACIONES). No exige modo configuración: cambian
 * a medida que se aprende, igual que registrar una sesión.
 */
export async function saveFunnelAssumptions(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const field = (k: string) => (formData.get(k) as string | null) || undefined;
  const parsed = assumptionsSchema.safeParse({
    reply_rate: field("reply_rate"),
    booking_rate: field("booking_rate"),
    show_rate: field("show_rate"),
    close_rate: field("close_rate"),
    sales_cycle_days: field("sales_cycle_days"),
    minutes_per_contact: field("minutes_per_contact"),
    outreach_days_per_week: field("outreach_days_per_week"),
    setup_fee: field("setup_fee"),
    monthly_fee: field("monthly_fee"),
    source: field("source"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  return saveSettings({
    funnel_assumptions: { ...parsed.data, source: parsed.data.source || null, updated_at: new Date().toISOString() },
  });
}

/** Foto del pipeline abierto (DATO manual) hasta que exista la tabla `leads`. */
export async function savePipelineSnapshot(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = pipelineSchema.safeParse({
    replied: formData.get("replied") || 0,
    booked: formData.get("booked") || 0,
    showed: formData.get("showed") || 0,
    as_of: formData.get("as_of"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  return saveSettings({ pipeline_snapshot: parsed.data });
}
