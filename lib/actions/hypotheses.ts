"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { HYPOTHESIS_TYPES, HYPOTHESIS_STATUSES } from "@/lib/agencia/hypotheses";
import type { ActionState } from "./types";

const score = z.string().optional();

const schema = z.object({
  type: z.enum(HYPOTHESIS_TYPES),
  statement: z.string().trim().min(1, "La hipótesis es obligatoria.").max(500),
  market: z.string().trim().max(80).optional(),
  icp: z.string().trim().max(500).optional(),
  problem: z.string().trim().max(500).optional(),
  channel: z.string().trim().max(80).optional(),
  urgency: score,
  ability_to_pay: score,
  competition: score,
  offer_potential: score,
  confidence: z.string().optional(),
  evidence: z.string().trim().max(4000).optional(),
  source: z.string().trim().max(300).optional(),
  status: z.enum(HYPOTHESIS_STATUSES),
  superseded_by: z.string().uuid().optional(),
});

/** Entero dentro de [min, max], o null si viene vacío/no numérico — "no sé" no es 0. */
function toBoundedInt(value: string | undefined, min: number, max: number): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function readForm(formData: FormData) {
  return schema.safeParse({
    type: formData.get("type"),
    statement: formData.get("statement"),
    market: formData.get("market") || undefined,
    icp: formData.get("icp") || undefined,
    problem: formData.get("problem") || undefined,
    channel: formData.get("channel") || undefined,
    urgency: formData.get("urgency") || undefined,
    ability_to_pay: formData.get("ability_to_pay") || undefined,
    competition: formData.get("competition") || undefined,
    offer_potential: formData.get("offer_potential") || undefined,
    confidence: formData.get("confidence") || undefined,
    evidence: formData.get("evidence") || undefined,
    source: formData.get("source") || undefined,
    status: formData.get("status"),
    superseded_by: formData.get("superseded_by") || undefined,
  });
}

function toRow(d: z.infer<typeof schema>) {
  return {
    type: d.type,
    statement: d.statement,
    market: d.market || null,
    icp: d.icp || null,
    problem: d.problem || null,
    channel: d.channel || null,
    urgency: toBoundedInt(d.urgency, 1, 5),
    ability_to_pay: toBoundedInt(d.ability_to_pay, 1, 5),
    competition: toBoundedInt(d.competition, 1, 5),
    offer_potential: toBoundedInt(d.offer_potential, 1, 5),
    confidence: toBoundedInt(d.confidence, 0, 100),
    evidence: d.evidence || null,
    source: d.source || null,
    status: d.status,
    superseded_by: d.superseded_by || null,
  };
}

function revalidate() {
  revalidatePath("/dashboard/agencia/hypotheses");
  revalidatePath("/dashboard/agencia/prospecting");
}

export async function createHypothesis(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const parsed = readForm(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await supabase.from("hypotheses").insert(toRow(parsed.data));
  if (error) return { ok: false, error: "No pudimos crear la hipótesis." };

  revalidate();
  return { ok: true };
}

export async function updateHypothesis(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { ok: false, error: "Hipótesis inválida." };

  const parsed = readForm(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (parsed.data.superseded_by === id) return { ok: false, error: "Una hipótesis no puede reemplazarse a sí misma." };

  const { error } = await supabase.from("hypotheses").update(toRow(parsed.data)).eq("id", id);
  if (error) return { ok: false, error: "No pudimos actualizar la hipótesis." };

  revalidate();
  return { ok: true };
}

export async function deleteHypothesis(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const { error } = await supabase.from("hypotheses").delete().eq("id", id);
  if (error) return { ok: false, error: "No pudimos eliminar la hipótesis." };

  revalidate();
  return { ok: true };
}
