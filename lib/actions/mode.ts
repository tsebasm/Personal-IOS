"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateMode(mode: "normal" | "config") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("profiles").upsert({ id: user.id, system_mode: mode });
  revalidatePath("/", "layout");
}
