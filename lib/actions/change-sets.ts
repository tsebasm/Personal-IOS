"use server";

import { createHash } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  applyChangeSet,
  ChangeSetError,
  createChangeSet,
  proposeChangeSet,
  reviewChangeSet,
  type Db,
} from "@/lib/intelligence/change-sets";
import { PermissionError } from "@/lib/intelligence/permissions";
import type { ActionState } from "./types";

/**
 * Acciones de la UI sobre change sets. Siempre actor = 'user': solo se llaman
 * desde formularios del usuario autenticado. Las herramientas de Claude, si
 * existen, deben usar lib/intelligence/change-sets.ts con actor 'claude'.
 */

async function session() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, db: supabase as unknown as Db, user };
}

function fail(e: unknown): ActionState {
  if (e instanceof ChangeSetError) {
    const detail = e.validation?.errors.map((x) => x.message).join(" ") ?? "";
    return { ok: false, error: `${e.message} ${detail}`.trim() };
  }
  if (e instanceof PermissionError) return { ok: false, error: e.message };
  return { ok: false, error: e instanceof Error ? e.message : "Error inesperado." };
}

const goalChangeSchema = z.object({
  goal_id: z.string().uuid(),
  title: z.string().trim().min(1, "El nombre de la meta es obligatorio.").max(200),
  target_value: z.coerce.number().positive("El objetivo debe ser mayor a 0."),
  unit: z.string().trim().min(1).max(40),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Moneda ISO de 3 letras (USD, COP…).")
    .optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha límite inválida."),
  measure_received: z.boolean(),
  problem: z.string().trim().min(1, "Explica por qué cambia la meta.").max(2000),
  reason: z.string().trim().min(1, "La razón es obligatoria (§11).").max(2000),
});

/**
 * §11: cambio deliberado de la meta principal. Deja la fuente (lo que escribiste),
 * la importación manual, el paquete goal_change y la decisión en estado propuesta.
 * No cambia nada todavía: la meta cambia al aprobar y aplicar.
 */
export async function proposeGoalChange(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, db, user } = await session();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  const parsed = goalChangeSchema.safeParse({
    goal_id: formData.get("goal_id"),
    title: formData.get("title"),
    target_value: formData.get("target_value"),
    unit: formData.get("unit"),
    currency: formData.get("currency") || undefined,
    deadline: formData.get("deadline"),
    measure_received: formData.get("measure_received") === "on",
    problem: formData.get("problem"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const payload: Record<string, unknown> = {
    title: d.title,
    target_value: d.target_value,
    unit: d.unit,
    currency: d.currency ?? null,
    deadline: d.deadline,
    activation_state: "active",
    ...(d.measure_received ? { kpi_metric_key: "revenue_received" } : {}),
  };
  const content = [
    `Cambio de meta principal solicitado por el usuario.`,
    `Nueva meta: ${d.title} — ${d.target_value} ${d.currency ?? d.unit} antes del ${d.deadline}.`,
    `Problema: ${d.problem}`,
    `Razón: ${d.reason}`,
  ].join("\n");

  try {
    const hash = createHash("sha256").update(content).digest("hex");
    const { data: existing } = await supabase.from("source_documents").select("id").eq("content_hash", hash).maybeSingle();
    let docId = existing?.id as string | undefined;
    if (!docId) {
      const { data: doc, error } = await supabase
        .from("source_documents")
        .insert({ kind: "chat_text", title: `Cambio de meta: ${d.title}`, content, content_hash: hash, created_by: "user" })
        .select("id")
        .single();
      if (error || !doc) return { ok: false, error: `No se pudo guardar la fuente: ${error?.message}` };
      docId = doc.id;
    }
    const { data: imp, error: impErr } = await supabase
      .from("plan_imports")
      .insert({ source_document_id: docId, interpreter: "manual", interpreter_version: "goal-change-form-v1", status: "proposed" })
      .select("id")
      .single();
    if (impErr || !imp) return { ok: false, error: `No se pudo registrar la importación: ${impErr?.message}` };

    const id = await createChangeSet(db, "user", {
      kind: "goal_change",
      title: `Cambio de meta: ${d.title}`,
      rationale: d.reason,
      planImportId: imp.id,
      items: [{ seq: 1, op: "update", entity_type: "goal", entity_id: d.goal_id, temp_ref: null, payload, depends_on: [], sensitivity: "locked" }],
    });
    await proposeChangeSet(
      db,
      "user",
      id,
      {
        title: `Meta principal: ${d.title}`,
        problem: d.problem,
        change: `Meta = ${d.target_value} ${d.currency ?? d.unit}, deadline ${d.deadline}, bloqueada.`,
        reason: d.reason,
      },
      "goal_change"
    );
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/dashboard/cambios");
  return { ok: true };
}

const idSchema = z.string().uuid();

/** Revisión completa: aprobar o rechazar todos los ítems (la revisión por ítem llega con la UI de importación). */
export async function reviewAll(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, db, user } = await session();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  const id = idSchema.safeParse(formData.get("id"));
  const verdict = formData.get("verdict");
  if (!id.success || (verdict !== "approve" && verdict !== "reject")) return { ok: false, error: "Solicitud inválida." };
  const { data: items } = await supabase.from("change_items").select("seq").eq("change_set_id", id.data);
  const seqs = (items ?? []).map((i) => i.seq as number);
  try {
    await reviewChangeSet(db, "user", id.data, verdict === "approve" ? seqs : [], verdict === "reject" ? seqs : []);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/dashboard/cambios");
  return { ok: true };
}

export async function applySet(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { db, user } = await session();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { ok: false, error: "Solicitud inválida." };
  try {
    const r = await applyChangeSet(db, "user", id.data);
    if (r.status === "failed") return { ok: false, error: `No se aplicó (nada cambió): ${r.reason}` };
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

/** Un paquete fallido vuelve a revisión (su decisión se conserva). */
export async function reproposeSet(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { db, user } = await session();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  const id = idSchema.safeParse(formData.get("id"));
  const kind = formData.get("kind") === "goal_change" ? "goal_change" : "standard";
  if (!id.success) return { ok: false, error: "Solicitud inválida." };
  try {
    await proposeChangeSet(db, "user", id.data, null, kind);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/dashboard/cambios");
  return { ok: true };
}
