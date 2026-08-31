"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "./types";

const schema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(120),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.enum(["activa", "pausada", "finalizada"]),
  spend: z.string().optional(),
  leads: z.string().optional(),
  qualified_leads: z.string().optional(),
  forms_completed: z.string().optional(),
  calls_scheduled: z.string().optional(),
  calls_attended: z.string().optional(),
  calls_total_accumulated: z.string().optional(),
  calls_goal: z.string().optional(),
});

function toNonNegativeInt(value: string | undefined): number {
  const n = value ? Number(value) : 0;
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

function toNonNegativeNumber(value: string | undefined): number {
  const n = value ? Number(value) : 0;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function readCampaignForm(formData: FormData) {
  return schema.safeParse({
    name: formData.get("name"),
    start_date: formData.get("start_date") || undefined,
    end_date: formData.get("end_date") || undefined,
    status: formData.get("status"),
    spend: formData.get("spend") || undefined,
    leads: formData.get("leads") || undefined,
    qualified_leads: formData.get("qualified_leads") || undefined,
    forms_completed: formData.get("forms_completed") || undefined,
    calls_scheduled: formData.get("calls_scheduled") || undefined,
    calls_attended: formData.get("calls_attended") || undefined,
    calls_total_accumulated: formData.get("calls_total_accumulated") || undefined,
    calls_goal: formData.get("calls_goal") || undefined,
  });
}

export async function createCampaign(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const parsed = readCampaignForm(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const { error } = await supabase.from("campaigns").insert({
    name: d.name,
    start_date: d.start_date || undefined,
    end_date: d.end_date || null,
    status: d.status,
    spend: toNonNegativeNumber(d.spend),
    leads: toNonNegativeInt(d.leads),
    qualified_leads: toNonNegativeInt(d.qualified_leads),
    forms_completed: toNonNegativeInt(d.forms_completed),
    calls_scheduled: toNonNegativeInt(d.calls_scheduled),
    calls_attended: toNonNegativeInt(d.calls_attended),
    calls_total_accumulated: toNonNegativeInt(d.calls_total_accumulated),
    calls_goal: d.calls_goal ? toNonNegativeInt(d.calls_goal) : null,
  });
  if (error) return { ok: false, error: "No pudimos crear la campaña." };

  revalidatePath("/dashboard/agencia/campaigns");
  revalidatePath("/dashboard/agencia");
  return { ok: true };
}

export async function updateCampaign(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { ok: false, error: "Campaña inválida." };

  const parsed = readCampaignForm(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const { error } = await supabase
    .from("campaigns")
    .update({
      name: d.name,
      start_date: d.start_date || undefined,
      end_date: d.end_date || null,
      status: d.status,
      spend: toNonNegativeNumber(d.spend),
      leads: toNonNegativeInt(d.leads),
      qualified_leads: toNonNegativeInt(d.qualified_leads),
      forms_completed: toNonNegativeInt(d.forms_completed),
      calls_scheduled: toNonNegativeInt(d.calls_scheduled),
      calls_attended: toNonNegativeInt(d.calls_attended),
      calls_total_accumulated: toNonNegativeInt(d.calls_total_accumulated),
      calls_goal: d.calls_goal ? toNonNegativeInt(d.calls_goal) : null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "No pudimos actualizar la campaña." };

  revalidatePath("/dashboard/agencia/campaigns");
  revalidatePath("/dashboard/agencia");
  return { ok: true };
}

export async function deleteCampaign(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) return { ok: false, error: "No pudimos eliminar la campaña." };

  revalidatePath("/dashboard/agencia/campaigns");
  revalidatePath("/dashboard/agencia");
  return { ok: true };
}
