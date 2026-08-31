"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isConfigMode } from "./guard";
import type { ActionState } from "./types";

const schema = z.object({
  vant_goal_id: z.string().uuid().optional(),
});

/** Configuración estructural: qué meta representa la facturación de VANT. Solo en modo configuración. */
export async function updateVantGoal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  if (!(await isConfigMode(supabase, user.id))) {
    return { ok: false, error: "Activa el modo configuración para cambiar esta relación." };
  }

  const parsed = schema.safeParse({ vant_goal_id: formData.get("vant_goal_id") || undefined });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await supabase
    .from("agencia_settings")
    .upsert({ user_id: user.id, vant_goal_id: parsed.data.vant_goal_id || null }, { onConflict: "user_id" });
  if (error) return { ok: false, error: "No pudimos guardar la configuración." };

  revalidatePath("/dashboard/agencia");
  return { ok: true };
}
