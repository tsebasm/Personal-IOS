import { createClient } from "@supabase/supabase-js";

/**
 * Signs in as the real account (email/password, same as the login form) so
 * every insert/delete the seed does goes through the app's normal RLS
 * policies — no service-role key, no bypass.
 */
export async function getSeedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;

  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local."
    );
  }
  if (!email || !password) {
    throw new Error(
      "Faltan SEED_USER_EMAIL / SEED_USER_PASSWORD en .env.local.\n" +
        "Agrega ahí el correo y contraseña de tu propia cuenta (los mismos con los que inicias sesión en la app) — el seed los usa solo para autenticarse como tú; nunca se envían a otro lado."
    );
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw new Error(
      `No se pudo iniciar sesión con SEED_USER_EMAIL/SEED_USER_PASSWORD: ${error?.message ?? "usuario no encontrado"}`
    );
  }

  return { supabase, userId: data.user.id };
}

/** Borra únicamente las filas marcadas is_demo=true, del usuario autenticado (vía RLS). */
export async function deleteDemoData(supabase) {
  // habits -> habit_logs se borran solos (on delete cascade). El resto de
  // FKs de estas tablas son "on delete set null", así que el orden entre
  // ellas no es estrictamente obligatorio, pero se borra de hijo a padre
  // por claridad (calendar_events/tasks antes que projects/goals/areas).
  const { error: habitsError } = await supabase.from("habits").delete().eq("is_demo", true);
  if (habitsError) throw new Error(`No se pudieron borrar hábitos demo: ${habitsError.message}`);

  const { error: calendarError } = await supabase.from("calendar_events").delete().eq("is_demo", true);
  if (calendarError) throw new Error(`No se pudieron borrar eventos demo: ${calendarError.message}`);

  const { error: tasksError } = await supabase.from("tasks").delete().eq("is_demo", true);
  if (tasksError) throw new Error(`No se pudieron borrar tareas demo: ${tasksError.message}`);

  const { error: goalsError } = await supabase.from("goals").delete().eq("is_demo", true);
  if (goalsError) throw new Error(`No se pudieron borrar metas/objetivos demo: ${goalsError.message}`);

  const { error: projectsError } = await supabase.from("projects").delete().eq("is_demo", true);
  if (projectsError) throw new Error(`No se pudieron borrar proyectos demo: ${projectsError.message}`);

  const { error: areasError } = await supabase.from("areas").delete().eq("is_demo", true);
  if (areasError) throw new Error(`No se pudieron borrar áreas demo: ${areasError.message}`);
}
