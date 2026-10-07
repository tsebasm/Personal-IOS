"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { syncTierSuggestions } from "@/lib/data/tiers";
import { STARTER_RULES } from "@/lib/engine/tiers";
import { TASK_LEVERS } from "@/lib/tasks";
import type { ActionState } from "./types";

/**
 * Reglas de prioridad (B-1): configuración como datos. Editarlas es un acto del
 * usuario (queda en activity_logs, §100); Claude solo puede proponerlas por
 * change set. Una regla nunca se borra: se archiva.
 */

async function session() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function after(supabase: Awaited<ReturnType<typeof createClient>>) {
  await syncTierSuggestions(supabase);
  revalidatePath("/dashboard/configuracion");
  revalidatePath("/dashboard/today");
  revalidatePath("/dashboard/tasks");
}

const ruleSchema = z
  .object({
    system_id: z.string().uuid().optional(),
    lever: z.enum(TASK_LEVERS).optional(),
    tier: z.enum(["p0", "p1", "p2"]),
    note: z.string().trim().max(300).optional(),
  })
  .refine((r) => !!r.system_id || !!r.lever, "Elige un sistema, una palanca o ambos.");

export async function addPriorityRule(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  const parsed = ruleSchema.safeParse({
    system_id: formData.get("system_id") || undefined,
    lever: formData.get("lever") || undefined,
    tier: formData.get("tier"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const { data, error } = await supabase
    .from("priority_rules")
    .insert({ system_id: d.system_id ?? null, lever: d.lever ?? null, tier: d.tier, note: d.note ?? null })
    .select("id")
    .single();
  if (error) {
    return { ok: false, error: error.code === "23505" ? "Ya hay una regla vigente para ese sistema y palanca: archívala primero." : `No se pudo guardar: ${error.message}` };
  }
  await supabase.from("activity_logs").insert({ entity_type: "priority_rule", entity_id: data.id, action: "priority_rule_created", payload: d });
  await after(supabase);
  return { ok: true };
}

export async function archivePriorityRule(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { ok: false, error: "Regla inválida." };
  const { error } = await supabase.from("priority_rules").update({ archived_at: new Date().toISOString() }).eq("id", id.data);
  if (error) return { ok: false, error: `No se pudo archivar: ${error.message}` };
  await supabase.from("activity_logs").insert({ entity_type: "priority_rule", entity_id: id.data, action: "priority_rule_archived", payload: {} });
  await after(supabase);
  return { ok: true };
}

/** Carga las reglas sugeridas que aún no existan (por palanca, sin sistema). Decisión explícita del usuario. */
export async function loadStarterRules(_prev: ActionState): Promise<ActionState> {
  const { supabase, user } = await session();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  const { data: existing } = await supabase.from("priority_rules").select("lever, system_id").is("archived_at", null);
  const taken = new Set((existing ?? []).filter((r) => r.system_id === null).map((r) => r.lever));
  const rows = STARTER_RULES.filter((r) => !taken.has(r.lever)).map((r) => ({ lever: r.lever, tier: r.tier, note: r.note, origin: "system", created_by: "user" }));
  if (rows.length === 0) return { ok: true };
  const { error } = await supabase.from("priority_rules").insert(rows);
  if (error) return { ok: false, error: `No se pudieron cargar: ${error.message}` };
  await supabase.from("activity_logs").insert({ entity_type: "priority_rule", action: "priority_rules_starter_loaded", payload: { levers: rows.map((r) => r.lever) } });
  await after(supabase);
  return { ok: true };
}
