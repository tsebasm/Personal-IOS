"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "./types";

const schema = z.object({
  date: z.string().optional(),
  channel: z.string().trim().min(1, "El medio es obligatorio.").max(80),
  contacts_count: z.string().optional(),
  replies_count: z.string().optional(),
  appointments_count: z.string().optional(),
  clients_closed: z.string().optional(),
  offer: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
});

function toNonNegativeInt(value: string | undefined): number {
  const n = value ? Number(value) : 0;
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

function readForm(formData: FormData) {
  return schema.safeParse({
    date: formData.get("date") || undefined,
    channel: formData.get("channel"),
    contacts_count: formData.get("contacts_count") || undefined,
    replies_count: formData.get("replies_count") || undefined,
    appointments_count: formData.get("appointments_count") || undefined,
    clients_closed: formData.get("clients_closed") || undefined,
    offer: formData.get("offer") || undefined,
    notes: formData.get("notes") || undefined,
  });
}

export async function createProspectingSession(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const parsed = readForm(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const { error } = await supabase.from("prospecting_sessions").insert({
    date: d.date || undefined,
    channel: d.channel,
    contacts_count: toNonNegativeInt(d.contacts_count),
    replies_count: toNonNegativeInt(d.replies_count),
    appointments_count: toNonNegativeInt(d.appointments_count),
    clients_closed: toNonNegativeInt(d.clients_closed),
    offer: d.offer || null,
    notes: d.notes || null,
  });
  if (error) return { ok: false, error: "No pudimos registrar la sesión." };

  revalidatePath("/dashboard/agencia/prospecting");
  revalidatePath("/dashboard/agencia");
  return { ok: true };
}

export async function updateProspectingSession(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { ok: false, error: "Sesión inválida." };

  const parsed = readForm(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const { error } = await supabase
    .from("prospecting_sessions")
    .update({
      date: d.date || undefined,
      channel: d.channel,
      contacts_count: toNonNegativeInt(d.contacts_count),
      replies_count: toNonNegativeInt(d.replies_count),
      appointments_count: toNonNegativeInt(d.appointments_count),
      clients_closed: toNonNegativeInt(d.clients_closed),
      offer: d.offer || null,
      notes: d.notes || null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "No pudimos actualizar la sesión." };

  revalidatePath("/dashboard/agencia/prospecting");
  revalidatePath("/dashboard/agencia");
  return { ok: true };
}

export async function deleteProspectingSession(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const { error } = await supabase.from("prospecting_sessions").delete().eq("id", id);
  if (error) return { ok: false, error: "No pudimos eliminar la sesión." };

  revalidatePath("/dashboard/agencia/prospecting");
  revalidatePath("/dashboard/agencia");
  return { ok: true };
}
