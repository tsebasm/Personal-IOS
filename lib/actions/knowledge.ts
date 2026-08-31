"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "./types";

const schema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio.").max(160),
  body: z.string().trim().max(4000).optional(),
  category: z.string().trim().max(60).optional(),
});

export async function createNote(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const parsed = schema.safeParse({
    title: formData.get("title"),
    body: formData.get("body") || undefined,
    category: formData.get("category") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const { error } = await supabase.from("notes").insert({
    title: d.title,
    body: d.body || null,
    category: d.category || null,
  });
  if (error) return { ok: false, error: "No pudimos guardar la nota." };

  revalidatePath("/dashboard/knowledge");
  return { ok: true };
}

export async function updateNote(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { ok: false, error: "Nota inválida." };

  const parsed = schema.safeParse({
    title: formData.get("title"),
    body: formData.get("body") || undefined,
    category: formData.get("category") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const { error } = await supabase
    .from("notes")
    .update({ title: d.title, body: d.body || null, category: d.category || null })
    .eq("id", id);
  if (error) return { ok: false, error: "No pudimos actualizar la nota." };

  revalidatePath("/dashboard/knowledge");
  return { ok: true };
}

export async function deleteNote(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) return { ok: false, error: "No pudimos eliminar la nota." };

  revalidatePath("/dashboard/knowledge");
  return { ok: true };
}
