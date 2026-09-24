"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TIME_CATEGORIES } from "@/lib/engine/allocation";
import { EXECUTION_MODES } from "@/lib/tasks";
import type { ActionState } from "./types";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida."),
  minutes: z.coerce.number().int().min(1, "Mínimo 1 minuto.").max(1440, "Máximo 24 horas."),
  category: z.enum(TIME_CATEGORIES, { errorMap: () => ({ message: "Elige una categoría." }) }),
  execution_mode: z.enum(EXECUTION_MODES).optional(),
  task_id: z.string().uuid().optional(),
  note: z.string().trim().max(300).optional(),
});

function revalidate() {
  revalidatePath("/dashboard/time");
  revalidatePath("/dashboard/today");
}

/** Captura rápida (1 toque en móvil): categoría + minutos; lo demás es opcional. */
export async function logTime(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const parsed = schema.safeParse({
    date: formData.get("date"),
    minutes: formData.get("minutes"),
    category: formData.get("category") || undefined,
    execution_mode: formData.get("execution_mode") || undefined,
    task_id: formData.get("task_id") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  // Si viene de una tarea, hereda su meta: el tiempo queda atribuido sin pedirlo.
  let goalId: string | null = null;
  if (d.task_id) {
    const { data: task } = await supabase.from("tasks").select("goal_id").eq("id", d.task_id).maybeSingle();
    goalId = task?.goal_id ?? null;
  }

  const { error } = await supabase.from("time_entries").insert({
    date: d.date,
    minutes: d.minutes,
    category: d.category,
    execution_mode: d.execution_mode ?? null,
    task_id: d.task_id ?? null,
    goal_id: goalId,
    note: d.note || null,
  });
  if (error) return { ok: false, error: "No pudimos registrar el tiempo." };

  revalidate();
  return { ok: true };
}

export async function deleteTimeEntry(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const { error } = await supabase.from("time_entries").delete().eq("id", id);
  if (error) return { ok: false, error: "No pudimos eliminar el registro." };
  revalidate();
  return { ok: true };
}
