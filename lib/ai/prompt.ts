import type { MasterContext } from "./context";

const GROUNDING_RULES = `Eres el asistente de System IOS, el sistema operativo personal de {NAME}. Tu trabajo es ayudarle a mantenerse alineado con sus metas reales — personales y de su agencia VANT — entendiendo su situación actual y ayudándole a priorizar.

Reglas estrictas, no negociables:
1. Solo puedes afirmar cosas respaldadas por el CONTEXTO REAL de abajo. Si algo no está ahí, no lo inventes ni lo asumas.
2. Si te falta información para responder algo con seguridad, dilo explícitamente: "No tengo suficiente información para determinar esto" — y si aplica, pregúntalo.
3. Nunca des una recomendación genérica de productividad sin conectarla a una meta, proyecto o dato concreto del contexto. Si no hay ningún dato con el que conectarla, no la des.
4. No cambies ni des por hecho un cambio a una meta existente sin que el usuario lo confirme explícitamente en la conversación — tú propones, él aprueba.
5. Cuando estés indagando la situación del usuario, haz una pregunta a la vez — no listes varias preguntas de golpe.
6. Sé directo y breve. Nada de relleno motivacional genérico.`;

function formatGoals(context: MasterContext): string {
  if (context.goals.length === 0) return "Ninguna meta registrada todavía.";

  const byParent = new Map<string | null, MasterContext["goals"]>();
  for (const g of context.goals) {
    const key = g.parent_goal_id;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(g);
  }
  const areaName = (id: string | null) => context.areas.find((a) => a.id === id)?.name ?? null;

  function line(g: MasterContext["goals"][number], indent: string): string {
    const parts = [`${indent}- "${g.title}"`, `[${g.horizon}/${g.kind}, ${g.status}, prioridad ${g.priority}]`];
    if (g.target_value !== null) {
      parts.push(`objetivo: ${g.current_value ?? 0}/${g.target_value}${g.unit ? ` ${g.unit}` : ""}`);
    }
    if (g.deadline) parts.push(`vence: ${g.deadline}`);
    const area = areaName(g.area_id);
    if (area) parts.push(`área: ${area}`);
    let out = parts.join(" · ");
    if (g.description) out += `\n${indent}  ${g.description}`;
    return out;
  }

  const topLevel = byParent.get(null) ?? [];
  const lines: string[] = [];
  for (const g of topLevel) {
    lines.push(line(g, ""));
    for (const child of byParent.get(g.id) ?? []) {
      lines.push(line(child, "  "));
    }
  }
  return lines.join("\n");
}

function formatAgencia(context: MasterContext): string {
  const { agencia, goals } = context;
  const lines: string[] = [];

  const linkedGoal = agencia.vantGoalId ? goals.find((g) => g.id === agencia.vantGoalId) : null;
  lines.push(
    linkedGoal
      ? `Meta de VANT enlazada: "${linkedGoal.title}"`
      : "Sin meta de VANT enlazada en agencia_settings."
  );

  if (agencia.campaigns.length === 0) {
    lines.push("Sin campañas registradas.");
  } else {
    lines.push("Campañas:");
    for (const c of agencia.campaigns) {
      lines.push(
        `  - "${c.name}" [${c.status}] · gasto: ${c.spend} · leads: ${c.leads} (${c.qualified_leads} calificados) · llamadas: ${c.calls_attended} atendidas / ${c.calls_scheduled} agendadas${c.calls_goal ? ` (meta: ${c.calls_goal})` : ""}`
      );
    }
  }

  if (agencia.prospectingSessions.length === 0) {
    lines.push("Sin sesiones de prospección registradas.");
  } else {
    lines.push("Prospección reciente:");
    for (const p of agencia.prospectingSessions) {
      lines.push(
        `  - ${p.date} · ${p.channel} · ${p.contacts_count} contactos, ${p.replies_count} respuestas, ${p.appointments_count} citas, ${p.clients_closed} cerrados`
      );
    }
  }

  lines.push(
    agencia.clients.length === 0
      ? "Sin clientes activos de VANT registrados."
      : `Clientes: ${agencia.clients.map((c) => `${c.name} (${c.status})`).join(", ")}`
  );

  return lines.join("\n");
}

export function buildSystemPrompt(context: MasterContext): string {
  const name = context.profile.fullName ?? "el usuario";
  const vision = context.vision?.statement
    ? context.vision.statement
    : "Vacío — todavía no ha definido su visión/identidad/principios en el sistema.";
  const areas = context.areas.length > 0 ? context.areas.map((a) => a.name).join(", ") : "Ninguna área de vida definida todavía.";
  const habits =
    context.habits.length > 0
      ? context.habits.map((h) => `${h.title} (${h.frequency})`).join(", ")
      : "Ninguno.";
  const tasksToday =
    context.tasksToday.length > 0
      ? context.tasksToday.map((t) => `${t.title} [${t.status}, prioridad ${t.priority}]`).join("; ")
      : "Ninguna tarea programada para hoy.";
  const reviews =
    context.recentReviews.length > 0
      ? context.recentReviews.map((r) => `${r.type} (${r.period_start} a ${r.period_end})`).join(", ")
      : "Ninguna revisión registrada todavía.";

  return `${GROUNDING_RULES.replace("{NAME}", name)}

CONTEXTO REAL (Supabase, a fecha de hoy — zona horaria ${context.profile.timezone}):

Visión / identidad:
${vision}

Áreas de vida: ${areas}

Metas (jerarquía; las que tienen sangría son sub-metas de la de arriba):
${formatGoals(context)}

VANT / Agencia:
${formatAgencia(context)}

Hábitos activos: ${habits}

Tareas de hoy: ${tasksToday}

Revisiones recientes: ${reviews}`;
}
