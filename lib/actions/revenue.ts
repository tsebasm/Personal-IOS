"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { zonedTimeToIso } from "@/lib/date";
import { assertCan } from "@/lib/intelligence/permissions";
import { REVENUE_CONCEPTS } from "@/lib/domain/finance";
import type { ActionState } from "./types";

/**
 * Registro de datos observados (spec §130 C-1): dinero efectivamente recibido y
 * tasas de cambio. Solo el usuario (o una fuente de datos) los registra; Claude
 * nunca (§6). Nada se borra: un pago se corrige revirtiéndolo con motivo.
 */

async function session() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const DUPLICATE = "23505";

function refresh() {
  revalidatePath("/dashboard/ingresos");
  revalidatePath("/dashboard/today");
  revalidatePath("/dashboard/plan");
}

const receiptSchema = z
  .object({
    vant_client_id: z.string().uuid().optional(),
    counterparty: z.string().trim().max(200).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida."),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida."),
    amount: z.coerce.number().positive("El monto debe ser mayor a 0."),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Moneda ISO de 3 letras."),
    concept: z.enum(REVENUE_CONCEPTS),
    reference: z.string().trim().max(200).optional(),
    note: z.string().trim().max(1000).optional(),
  })
  .refine((d) => !!d.vant_client_id || !!d.counterparty, "Elige el cliente o escribe quién pagó.");

export async function recordReceipt(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  assertCan("user", "record_observed_data");
  const parsed = receiptSchema.safeParse({
    vant_client_id: formData.get("vant_client_id") || undefined,
    counterparty: formData.get("counterparty") || undefined,
    date: formData.get("date"),
    time: formData.get("time") || "12:00",
    amount: formData.get("amount"),
    currency: formData.get("currency") || "COP",
    concept: formData.get("concept"),
    reference: formData.get("reference") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const profile = await getCurrentProfile();
  const receivedAt = zonedTimeToIso(d.date, d.time, profile?.timezone ?? "America/Bogota");
  if (Date.parse(receivedAt) > Date.now() + 60_000) return { ok: false, error: "Un pago recibido no puede tener fecha futura." };

  const { error } = await supabase.from("revenue_receipts").insert({
    vant_client_id: d.vant_client_id ?? null,
    counterparty: d.counterparty ?? null,
    received_at: receivedAt,
    amount: d.amount,
    currency: d.currency,
    concept: d.concept,
    reference: d.reference ?? null,
    // La referencia bancaria evita registrar dos veces el mismo pago.
    idempotency_key: d.reference ? d.reference.toLowerCase() : null,
    note: d.note ?? null,
    origin: "manual",
    created_by: "user",
  });
  if (error) {
    return {
      ok: false,
      error: error.code === DUPLICATE ? "Ya registraste un pago con esa referencia (no se duplica)." : `No se pudo guardar el pago: ${error.message}`,
    };
  }
  refresh();
  return { ok: true };
}

const reverseSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().min(3, "Explica por qué se revierte (queda en el historial).").max(500),
});

/** Revertir ≠ borrar: el pago deja de contar y conserva su registro con motivo. */
export async function reverseReceipt(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  assertCan("user", "record_observed_data");
  const parsed = reverseSchema.safeParse({ id: formData.get("id"), reason: formData.get("reason") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { error } = await supabase
    .from("revenue_receipts")
    .update({ status: "reversed", reversed_at: new Date().toISOString(), reversal_reason: parsed.data.reason })
    .eq("id", parsed.data.id)
    .eq("status", "received");
  if (error) return { ok: false, error: `No se pudo revertir: ${error.message}` };
  refresh();
  return { ok: true };
}

const fxSchema = z
  .object({
    base_currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
    quote_currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
    rate: z.coerce.number().positive("La tasa debe ser mayor a 0."),
    rate_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida."),
    source: z.string().trim().min(2, "La fuente es obligatoria (p. ej. TRM Banco de la República)."),
    source_reference: z.string().trim().max(500).optional(),
  })
  .refine((d) => d.base_currency !== d.quote_currency, "Elige dos monedas distintas.");

/** Una tasa es un dato con fecha y fuente (C-1). Corregirla = registrar otra; la anterior queda en el historial. */
export async function recordFxRate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  assertCan("user", "record_observed_data");
  const parsed = fxSchema.safeParse({
    base_currency: formData.get("base_currency") || "USD",
    quote_currency: formData.get("quote_currency") || "COP",
    rate: formData.get("rate"),
    rate_date: formData.get("rate_date"),
    source: formData.get("source"),
    source_reference: formData.get("source_reference") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { error } = await supabase.from("fx_rates").insert({ ...parsed.data, source_reference: parsed.data.source_reference ?? null });
  if (error) {
    return {
      ok: false,
      error: error.code === DUPLICATE ? "Ya hay una tasa de ese par para esa fecha. Para corregirla, regístrala con la fecha del nuevo dato." : `No se pudo guardar la tasa: ${error.message}`,
    };
  }
  refresh();
  return { ok: true };
}
