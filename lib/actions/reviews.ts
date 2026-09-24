"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "./types";

const schema = z.object({
  type: z.enum(["diaria", "semanal", "mensual", "trimestral"]),
  period_start: z.string().min(1, "La fecha de inicio es obligatoria."),
  period_end: z.string().min(1, "La fecha de fin es obligatoria."),
  note: z.string().trim().max(4000).optional(),
});

export async function createReview(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const parsed = schema.safeParse({
    type: formData.get("type"),
    period_start: formData.get("period_start"),
    period_end: formData.get("period_end"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const { error } = await supabase.from("reviews").insert({
    type: d.type,
    period_start: d.period_start,
    period_end: d.period_end,
    content: d.note ? { note: d.note } : {},
  });
  if (error) return { ok: false, error: "No pudimos guardar la revisión." };

  revalidatePath("/dashboard/reviews");
  return { ok: true };
}

export async function updateReview(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { ok: false, error: "Revisión inválida." };

  const parsed = schema.safeParse({
    type: formData.get("type"),
    period_start: formData.get("period_start"),
    period_end: formData.get("period_end"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  // Solo se actualiza la nota: el snapshot semanal y el check-in diario se conservan.
  const { data: existing } = await supabase.from("reviews").select("content").eq("id", id).maybeSingle();
  const prev = (existing?.content ?? {}) as Record<string, unknown>;
  const { note: _oldNote, ...rest } = prev;
  const { error } = await supabase
    .from("reviews")
    .update({
      type: d.type,
      period_start: d.period_start,
      period_end: d.period_end,
      content: d.note ? { ...rest, note: d.note } : rest,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "No pudimos actualizar la revisión." };

  revalidatePath("/dashboard/reviews");
  return { ok: true };
}

export async function deleteReview(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) return { ok: false, error: "No pudimos eliminar la revisión." };

  revalidatePath("/dashboard/reviews");
  return { ok: true };
}
