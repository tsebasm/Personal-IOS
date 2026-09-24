"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CAPACITY_KINDS } from "@/lib/engine/capacity";
import type { ActionState } from "./types";

const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Hora inválida.");

const schema = z
  .object({
    label: z.string().trim().min(1, "El nombre es obligatorio.").max(80),
    kind: z.enum(CAPACITY_KINDS),
    days_of_week: z.array(z.coerce.number().int().min(0).max(6)).min(1, "Elige al menos un día."),
    start_time: time,
    end_time: time,
    valid_from: z.string().optional(),
    valid_to: z.string().optional(),
  })
  .refine((d) => d.start_time.slice(0, 5) !== d.end_time.slice(0, 5), "La hora de inicio y fin no pueden ser iguales.")
  .refine((d) => !d.valid_from || !d.valid_to || d.valid_from <= d.valid_to, "La vigencia termina antes de empezar.");

function readForm(formData: FormData) {
  return schema.safeParse({
    label: formData.get("label"),
    kind: formData.get("kind"),
    days_of_week: formData.getAll("days_of_week"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
    valid_from: formData.get("valid_from") || undefined,
    valid_to: formData.get("valid_to") || undefined,
  });
}

function toRow(d: z.infer<typeof schema>) {
  return { ...d, valid_from: d.valid_from || null, valid_to: d.valid_to || null };
}

function revalidate() {
  revalidatePath("/dashboard/capacity");
  revalidatePath("/dashboard/today");
  revalidatePath("/dashboard");
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createCapacityBlock(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  const parsed = readForm(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await supabase.from("capacity_blocks").insert(toRow(parsed.data));
  if (error) return { ok: false, error: "No pudimos crear el bloque." };
  revalidate();
  return { ok: true };
}

export async function updateCapacityBlock(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { ok: false, error: "Bloque inválido." };
  const parsed = readForm(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await supabase.from("capacity_blocks").update(toRow(parsed.data)).eq("id", id);
  if (error) return { ok: false, error: "No pudimos actualizar el bloque." };
  revalidate();
  return { ok: true };
}

export async function deleteCapacityBlock(id: string): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  const { error } = await supabase.from("capacity_blocks").delete().eq("id", id);
  if (error) return { ok: false, error: "No pudimos eliminar el bloque." };
  revalidate();
  return { ok: true };
}
