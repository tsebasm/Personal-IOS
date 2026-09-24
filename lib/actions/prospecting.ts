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
  shows_count: z.string().optional(),
  proposals_count: z.string().optional(),
  followups_count: z.string().optional(),
  minutes_spent: z.string().optional(),
  hypothesis_id: z.string().uuid().optional(),
  message_variant: z.string().trim().max(80).optional(),
  offer: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
});

function toNonNegativeInt(value: string | undefined): number {
  const n = value ? Number(value) : 0;
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

/** Etapas del embudo agregadas en 0011 + atribución a hipótesis/variante de mensaje. */
function funnelExtras(d: z.infer<typeof schema>) {
  return {
    shows_count: toNonNegativeInt(d.shows_count),
    proposals_count: toNonNegativeInt(d.proposals_count),
    followups_count: toNonNegativeInt(d.followups_count),
    minutes_spent: d.minutes_spent ? toNonNegativeInt(d.minutes_spent) : null,
    hypothesis_id: d.hypothesis_id || null,
    message_variant: d.message_variant || null,
  };
}

function readForm(formData: FormData) {
  return schema.safeParse({
    date: formData.get("date") || undefined,
    channel: formData.get("channel"),
    contacts_count: formData.get("contacts_count") || undefined,
    replies_count: formData.get("replies_count") || undefined,
    appointments_count: formData.get("appointments_count") || undefined,
    clients_closed: formData.get("clients_closed") || undefined,
    shows_count: formData.get("shows_count") || undefined,
    proposals_count: formData.get("proposals_count") || undefined,
    followups_count: formData.get("followups_count") || undefined,
    minutes_spent: formData.get("minutes_spent") || undefined,
    hypothesis_id: formData.get("hypothesis_id") || undefined,
    message_variant: formData.get("message_variant") || undefined,
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
    ...funnelExtras(d),
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
    ...funnelExtras(d),
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
