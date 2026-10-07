import { shiftIsoDate } from "@/lib/date";
import type { Inconsistency, Question } from "@/lib/domain/intelligence";
import type { ProposedItemInput } from "./change-sets";
import type { DetectedStructure, Interpretation, PlanInterpreter, StrategyContext } from "./interpreter";

/**
 * Intérprete determinista (sin IA) de un plan escrito con una plantilla
 * markdown. Sirve para (1) cargar planes hoy sin depender de Claude y
 * (2) probar de punta a punta la ingesta. No adivina: lo que la plantilla no
 * dice se convierte en pregunta o en supuesto marcado como tal (§18).
 *
 * Plantilla (secciones "## Nombre", primera línea = título, "- clave: valor"):
 *
 *   ---
 *   plan: Adquisición outbound 60 días
 *   inicio: 2026-10-07
 *   ---
 *   ## Objetivo        → título; - meta: 5 clientes; - plazo: 60 días; - métrica: closes
 *   ## Sistema         → título; - tipo: acquisition; - canal: social_outbound; - embudo: contacts, replies, …
 *   ## Hipótesis       → enunciado; - tipo: volume; - confianza: low; - base: medido|supuesto
 *   ## Rutina          → título; - métrica: contacts; - objetivo: 30 contactos; - cadencia: weekdays; - prioridad: p0
 *   ## Experimento     → nombre; - variable: …; - intervención: <rutina> = 60 durante 14 días; - métrica: replies; - muestra: 600
 *   ## Proyecto        → título
 *   ## Tareas          → "- [p0] Título: 840 prospectos" (cantidad opcional)
 */

export const TEMPLATE_INTERPRETER_VERSION = "template-v1";

type Section = { name: string; title: string | null; fields: Record<string, string>; bullets: string[] };

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

function parse(content: string): { front: Record<string, string>; sections: Map<string, Section> } {
  const front: Record<string, string> = {};
  const sections = new Map<string, Section>();
  let body = content.replace(/\r\n/g, "\n");
  const fm = body.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    for (const line of fm[1].split("\n")) {
      const m = line.match(/^\s*([^:]+):\s*(.+)$/);
      if (m) front[norm(m[1])] = m[2].trim();
    }
    body = body.slice(fm[0].length);
  }
  let current: Section | null = null;
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const h = line.match(/^##\s+(.+)$/);
    if (h) {
      current = { name: norm(h[1]), title: null, fields: {}, bullets: [] };
      sections.set(current.name, current);
      continue;
    }
    if (!current) continue;
    const b = line.match(/^-\s+(.+)$/);
    if (b) {
      current.bullets.push(b[1]);
      const kv = b[1].match(/^([^:[\]]+):\s*(.+)$/);
      if (kv) current.fields[norm(kv[1])] = kv[2].trim();
    } else if (current.title === null) {
      current.title = line;
    }
  }
  return { front, sections };
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const toSlug = (s: string) => norm(s).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
/** "5 clientes" → {value: 5, unit: "clientes"}; "60 días" → {60, días}. */
function quantity(s: string | undefined): { value: number; unit: string } | null {
  const m = s?.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  return m ? { value: Number(m[1].replace(",", ".")), unit: m[2].trim() } : null;
}

export class TemplateInterpreter implements PlanInterpreter {
  interpret(content: string, ctx: StrategyContext): Interpretation {
    const { front, sections } = parse(content);
    const inconsistencies: Inconsistency[] = [];
    const questions: Question[] = [];
    const issue = (code: string, message: string) => inconsistencies.push({ code, message, refs: [] });
    const ask = (id: string, question: string, options: string[] = []) => questions.push({ id, question, options, answer: null });

    const sec = (n: string) => sections.get(n) ?? null;
    const objective = sec("objetivo");
    const system = sec("sistema");
    const hypothesis = sec("hipotesis");
    const routine = sec("rutina");
    const experiment = sec("experimento");
    const project = sec("proyecto");
    const tasks = sec("tareas");

    const start = front["inicio"] && ISO.test(front["inicio"]) ? front["inicio"] : ctx.today;
    if (!front["inicio"]) issue("assumed_start", `Sin fecha de inicio: se asume hoy (${ctx.today}).`);
    const planName = front["plan"] ?? objective?.title ?? "Plan sin nombre";

    const funnel = (system?.fields["embudo"] ?? "")
      .split(",")
      .map((s) => toSlug(s))
      .filter(Boolean);
    const detected: DetectedStructure = {
      plan: planName,
      objective: objective?.title ?? null,
      system: system?.title ?? null,
      hypothesis: hypothesis?.title ?? null,
      experiment: experiment?.title ?? null,
      routines: routine?.title ? [routine.title] : [],
      project: project?.title ?? null,
      tasks: tasks?.bullets ?? [],
      metrics: funnel,
      roadmap: [],
    };

    // Meta: un plan nunca crea ni reemplaza la meta principal (§11).
    if (!ctx.goal) {
      ask("goal_missing", "No hay meta principal: ¿a qué meta pertenece este plan? Créala primero (el plan no puede definir la meta).");
    }
    if (!objective?.title) issue("objective_missing", "El plan no declara un objetivo (## Objetivo).");
    const target = quantity(objective?.fields["meta"]);
    if (objective && !target) issue("objective_target_missing", "El objetivo no tiene cantidad (- meta: 5 clientes).");
    const term = quantity(objective?.fields["plazo"]);
    const deadline = term ? shiftIsoDate(start, Math.round(term.value) - 1) : null;

    // Sistema: si ya existe uno con el mismo nombre se reutiliza (P-15: no se duplica).
    const existingSystem = system?.title ? ctx.systems.find((s) => norm(s.title) === norm(system.title!)) : undefined;
    if (existingSystem) ask("system_reused", `Ya existe el sistema "${existingSystem.title}": se reutiliza en vez de crear otro. ¿Correcto?`, ["Sí", "Crear uno nuevo"]);

    // Base de la hipótesis: medida o supuesta (§18).
    const baseKind = norm(hypothesis?.fields["base"] ?? "");
    const baseAssumption = baseKind.startsWith("medid") ? "known" : "assumed";
    if (hypothesis && !hypothesis.fields["base"]) {
      ask("baseline_kind", "El valor base de la rutina, ¿es un dato medido o un supuesto?", ["Medido", "Supuesto"]);
    }

    // Experimento → intervención sobre la rutina.
    const interv = experiment?.fields["intervencion"]?.match(/^(.+?)\s*=\s*(\d+(?:[.,]\d+)?)\s*durante\s*(\d+)\s*d/i) ?? null;
    const routineTarget = quantity(routine?.fields["objetivo"]);
    if (experiment && !interv) issue("intervention_unparsed", 'La intervención no se entendió (formato: "<rutina> = 60 durante 14 días").');
    if (interv && routine?.title && norm(interv[1]) !== norm(routine.title)) {
      issue("intervention_target_unknown", `La intervención apunta a "${interv[1]}", que no es la rutina del plan ("${routine.title}").`);
    }
    const expDays = interv ? Number(interv[3]) : null;
    const expEnd = expDays ? shiftIsoDate(start, expDays - 1) : null;
    if (expEnd && deadline && expEnd > deadline) issue("experiment_beyond_deadline", "El experimento dura más que el plazo del objetivo.");

    // Tareas: se validan siempre (aunque el plan no pueda proponerse) para reportar todo de una vez.
    const parsedTasks: { tier: string; title: string; qty: number | null; unit: string | null }[] = [];
    for (const b of tasks?.bullets ?? []) {
      const m = b.match(/^\[(p[012])\]\s*(.+?)(?::\s*(\d+(?:[.,]\d+)?)\s*(.*))?$/i);
      if (!m) {
        issue("task_unparsed", `Tarea sin nivel P (formato "- [p0] Título: 30 unidad"): "${b}".`);
        continue;
      }
      parsedTasks.push({ tier: m[1].toLowerCase(), title: m[2].trim(), qty: m[3] ? Number(m[3].replace(",", ".")) : null, unit: m[3] ? m[4]?.trim() || "unidades" : null });
    }

    if (!ctx.goal || !objective?.title || !target || inconsistencies.some((i) => i.code === "intervention_target_unknown")) {
      return { interpreter: "template", interpreterVersion: TEMPLATE_INTERPRETER_VERSION, detected, inconsistencies, questions, changeSet: null };
    }

    // ---- Change set ----------------------------------------------------------
    const items: ProposedItemInput[] = [];
    const add = (p: Omit<ProposedItemInput, "seq" | "entity_id" | "depends_on"> & { depends_on?: string[] }) =>
      items.push({ seq: items.length + 1, entity_id: null, depends_on: [], ...p, temp_ref: p.temp_ref ?? null });

    add({
      op: "create",
      entity_type: "objective",
      temp_ref: "$obj",
      sensitivity: "strategic",
      payload: {
        goal_id: ctx.goal.id,
        title: objective.title,
        unit: target.unit || "unidades",
        target_value: target.value,
        deadline,
        metric_key: objective.fields["metrica"] ? toSlug(objective.fields["metrica"]) : null,
      },
    });

    const sysRef = existingSystem ? existingSystem.id : "$sys";
    if (system?.title && !existingSystem) {
      add({
        op: "create",
        entity_type: "system",
        temp_ref: "$sys",
        sensitivity: "strategic",
        payload: { title: system.title, type: system.fields["tipo"] ?? "other", status: "active" },
      });
    }
    if (system?.title) add({ op: "create", entity_type: "objective_system", sensitivity: "normal", payload: { objective_id: "$obj", system_id: sysRef } });

    // Métricas del embudo como datos (P-14): primera = input, última = output, intermedias = proceso.
    funnel.forEach((key, i) => {
      if (ctx.metricKeys.includes(key)) return;
      const category = i === 0 ? "input" : i === funnel.length - 1 ? "output" : "process";
      add({ op: "create", entity_type: "metric_definition", temp_ref: `$m_${key}`, sensitivity: "normal", payload: { key, label: key, category, unit: "n", system_id: system?.title ? sysRef : null } });
    });
    if (system?.title && funnel.length >= 2) {
      add({
        op: "create",
        entity_type: "funnel",
        sensitivity: "strategic",
        payload: { system_id: sysRef, name: system.title, channel: system.fields["canal"] ?? "other", stages: funnel.map((k) => ({ metric_key: k, label: k })) },
      });
    }

    if (hypothesis?.title) {
      add({
        op: "create",
        entity_type: "hypothesis",
        temp_ref: "$hyp",
        sensitivity: "strategic",
        payload: {
          type: hypothesis.fields["tipo"] ?? "other",
          statement: hypothesis.title,
          goal_id: ctx.goal.id,
          objective_id: "$obj",
          system_id: system?.title ? sysRef : null,
          mechanism: hypothesis.fields["mecanismo"] ?? null,
          confidence_level: hypothesis.fields["confianza"] ?? "low",
          assumptions: routineTarget
            ? [{ statement: `Valor base de "${routine?.title}": ${routineTarget.value} ${routineTarget.unit}/día`, assumption_type: baseAssumption }]
            : [],
        },
      });
    }

    if (routine?.title && routineTarget && system?.title) {
      add({
        op: "create",
        entity_type: "routine",
        temp_ref: "$rt",
        sensitivity: "normal",
        payload: {
          system_id: sysRef,
          title: routine.title,
          metric_key: toSlug(routine.fields["metrica"] ?? funnel[0] ?? "acciones"),
          target_per_occurrence: routineTarget.value,
          unit: routineTarget.unit || "unidades",
          cadence: routine.fields["cadencia"] ?? "daily",
          tier: routine.fields["prioridad"] ?? "p0",
          valid_from: start,
          valid_to: deadline,
        },
      });
    }

    if (experiment?.title && interv && routineTarget) {
      add({
        op: "create",
        entity_type: "experiment",
        sensitivity: "strategic",
        payload: {
          name: experiment.title,
          hypothesis_id: hypothesis?.title ? "$hyp" : null,
          system_id: system?.title ? sysRef : null,
          variable: experiment.fields["variable"] ?? null,
          metric_key: toSlug(experiment.fields["metrica"] ?? funnel[1] ?? "resultado"),
          baseline_value: routineTarget.value,
          target_value: Number(interv[2].replace(",", ".")),
          sample_target: Number(experiment.fields["muestra"] ?? 100),
          observation_window_days: expDays,
          status: "running",
          started_on: start,
          interventions: [
            { target_type: "routine", target_id: "$rt", field: "target_per_occurrence", baseline: routineTarget.value, value: Number(interv[2].replace(",", ".")), from: start, to: expEnd },
          ],
        },
      });
    }

    // Roadmap derivado: fase de experimento + fase de ejecución hasta el plazo.
    const phases: { name: string; from: string; to: string }[] = [];
    if (expEnd && deadline && expEnd < deadline) {
      phases.push({ name: `Experimento: ${experiment?.title}`, from: start, to: expEnd });
      phases.push({ name: "Ejecución con la decisión del experimento", from: shiftIsoDate(expEnd, 1), to: deadline });
    } else if (deadline) {
      phases.push({ name: `Ejecución: ${planName}`, from: start, to: deadline });
    }
    phases.forEach((p, i) =>
      add({
        op: "create",
        entity_type: "roadmap_phase",
        sensitivity: "strategic",
        payload: { goal_id: ctx.goal!.id, hypothesis_id: hypothesis?.title ? "$hyp" : null, seq: i + 1, name: p.name, start_date: p.from, expected_end: p.to },
      })
    );
    detected.roadmap = phases.map((p) => `${p.name} (${p.from} → ${p.to})`);

    if (project?.title) {
      add({
        op: "create",
        entity_type: "project",
        temp_ref: "$prj",
        sensitivity: "normal",
        payload: { title: project.title, objective_id: "$obj", system_id: system?.title ? sysRef : null, start_date: start, deadline, status: "activo" },
      });
    }
    for (const t of parsedTasks) {
      add({
        op: "create",
        entity_type: "task",
        sensitivity: "normal",
        payload: {
          title: t.title,
          tier: t.tier,
          project_id: project?.title ? "$prj" : null,
          system_id: system?.title ? sysRef : null,
          ...(t.qty !== null ? { target_qty: t.qty, unit: t.unit } : {}),
        },
      });
    }

    return {
      interpreter: "template",
      interpreterVersion: TEMPLATE_INTERPRETER_VERSION,
      detected,
      inconsistencies,
      questions,
      changeSet: {
        title: `Plan: ${planName}`,
        rationale: hypothesis?.title ?? objective.title,
        items,
        decision: {
          title: `Adoptar el plan "${planName}"`,
          problem: `Convertir el plan en estructura operativa para "${objective.title}".`,
          change: `Objetivo, sistema, hipótesis, rutina${experiment ? ", experimento" : ""}, roadmap, proyecto y tareas según el documento fuente.`,
          reason: hypothesis?.title ?? "Plan aportado por el usuario.",
        },
      },
    };
  }
}
