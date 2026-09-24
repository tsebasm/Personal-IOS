"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LEAD_STAGES } from "@/lib/agencia/leads";
import type { ActionState } from "./types";

const schema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio.").max(120),
    company: z.string().trim().max(120).optional(),
    channel: z.string().trim().max(80).optional(),
    hypothesis_id: z.string().uuid().optional(),
    stage: z.enum(LEAD_STAGES),
    next_followup_on: z.string().optional(),
    est_value: z.string().optional(),
    lost_reason: z.string().trim().max(300).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((d) => d.stage !== "lost" || !!d.lost_reason, "Anota por qué se perdió (es dato para aprender).");

function readForm(formData: FormData) {
  return schema.safeParse({
    name: formData.get("name"),
    company: formData.get("company") || undefined,
    channel: formData.get("channel") || undefined,
    hypothesis_id: formData.get("hypothesis_id") || undefined,
    stage: formData.get("stage"),
    next_followup_on: formData.get("next_followup_on") || undefined,
    est_value: formData.get("est_value") || undefined,
    lost_reason: formData.get("lost_reason") || undefined,
    notes: formData.get("notes") || undefined,
  });
}

function toRow(d: z.infer<typeof schema>) {
  const closed = d.stage === "won" || d.stage === "lost";
  return {
    name: d.name,
    company: d.company || null,
    channel: d.channel || null,
    hypothesis_id: d.hypothesis_id || null,
    stage: d.stage,
    next_followup_on: closed ? null : d.next_followup_on || null,
    est_value: d.est_value ? Math.max(0, Number(d.est_value)) : null,
    lost_reason: d.stage === "lost" ? d.lost_reason || null : null,
    notes: d.notes || null,
  };
}

function revalidate() {
  revalidatePath("/dashboard/agencia/leads");
  revalidatePath("/dashboard/today");
  revalidatePath("/dashboard/plan");
}

async function auth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createLead(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  const parsed = readForm(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await supabase.from("leads").insert(toRow(parsed.data));
  if (error) return { ok: false, error: "No pudimos crear el lead." };
  revalidate();
  return { ok: true };
}

export async function updateLead(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { ok: false, error: "Lead inválido." };
  const parsed = readForm(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { data: prev } = await supabase.from("leads").select("stage").eq("id", id).maybeSingle();
  const row = toRow(parsed.data);
  const { error } = await supabase
    .from("leads")
    .update(prev && prev.stage !== row.stage ? { ...row, stage_changed_at: new Date().toISOString() } : row)
    .eq("id", id);
  if (error) return { ok: false, error: "No pudimos actualizar el lead." };
  revalidate();
  return { ok: true };
}

/**
 * Registra un follow-up hecho: suma 1 y agenda el próximo (o lo limpia).
 * Así el vencido desaparece de Hoy y el conteo alimenta el cuello de botella.
 */
export async function logFollowup(id: string, nextOn: string | null): Promise<ActionState> {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  const { data: lead } = await supabase.from("leads").select("followups_done").eq("id", id).maybeSingle();
  if (!lead) return { ok: false, error: "Lead no encontrado." };

  const { error } = await supabase
    .from("leads")
    .update({ followups_done: lead.followups_done + 1, next_followup_on: nextOn })
    .eq("id", id);
  if (error) return { ok: false, error: "No pudimos registrar el follow-up." };
  revalidate();
  return { ok: true };
}

export async function deleteLead(id: string): Promise<ActionState> {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) return { ok: false, error: "No pudimos eliminar el lead." };
  revalidate();
  return { ok: true };
}
