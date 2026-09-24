"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "./types";

const schema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio.").max(120),
    hypothesis_id: z.string().uuid().optional(),
    metric_key: z.enum(["reply_rate", "booking_rate", "show_rate", "close_rate"]),
    variants: z.string().trim().min(1, "Define al menos una variante."),
    sample_target: z.coerce.number().int().min(1).max(100000),
    started_on: z.string().min(1, "La fecha de inicio es obligatoria."),
    ended_on: z.string().optional(),
    status: z.enum(["running", "finished"]),
    decision: z.enum(["keep", "change", "inconclusive"]).optional(),
    learning: z.string().trim().max(4000).optional(),
  })
  .refine((d) => d.status !== "finished" || !!d.decision, "Al terminar un experimento, registra la decisión.");

function readForm(formData: FormData) {
  return schema.safeParse({
    name: formData.get("name"),
    hypothesis_id: formData.get("hypothesis_id") || undefined,
    metric_key: formData.get("metric_key"),
    variants: formData.get("variants"),
    sample_target: formData.get("sample_target"),
    started_on: formData.get("started_on"),
    ended_on: formData.get("ended_on") || undefined,
    status: formData.get("status"),
    decision: formData.get("decision") || undefined,
    learning: formData.get("learning") || undefined,
  });
}

function toRow(d: z.infer<typeof schema>) {
  const variants = [
    ...new Set(
      d.variants
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
        .map((v) => v.slice(0, 40))
    ),
  ].slice(0, 6);
  return {
    name: d.name,
    hypothesis_id: d.hypothesis_id || null,
    metric_key: d.metric_key,
    variants,
    sample_target: d.sample_target,
    started_on: d.started_on,
    ended_on: d.status === "finished" ? d.ended_on || new Date().toISOString().slice(0, 10) : d.ended_on || null,
    status: d.status,
    decision: d.decision ?? null,
    learning: d.learning || null,
  };
}

async function auth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * Al cerrar un experimento con aprendizaje, se guarda también como memoria
 * (knowledge_items kind 'decision') enlazada al experimento — así el
 * aprendizaje sobrevive aunque la hipótesis cambie.
 */
async function recordLearning(supabase: Awaited<ReturnType<typeof createClient>>, experimentId: string, name: string, row: ReturnType<typeof toRow>) {
  if (row.status !== "finished" || !row.learning) return;
  const { data: item } = await supabase
    .from("knowledge_items")
    .insert({
      kind: "decision",
      title: `Experimento: ${name} → ${row.decision}`,
      description: row.learning,
      status: "experiment",
    })
    .select("id")
    .single();
  if (item) {
    await supabase.from("knowledge_links").insert({
      from_type: "knowledge_item",
      from_id: item.id,
      to_type: "experiment",
      to_id: experimentId,
      relation_label: "aprendizaje",
    });
  }
}

export async function createExperiment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  const parsed = readForm(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const row = toRow(parsed.data);

  const { data, error } = await supabase.from("experiments").insert(row).select("id").single();
  if (error || !data) return { ok: false, error: "No pudimos crear el experimento." };
  await recordLearning(supabase, data.id, row.name, row);

  revalidatePath("/dashboard/agencia/experiments");
  return { ok: true };
}

export async function updateExperiment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { ok: false, error: "Experimento inválido." };
  const parsed = readForm(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const row = toRow(parsed.data);

  const { data: prev } = await supabase.from("experiments").select("status").eq("id", id).maybeSingle();
  const { error } = await supabase.from("experiments").update(row).eq("id", id);
  if (error) return { ok: false, error: "No pudimos actualizar el experimento." };
  // Solo al pasar a terminado: editar uno ya cerrado no duplica la memoria.
  if (prev?.status !== "finished") await recordLearning(supabase, id, row.name, row);

  revalidatePath("/dashboard/agencia/experiments");
  revalidatePath("/dashboard/knowledge");
  return { ok: true };
}

export async function deleteExperiment(id: string): Promise<ActionState> {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  const { error } = await supabase.from("experiments").delete().eq("id", id);
  if (error) return { ok: false, error: "No pudimos eliminar el experimento." };
  revalidatePath("/dashboard/agencia/experiments");
  return { ok: true };
}
