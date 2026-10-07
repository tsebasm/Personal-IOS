import { z } from "zod";
import { ref, TEMP_REF_RE, type FkSchema } from "./common";
import {
  decisionShape,
  EXPERIMENT_MSG,
  experimentCheck,
  experimentObject,
  funnelShape,
  goalShape,
  hypothesisShape,
  ideaShape,
  identityRuleShape,
  metricDefinitionShape,
  milestoneShape,
  objectiveShape,
  objectiveSystemShape,
  projectDependencyShape,
  projectShape,
  ROADMAP_MSG,
  roadmapPhaseCheck,
  roadmapPhaseObject,
  sopShape,
  systemShape,
} from "./strategy";
import {
  dailyLogShape,
  evidenceShape,
  habitShape,
  METRIC_ENTRY_MSG,
  metricEntryCheck,
  metricEntryObject,
  ROUTINE_MSG,
  routineCheck,
  routineObject,
  TASK_MSG,
  taskCheck,
  taskObject,
} from "./execution";
import { FX_RATE_MSG, fxRateCheck, fxRateObject, REVENUE_RECEIPT_MSG, revenueReceiptCheck, revenueReceiptObject } from "./finance";
import type { ChangeItem, Inconsistency, Sensitivity } from "./intelligence";

/**
 * Registro único de entidades que un change set puede crear o modificar
 * (P-10). Cada propuesta se valida con el mismo shape que la fila real, con
 * FKs que aceptan referencias temporales ($ref) a otros ítems del change set.
 */

type Layer = "strategy" | "execution";
type EntitySpec = {
  table: string;
  layer: Layer;
  shape: (fk: FkSchema) => z.ZodObject<z.ZodRawShape>;
  /** Sensibilidad por defecto según la operación (la de update puede endurecerse con datos, p. ej. meta bloqueada). */
  sensitivity: Record<"create" | "update" | "archive", Sensitivity>;
  /**
   * §6: Claude no puede inventar resultados ni reescribir historia. Los datos
   * observados (métricas, evidencia, registros diarios) solo los registra el
   * usuario o una fuente de datos, nunca una propuesta de Claude.
   */
  claudeMayPropose: boolean;
  /** Validación cruzada de campos que se exige al crear (misma que la fila real). */
  check?: { fn: (v: any) => boolean; message: string };
};

const S = (create: Sensitivity, update: Sensitivity = create, archive: Sensitivity = update) => ({ create, update, archive });

export const ENTITY_REGISTRY = {
  // Capa 1 — estrategia
  goal: { table: "goals", layer: "strategy", shape: goalShape, sensitivity: S("strategic", "locked"), claudeMayPropose: true },
  objective: { table: "objectives", layer: "strategy", shape: objectiveShape, sensitivity: S("strategic"), claudeMayPropose: true },
  system: { table: "systems", layer: "strategy", shape: systemShape, sensitivity: S("strategic"), claudeMayPropose: true },
  objective_system: { table: "objective_systems", layer: "strategy", shape: objectiveSystemShape, sensitivity: S("normal", "normal", "strategic"), claudeMayPropose: true },
  metric_definition: { table: "metric_definitions", layer: "strategy", shape: metricDefinitionShape, sensitivity: S("normal", "strategic"), claudeMayPropose: true },
  funnel: { table: "funnels", layer: "strategy", shape: funnelShape, sensitivity: S("strategic"), claudeMayPropose: true },
  hypothesis: { table: "hypotheses", layer: "strategy", shape: hypothesisShape, sensitivity: S("strategic"), claudeMayPropose: true },
  roadmap_phase: { table: "roadmap_phases", layer: "strategy", shape: roadmapPhaseObject, sensitivity: S("strategic"), claudeMayPropose: true, check: { fn: roadmapPhaseCheck, message: ROADMAP_MSG } },
  project: { table: "projects", layer: "strategy", shape: projectShape, sensitivity: S("normal", "normal", "strategic"), claudeMayPropose: true },
  project_dependency: { table: "project_dependencies", layer: "strategy", shape: projectDependencyShape, sensitivity: S("normal"), claudeMayPropose: true },
  milestone: { table: "milestones", layer: "strategy", shape: milestoneShape, sensitivity: S("normal"), claudeMayPropose: true },
  experiment: { table: "experiments", layer: "strategy", shape: experimentObject, sensitivity: S("strategic"), claudeMayPropose: true, check: { fn: experimentCheck, message: EXPERIMENT_MSG } },
  decision: { table: "decisions", layer: "strategy", shape: decisionShape, sensitivity: S("strategic", "locked"), claudeMayPropose: true },
  sop: { table: "sops", layer: "strategy", shape: sopShape, sensitivity: S("strategic"), claudeMayPropose: true },
  identity_rule: { table: "identity_rules", layer: "strategy", shape: identityRuleShape, sensitivity: S("strategic", "locked"), claudeMayPropose: true },
  idea: { table: "ideas", layer: "strategy", shape: ideaShape, sensitivity: S("normal"), claudeMayPropose: true },
  // Capa 2 — ejecución
  routine: { table: "routines", layer: "execution", shape: routineObject, sensitivity: S("normal", "strategic"), claudeMayPropose: true, check: { fn: routineCheck, message: ROUTINE_MSG } },
  task: { table: "tasks", layer: "execution", shape: taskObject, sensitivity: S("normal"), claudeMayPropose: true, check: { fn: taskCheck, message: TASK_MSG } },
  habit: { table: "habits", layer: "execution", shape: habitShape, sensitivity: S("normal"), claudeMayPropose: true },
  evidence: { table: "evidence", layer: "execution", shape: evidenceShape, sensitivity: S("normal", "locked"), claudeMayPropose: false },
  metric_entry: { table: "metric_entries", layer: "execution", shape: metricEntryObject, sensitivity: S("normal", "locked"), claudeMayPropose: false, check: { fn: metricEntryCheck, message: METRIC_ENTRY_MSG } },
  daily_log: { table: "daily_logs", layer: "execution", shape: dailyLogShape, sensitivity: S("normal", "locked"), claudeMayPropose: false },
  // Dato financiero de referencia (C-1): lo registra el usuario, nunca Claude.
  fx_rate: { table: "fx_rates", layer: "execution", shape: fxRateObject, sensitivity: S("normal", "locked"), claudeMayPropose: false, check: { fn: fxRateCheck, message: FX_RATE_MSG } },
  // Dinero recibido (C-1): dato observado; Claude nunca lo propone.
  revenue_receipt: { table: "revenue_receipts", layer: "execution", shape: revenueReceiptObject, sensitivity: S("normal", "locked"), claudeMayPropose: false, check: { fn: revenueReceiptCheck, message: REVENUE_RECEIPT_MSG } },
} satisfies Record<string, EntitySpec>;

export type EntityType = keyof typeof ENTITY_REGISTRY;
export const ENTITY_TYPES = Object.keys(ENTITY_REGISTRY) as EntityType[];

export function isEntityType(v: string): v is EntityType {
  return v in ENTITY_REGISTRY;
}

/** Esquema con el que se valida el payload de una propuesta. */
export function proposalSchema(entityType: EntityType, op: "create" | "update"): z.ZodTypeAny {
  const spec: EntitySpec = ENTITY_REGISTRY[entityType];
  const obj = spec.shape(ref).strict();
  if (op === "update") return obj.partial();
  return spec.check ? obj.refine(spec.check.fn, spec.check.message) : obj;
}

/** Referencias temporales ($ref) usadas en cualquier parte de un payload. */
export function tempRefsIn(value: unknown, acc: Set<string> = new Set()): Set<string> {
  if (typeof value === "string") {
    if (TEMP_REF_RE.test(value)) acc.add(value);
  } else if (Array.isArray(value)) {
    value.forEach((v) => tempRefsIn(v, acc));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((v) => tempRefsIn(v, acc));
  }
  return acc;
}

type ProposedItem = Pick<ChangeItem, "seq" | "op" | "entity_type" | "entity_id" | "temp_ref" | "payload" | "depends_on" | "sensitivity">;

export type ChangeSetValidation = {
  ok: boolean;
  errors: Inconsistency[];
  /** Orden de aplicación (seq) respetando dependencias; null si hay ciclo. */
  order: number[] | null;
};

/**
 * Validación estructural de un change set completo, antes de mostrarlo para
 * aprobación (función pura; no consulta la base de datos):
 *  - entidad conocida y operación coherente (create sin entity_id, update/archive con él);
 *  - payload válido contra el shape de dominio (mismas reglas que la fila real);
 *  - temp_refs únicos y toda referencia resoluble dentro del set;
 *  - sin ciclos de dependencia (devuelve el orden topológico);
 *  - sensibilidad nunca menor que la del registro; 'locked' no se puede proponer;
 *  - Claude no propone datos observados (§6).
 */
export function validateChangeSet(items: ProposedItem[], proposedBy: "user" | "claude" | "system"): ChangeSetValidation {
  const errors: Inconsistency[] = [];
  const err = (code: string, message: string, refs: string[] = []) => errors.push({ code, message, refs });
  const rank: Record<Sensitivity, number> = { normal: 0, strategic: 1, locked: 2 };

  const declared = new Map<string, number>();
  for (const it of items) {
    if (!it.temp_ref) continue;
    if (declared.has(it.temp_ref)) err("duplicate_temp_ref", `Referencia temporal repetida: ${it.temp_ref}.`, [it.temp_ref]);
    else declared.set(it.temp_ref, it.seq);
  }

  const deps = new Map<number, Set<number>>();
  for (const it of items) {
    const where = `ítem ${it.seq}`;
    deps.set(it.seq, new Set());
    if (!isEntityType(it.entity_type)) {
      err("unknown_entity", `${where}: entidad desconocida "${it.entity_type}".`);
      continue;
    }
    const spec = ENTITY_REGISTRY[it.entity_type];

    if (it.op === "create" && it.entity_id) err("create_with_id", `${where}: un create no lleva entity_id.`);
    if (it.op !== "create" && !it.entity_id) err("missing_entity_id", `${where}: ${it.op} necesita entity_id.`);
    if (it.op !== "create" && it.temp_ref) err("temp_ref_on_existing", `${where}: solo un create declara temp_ref.`);

    const required = spec.sensitivity[it.op];
    if (rank[it.sensitivity] < rank[required]) {
      err("sensitivity_too_low", `${where}: ${it.entity_type}.${it.op} es '${required}', no '${it.sensitivity}'.`);
    }
    if (required === "locked" || it.sensitivity === "locked") {
      err("locked_change", `${where}: ${it.entity_type}.${it.op} es un cambio bloqueado; requiere su flujo propio (p. ej. cambio de meta, §11).`);
    }
    if (proposedBy === "claude" && !spec.claudeMayPropose) {
      err("claude_cannot_propose_data", `${where}: Claude no puede proponer ${it.entity_type} (datos observados, §6).`);
    }

    if (it.op !== "archive") {
      const parsed = proposalSchema(it.entity_type, it.op).safeParse(it.payload);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          err("invalid_payload", `${where} (${it.entity_type}): ${issue.path.join(".") || "payload"} — ${issue.message}`);
        }
      }
    } else if (Object.keys(it.payload ?? {}).length > 0) {
      err("archive_with_payload", `${where}: archive no lleva payload.`);
    }

    for (const r of new Set([...tempRefsIn(it.payload), ...it.depends_on])) {
      const target = declared.get(r);
      if (target === undefined) err("unresolved_ref", `${where}: ${r} no está declarado en este change set.`, [r]);
      else if (target !== it.seq) deps.get(it.seq)!.add(target);
      else err("self_ref", `${where}: se referencia a sí mismo (${r}).`, [r]);
    }
  }

  const order = topoOrder(deps);
  if (!order) err("dependency_cycle", "Hay un ciclo de dependencias entre los ítems.");
  return { ok: errors.length === 0, errors, order };
}

/** Kahn: orden estable por seq; null si hay ciclo. */
export function topoOrder(deps: Map<number, Set<number>>): number[] | null {
  const pending = new Map([...deps].map(([k, v]) => [k, new Set(v)]));
  const out: number[] = [];
  while (pending.size > 0) {
    const ready = [...pending].filter(([, d]) => [...d].every((x) => !pending.has(x))).map(([k]) => k).sort((a, b) => a - b);
    if (ready.length === 0) return null;
    for (const k of ready) {
      out.push(k);
      pending.delete(k);
    }
  }
  return out;
}
