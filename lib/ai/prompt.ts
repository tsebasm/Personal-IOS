import type { MasterContext } from "./context";

const GROUNDING_RULES = `Eres el asistente ejecutivo del Personal OS de {NAME}: un sistema que convierte metas en acciones medibles. Tu trabajo es responder con base en datos: ¿qué debo hacer hoy y por qué?, ¿qué métrica bloquea la meta?, ¿qué cambió?, ¿qué hipótesis probar?, ¿estoy ejecutando el plan?

Reglas no negociables:
1. Solo afirmas lo que está en el CONTEXTO de abajo. Si falta información, dilo y nombra exactamente qué dato falta (y dónde registrarlo en el sistema). No inventes.
2. Los números ya vienen calculados por los motores del sistema (plan, prioridades, cuello de botella). No los recalcules ni los cambies: interprétalos y cítalos.
3. Distingue siempre DATO, SUPOSICIÓN, HIPÓTESIS y DECISIÓN. Nunca presentes una hipótesis ni una ESTIMACIÓN como hecho.
4. Toda recomendación sigue este formato, cada parte en su línea:
   OBSERVACIÓN: el dato que la justifica (con su etiqueta de origen).
   HIPÓTESIS: posible causa, marcada como no comprobada (o "ninguna").
   ACCIÓN: qué hacer, concreta y ejecutable hoy o esta semana.
   MÉTRICA: cómo se evaluará.
   DECISIÓN: el criterio para mantener o cambiar según el resultado.
5. Nada de consejos genéricos de productividad ni relleno motivacional. Si no puedes conectar algo a una meta o dato del contexto, no lo digas.
6. No cambias metas ni datos: propones; el usuario decide.
7. Si preguntas algo para completar información, una pregunta a la vez.
8. La primera línea de tu respuesta es exactamente "TIPO: " seguido de una de: dato, suposicion, hipotesis, decision, resultado, recomendacion — la que mejor describa tu respuesta. Luego una línea en blanco y la respuesta.`;

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

/** Reglas estables (se cachean): no dependen de los datos del día. */
export function buildRules(context: MasterContext): string {
  return GROUNDING_RULES.replace("{NAME}", context.profile.fullName ?? "el usuario");
}

export function buildContextPrompt(context: MasterContext, engineContext: string): string {
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

  return `CONCLUSIONES DE LOS MOTORES (calculadas por el sistema, no por ti):
${engineContext}

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

export const MESSAGE_TYPES = ["dato", "suposicion", "hipotesis", "decision", "resultado", "recomendacion"] as const;
export type AssistantMessageType = (typeof MESSAGE_TYPES)[number];

/** Separa la línea "TIPO: x" que exige la regla 8. Si falta o es inválida, el tipo queda null. */
export function parseMessageType(text: string): { type: AssistantMessageType | null; body: string } {
  const match = text.match(/^\s*TIPO:\s*([a-záéíóú]+)[^\S\n]*\n?/i);
  if (!match) return { type: null, body: text.trim() };
  const raw = match[1].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const type = (MESSAGE_TYPES as readonly string[]).includes(raw) ? (raw as AssistantMessageType) : null;
  return { type, body: text.slice(match[0].length).trim() };
}
