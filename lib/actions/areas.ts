"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isConfigMode } from "./guard";
import type { ActionState } from "./types";

const schema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(80),
  color: z.string().trim().max(20).optional(),
});

export async function createArea(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const parsed = schema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await supabase.from("areas").insert({
    name: parsed.data.name,
    color: parsed.data.color || null,
  });
  if (error) return { ok: false, error: "No pudimos crear el área." };

  revalidatePath("/dashboard/areas");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateArea(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  if (!(await isConfigMode(supabase, user.id))) {
    return { ok: false, error: "Activa el modo configuración para editar áreas." };
  }

  const id = formData.get("id");
  const parsed = schema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
  });
  if (typeof id !== "string" || !id) return { ok: false, error: "Área inválida." };
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await supabase
    .from("areas")
    .update({ name: parsed.data.name, color: parsed.data.color || null })
    .eq("id", id);
  if (error) return { ok: false, error: "No pudimos actualizar el área." };

  revalidatePath("/dashboard/areas");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteArea(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  if (!(await isConfigMode(supabase, user.id))) {
    return { ok: false, error: "Activa el modo configuración para eliminar áreas." };
  }

  const { error } = await supabase.from("areas").delete().eq("id", id);
  if (error) return { ok: false, error: "No pudimos eliminar el área." };

  revalidatePath("/dashboard/areas");
  revalidatePath("/dashboard");
  return { ok: true };
}
