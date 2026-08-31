"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "./types";

const schema = z.object({
  type: z.enum(["ingreso", "gasto", "ahorro", "inversion"]),
  amount: z.string().min(1, "El monto es obligatorio."),
  category: z.string().trim().max(60).optional(),
  date: z.string().optional(),
  note: z.string().trim().max(200).optional(),
});

export async function createTransaction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const parsed = schema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    category: formData.get("category") || undefined,
    date: formData.get("date") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const amount = Number(d.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "El monto debe ser un número mayor a 0." };
  }

  const { error } = await supabase.from("transactions").insert({
    type: d.type,
    amount,
    category: d.category || null,
    ...(d.date ? { date: d.date } : {}),
    note: d.note || null,
  });
  if (error) return { ok: false, error: "No pudimos registrar el movimiento." };

  revalidatePath("/dashboard/finances");
  return { ok: true };
}

export async function updateTransaction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { ok: false, error: "Movimiento inválido." };

  const parsed = schema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    category: formData.get("category") || undefined,
    date: formData.get("date") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const amount = Number(d.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "El monto debe ser un número mayor a 0." };
  }

  const { error } = await supabase
    .from("transactions")
    .update({
      type: d.type,
      amount,
      category: d.category || null,
      ...(d.date ? { date: d.date } : {}),
      note: d.note || null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "No pudimos actualizar el movimiento." };

  revalidatePath("/dashboard/finances");
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { ok: false, error: "No pudimos eliminar el movimiento." };

  revalidatePath("/dashboard/finances");
  return { ok: true };
}
