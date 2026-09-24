"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEVICES, EXECUTION_MODES, TASK_LEVERS } from "@/lib/tasks";
import { MISS_DECISIONS, MISS_REASONS } from "@/lib/adaptive";
import type { ActionState } from "./types";

const scale = z
  .string()
  .optional()
  .refine((v) => !v || [1, 2, 3, 4, 5].includes(Number(v)), "Usa una escala de 1 a 5.");

const schema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio.").max(120),
  description: z.string().trim().max(2000).optional(),
  area_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  goal_id: z.string().uuid().optional(),
  lever: z.enum(TASK_LEVERS).optional(),
  priority: z.enum(["baja", "media", "alta"]),
  impact_score: scale,
  effort: scale,
  execution_mode: z.enum(EXECUTION_MODES).optional(),
  device_required: z.enum(DEVICES).optional(),
  energy_required: z.enum(["baja", "media", "alta"]).optional(),
  estimated_minutes: z.string().optional(),
  deadline: z.string().optional(),
  scheduled_date: z.string().optional(),
});

function readForm(formData: FormData) {
  return {
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    area_id: formData.get("area_id") || undefined,
    project_id: formData.get("project_id") || undefined,
    goal_id: formData.get("goal_id") || undefined,
    lever: formData.get("lever") || undefined,
    priority: formData.get("priority"),
    impact_score: formData.get("impact_score") || undefined,
    effort: formData.get("effort") || undefined,
    execution_mode: formData.get("execution_mode") || undefined,
    device_required: formData.get("device_required") || undefined,
    energy_required: formData.get("energy_required") || undefined,
    estimated_minutes: formData.get("estimated_minutes") || undefined,
    deadline: formData.get("deadline") || undefined,
    scheduled_date: formData.get("scheduled_date") || undefined,
  };
}

function toRow(d: z.infer<typeof schema>) {
  return {
    title: d.title,
    description: d.description || null,
    area_id: d.area_id || null,
    project_id: d.project_id || null,
    goal_id: d.goal_id || null,
    lever: d.lever || null,
    priority: d.priority,
    impact_score: d.impact_score ? Number(d.impact_score) : null,
    effort: d.effort ? Number(d.effort) : null,
    execution_mode: d.execution_mode || null,
    device_required: d.device_required || null,
    energy_required: d.energy_required || null,
    estimated_minutes: d.estimated_minutes ? Number(d.estimated_minutes) : null,
    deadline: d.deadline || null,
    scheduled_date: d.scheduled_date || null,
  };
}

function revalidate() {
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/today");
  revalidatePath("/dashboard");
}

export async function createTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const parsed = schema.safeParse(readForm(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await supabase.from("tasks").insert(toRow(parsed.data));
  if (error) return { ok: false, error: "No pudimos crear la tarea." };

  revalidate();
  return { ok: true };
}

const updateSchema = schema.extend({
  status: z.enum(["inbox", "next", "today", "in_progress", "waiting", "done", "cancelled"]),
});

export async function updateTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { ok: false, error: "Tarea inválida." };

  const parsed = updateSchema.safeParse({ ...readForm(formData), status: formData.get("status") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const { error } = await supabase
    .from("tasks")
    .update({
      ...toRow(d),
      status: d.status,
      completed_at: d.status === "done" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "No pudimos actualizar la tarea." };

  revalidate();
  return { ok: true };
}

/** Completar/reabrir desde Hoy sin abrir el formulario. */
export async function setTaskDone(id: string, done: boolean): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const { error } = await supabase
    .from("tasks")
    .update(done ? { status: "done", completed_at: new Date().toISOString() } : { status: "today", completed_at: null })
    .eq("id", id);
  if (error) return { ok: false, error: "No pudimos actualizar la tarea." };

  revalidate();
  return { ok: true };
}

const missSchema = z
  .object({
    id: z.string().uuid(),
    today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: z.enum(MISS_REASONS, { errorMap: () => ({ message: "Elige por qué no se completó." }) }),
    decision: z.enum(MISS_DECISIONS, { errorMap: () => ({ message: "Elige qué hacer con la tarea." }) }),
    reschedule_to: z.string().optional(),
    new_priority: z.enum(["baja", "media", "alta"]).optional(),
    steps: z.string().max(2000).optional(),
  })
  .refine((d) => d.decision !== "reschedule" || !!d.reschedule_to, "Elige la nueva fecha.")
  .refine(
    (d) => d.decision !== "break_down" || (d.steps ?? "").split("\n").some((s) => s.trim()),
    "Escribe al menos un paso (uno por línea)."
  );

/**
 * Modo adaptativo: registra el motivo en activity_logs (dato para aprender
 * qué falla más) y aplica la decisión. Nunca mueve la tarea en silencio.
 */
export async function resolveMissedTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const parsed = missSchema.safeParse({
    id: formData.get("id"),
    today: formData.get("today"),
    reason: formData.get("reason") || undefined,
    decision: formData.get("decision") || undefined,
    reschedule_to: formData.get("reschedule_to") || undefined,
    new_priority: formData.get("new_priority") || undefined,
    steps: formData.get("steps") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, scheduled_date, priority, goal_id, lever, project_id, area_id, execution_mode, notes")
    .eq("id", d.id)
    .maybeSingle();
  if (!task) return { ok: false, error: "Tarea no encontrada." };

  let update: Record<string, unknown> | null = null;
  if (d.decision === "keep") update = { scheduled_date: d.today, status: "today" };
  if (d.decision === "reschedule") update = { scheduled_date: d.reschedule_to, status: "next" };
  if (d.decision === "remove") update = { status: "cancelled" };
  if (d.decision === "reprioritize") update = { scheduled_date: null, status: "next", priority: d.new_priority ?? task.priority };
  if (d.decision === "break_down") {
    const steps = (d.steps ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);
    const { error } = await supabase.from("tasks").insert(
      steps.map((title) => ({
        title: title.slice(0, 120),
        priority: task.priority,
        goal_id: task.goal_id,
        lever: task.lever,
        project_id: task.project_id,
        area_id: task.area_id,
        execution_mode: task.execution_mode,
        scheduled_date: d.today,
        status: "today",
      }))
    );
    if (error) return { ok: false, error: "No pudimos crear los pasos." };
    const note = `Dividida en ${steps.length} paso(s) el ${d.today}.`;
    update = { status: "cancelled", notes: task.notes ? `${task.notes}
${note}` : note };
  }

  const { error: updateError } = await supabase.from("tasks").update(update!).eq("id", d.id);
  if (updateError) return { ok: false, error: "No pudimos aplicar la decisión." };

  await supabase.from("activity_logs").insert({
    entity_type: "task",
    entity_id: d.id,
    action: "missed_resolved",
    payload: {
      reason: d.reason,
      decision: d.decision,
      scheduled_date_was: task.scheduled_date,
      resolved_on: d.today,
      reschedule_to: d.reschedule_to ?? null,
    },
  });

  revalidate();
  return { ok: true };
}

export async function deleteTask(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { ok: false, error: "No pudimos eliminar la tarea." };

  revalidate();
  return { ok: true };
}
