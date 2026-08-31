// Crea datos de demostración en la cuenta autenticada (áreas, metas,
// objetivos, hábitos y su historial de los últimos 30 días), todos
// marcados is_demo=true para poder borrarlos limpiamente con seed-reset.mjs.
//
// Uso: node --env-file=.env.local scripts/seed.mjs

import { getSeedClient, deleteDemoData } from "./lib/supabase-client.mjs";
import { buildDemoPlan, buildDashboardActivityPlan, buildHabitLogDates } from "./lib/demo-data.mjs";
import { isoDateInTimezone, zonedTimeToUtcIso } from "./lib/date.mjs";

const HABIT_HISTORY_DAYS = 30;

async function main() {
  console.log("Iniciando sesión…");
  const { supabase } = await getSeedClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .maybeSingle();
  const timezone = profile?.timezone ?? "America/Bogota";
  const today = isoDateInTimezone(timezone);

  // Idempotencia: si ya había datos demo de una corrida anterior, se
  // reemplazan por completo en vez de acumularse.
  console.log("Limpiando datos demo previos (si existen)…");
  await deleteDemoData(supabase);

  const { areas, habits } = buildDemoPlan(today);

  console.log(`Creando ${areas.length} áreas…`);
  const areaIdByKey = new Map();
  for (const area of areas) {
    const { data, error } = await supabase
      .from("areas")
      .insert({ name: area.name, color: area.color, is_demo: true })
      .select("id")
      .single();
    if (error) throw new Error(`Área "${area.name}": ${error.message}`);
    areaIdByKey.set(area.key, data.id);
  }

  let metaCount = 0;
  let objetivoCount = 0;
  const goalIdByKey = new Map();

  console.log("Creando metas…");
  for (const area of areas) {
    const areaId = areaIdByKey.get(area.key);
    for (const goal of area.goals) {
      const { data, error } = await supabase
        .from("goals")
        .insert({
          area_id: areaId,
          title: goal.title,
          description: goal.description ?? null,
          horizon: goal.horizon,
          kind: goal.kind,
          unit: goal.unit ?? null,
          target_value: goal.target_value ?? null,
          current_value: goal.target_value != null ? (goal.current_value ?? 0) : null,
          priority: goal.priority ?? "media",
          deadline: goal.deadline ?? null,
          is_demo: true,
        })
        .select("id")
        .single();
      if (error) throw new Error(`Meta "${goal.title}": ${error.message}`);
      goalIdByKey.set(goal.key, data.id);
      metaCount++;
    }
  }

  console.log("Creando objetivos…");
  for (const area of areas) {
    const areaId = areaIdByKey.get(area.key);
    for (const goal of area.goals) {
      const parentId = goalIdByKey.get(goal.key);
      for (const child of goal.children) {
        const { error } = await supabase.from("goals").insert({
          area_id: areaId,
          parent_goal_id: parentId,
          title: child.title,
          horizon: child.horizon,
          kind: child.kind,
          unit: child.unit ?? null,
          target_value: child.target_value ?? null,
          current_value: child.target_value != null ? (child.current_value ?? 0) : null,
          status: child.status,
          deadline: child.deadline ?? null,
          is_demo: true,
        });
        if (error) throw new Error(`Objetivo "${child.title}": ${error.message}`);
        objetivoCount++;
      }
    }
  }

  console.log(`Creando ${habits.length} hábitos y su historial (${HABIT_HISTORY_DAYS} días)…`);
  let logCount = 0;
  for (const habit of habits) {
    const areaId = areaIdByKey.get(habit.areaKey);
    const goalId = habit.goalKey ? goalIdByKey.get(habit.goalKey) : null;

    const { data, error } = await supabase
      .from("habits")
      .insert({
        title: habit.title,
        area_id: areaId,
        goal_id: goalId,
        frequency: "diaria",
        target_per_period: 1,
        is_demo: true,
      })
      .select("id")
      .single();
    if (error) throw new Error(`Hábito "${habit.title}": ${error.message}`);

    const doneDates = buildHabitLogDates(today, HABIT_HISTORY_DAYS, habit.completionRate, habit.title);
    const rows = doneDates.map((date) => ({ habit_id: data.id, date, done: true }));
    if (rows.length > 0) {
      const { error: logError } = await supabase.from("habit_logs").insert(rows);
      if (logError) throw new Error(`Historial de "${habit.title}": ${logError.message}`);
      logCount += rows.length;
    }
  }

  const { projects, tasks, calendarEvents } = buildDashboardActivityPlan(today);

  console.log(`Creando ${projects.length} proyectos activos…`);
  const projectIdByKey = new Map();
  for (const project of projects) {
    const { data, error } = await supabase
      .from("projects")
      .insert({
        title: project.title,
        description: project.description ?? null,
        status: project.status,
        area_id: project.areaKey ? areaIdByKey.get(project.areaKey) : null,
        goal_id: project.goalKey ? goalIdByKey.get(project.goalKey) : null,
        deadline: project.deadline ?? null,
        is_demo: true,
      })
      .select("id")
      .single();
    if (error) throw new Error(`Proyecto "${project.title}": ${error.message}`);
    projectIdByKey.set(project.key, data.id);
  }

  console.log(`Creando ${tasks.length} tareas (hoy, backlog y últimos 7 días)…`);
  let tasksDone = 0;
  for (const task of tasks) {
    const isDoneToday = task.status === "done" && task.scheduled_date;
    const { error } = await supabase.from("tasks").insert({
      title: task.title,
      status: task.status,
      priority: task.priority,
      scheduled_date: task.scheduled_date,
      deadline: task.deadline,
      estimated_minutes: task.estimatedMinutes ?? null,
      area_id: task.areaKey ? areaIdByKey.get(task.areaKey) : null,
      project_id: task.projectKey ? projectIdByKey.get(task.projectKey) : null,
      completed_at: isDoneToday ? zonedTimeToUtcIso(task.scheduled_date, "18:00", timezone) : null,
      is_demo: true,
    });
    if (error) throw new Error(`Tarea "${task.title}": ${error.message}`);
    if (task.status === "done") tasksDone++;
  }

  console.log(`Creando ${calendarEvents.length} eventos en la agenda de hoy…`);
  for (const ev of calendarEvents) {
    const startsAt = zonedTimeToUtcIso(today, ev.time, timezone);
    const endsAt = new Date(new Date(startsAt).getTime() + ev.durationMinutes * 60000).toISOString();
    const { error } = await supabase.from("calendar_events").insert({
      title: ev.title,
      starts_at: startsAt,
      ends_at: endsAt,
      is_demo: true,
    });
    if (error) throw new Error(`Evento "${ev.title}": ${error.message}`);
  }

  console.log("\nListo. Datos demo creados:");
  console.log(`  ${areas.length} áreas`);
  console.log(`  ${metaCount} metas, ${objetivoCount} objetivos`);
  console.log(`  ${habits.length} hábitos, ${logCount} registros de historial`);
  console.log(`  ${projects.length} proyectos activos`);
  console.log(`  ${tasks.length} tareas (${tasksDone} completadas, ${tasks.length - tasksDone} pendientes)`);
  console.log(`  ${calendarEvents.length} eventos en la agenda de hoy`);
  console.log("\nVisita /dashboard para verlos. Ejecuta `npm run seed:reset` para quitarlos.");
}

main().catch((err) => {
  console.error(`\nError: ${err.message}`);
  // process.exitCode (not process.exit()) — forcing immediate termination
  // while supabase-js's internal HTTP handle is still open crashes libuv on
  // Windows (UV_HANDLE_CLOSING assertion). This lets Node shut down cleanly.
  process.exitCode = 1;
});
