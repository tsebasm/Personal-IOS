"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isConfigMode } from "./guard";
import type { ActionState } from "./types";

const schema = z.object({
  vant_goal_id: z.string().uuid().optional(),
  daily_outreach_target: z.coerce.number().int().min(0).optional(),
});

/** Configuración estructural de VANT: meta de facturación vinculada + meta diaria de prospección. Solo en modo configuración. */
export async function updateAgenciaSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };
  if (!(await isConfigMode(supabase, user.id))) {
    return { ok: false, error: "Activa el modo configuración para cambiar esta relación." };
  }

  const rawTarget = formData.get("daily_outreach_target");
  const parsed = schema.safeParse({
    vant_goal_id: formData.get("vant_goal_id") || undefined,
    daily_outreach_target: rawTarget ? rawTarget : undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await supabase.from("agencia_settings").upsert(
    {
      user_id: user.id,
      vant_goal_id: parsed.data.vant_goal_id || null,
      daily_outreach_target: parsed.data.daily_outreach_target ?? null,
    },
    { onConflict: "user_id" }
  );
  if (error) return { ok: false, error: "No pudimos guardar la configuración." };

  revalidatePath("/dashboard/agencia");
  revalidatePath("/dashboard");
  return { ok: true };
}
