"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isoDateInTimezone } from "@/lib/date";
import type { ActionState } from "./types";

const schema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(120),
  start_date: z.string().optional(),
  status: z.enum(["activo", "pausado", "cancelado"]),
  setup_fee: z.string().optional(),
  commission_type: z.enum(["porcentaje", "fijo"]),
  commission_value: z.string().optional(),
  monthly_fee: z.string().optional(),
  additional_commission: z.string().optional(),
  ad_spend: z.string().optional(),
  status_changed_on: z.string().optional(),
});

function toNonNegativeNumber(value: string | undefined, fallback = 0): number {
  const n = value ? Number(value) : fallback;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Cuando la comisión es un porcentaje, tiene que caer entre 0 y 100 (no aplica al modo "fijo", que es un monto). */
function normalizeCommissionValue(commissionType: string, value: number): number {
  return commissionType === "porcentaje" ? Math.min(100, value) : value;
}

function readForm(formData: FormData) {
  return schema.safeParse({
    name: formData.get("name"),
    start_date: formData.get("start_date") || undefined,
    status: formData.get("status"),
    setup_fee: formData.get("setup_fee") || undefined,
    commission_type: formData.get("commission_type"),
    commission_value: formData.get("commission_value") || undefined,
    monthly_fee: formData.get("monthly_fee") || undefined,
    additional_commission: formData.get("additional_commission") || undefined,
    ad_spend: formData.get("ad_spend") || undefined,
    status_changed_on: formData.get("status_changed_on") || undefined,
  });
}

/**
 * paused_at/cancelled_at según el estado: la facturación recurrente se corta
 * en esa fecha (lib/agencia/billing.ts). Volver a 'activo' limpia ambas.
 */
async function statusDates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  status: string,
  changedOn: string | undefined
): Promise<{ paused_at: string | null; cancelled_at: string | null }> {
  if (status === "activo") return { paused_at: null, cancelled_at: null };
  let date = changedOn;
  if (!date) {
    const { data } = await supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle();
    date = isoDateInTimezone(data?.timezone ?? "America/Bogota");
  }
  return status === "pausado" ? { paused_at: date, cancelled_at: null } : { paused_at: null, cancelled_at: date };
}

export async function createVantClient(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const parsed = readForm(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const { error } = await supabase.from("vant_clients").insert({
    name: d.name,
    start_date: d.start_date || undefined,
    status: d.status,
    setup_fee: toNonNegativeNumber(d.setup_fee),
    commission_type: d.commission_type,
    commission_value: normalizeCommissionValue(d.commission_type, toNonNegativeNumber(d.commission_value)),
    monthly_fee: toNonNegativeNumber(d.monthly_fee),
    additional_commission: toNonNegativeNumber(d.additional_commission),
    ad_spend: toNonNegativeNumber(d.ad_spend),
    ...(await statusDates(supabase, user.id, d.status, d.status_changed_on)),
  });
  if (error) return { ok: false, error: "No pudimos crear el cliente." };

  revalidatePath("/dashboard/agencia/clients");
  revalidatePath("/dashboard/agencia");
  return { ok: true };
}

export async function updateVantClient(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { ok: false, error: "Cliente inválido." };

  const parsed = readForm(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const { error } = await supabase
    .from("vant_clients")
    .update({
      name: d.name,
      start_date: d.start_date || undefined,
      status: d.status,
      setup_fee: toNonNegativeNumber(d.setup_fee),
      commission_type: d.commission_type,
      commission_value: normalizeCommissionValue(d.commission_type, toNonNegativeNumber(d.commission_value)),
      monthly_fee: toNonNegativeNumber(d.monthly_fee),
      additional_commission: toNonNegativeNumber(d.additional_commission),
      ad_spend: toNonNegativeNumber(d.ad_spend),
      ...(await statusDates(supabase, user.id, d.status, d.status_changed_on)),
    })
    .eq("id", id);
  if (error) return { ok: false, error: "No pudimos actualizar el cliente." };

  revalidatePath("/dashboard/agencia/clients");
  revalidatePath("/dashboard/agencia");
  return { ok: true };
}

export async function deleteVantClient(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const { error } = await supabase.from("vant_clients").delete().eq("id", id);
  if (error) return { ok: false, error: "No pudimos eliminar el cliente." };

  revalidatePath("/dashboard/agencia/clients");
  revalidatePath("/dashboard/agencia");
  return { ok: true };
}
