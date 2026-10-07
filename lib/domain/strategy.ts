import { z } from "zod";
import {
  assumptionType,
  confidenceLevel,
  currencyCode,
  isoDate,
  metricKey,
  optText,
  rowOf,
  text,
  textList,
  timestamp,
  type FkSchema,
  actor,
  METRIC_CATEGORIES,
} from "./common";

/**
 * CAPA 1 — ESTRATEGIA (PHASE-A-DESIGN.md §2).
 * Jerarquía: IDENTIDAD → META → OBJETIVOS ⇄ SISTEMAS → PROYECTOS (→ tareas, capa 2).
 * Hipótesis, experimentos y roadmap cuelgan de meta/objetivo/sistema.
 */

const num = z.number().finite();
const optNum = num.nullable().default(null);

// META (L0) §10–11, §56 ------------------------------------------------------

/**
 * §56: estados de activación de una meta (BLOQUEADA = aún no puede activarse).
 * Es un concepto distinto del bloqueo de §11 (meta activa inmutable), que se
 * modela con `locked_at`. Ver contradicción C-A2 en el informe de A1.
 */
export const GOAL_ACTIVATION_STATES = ["blocked", "queued", "active", "completed", "archived"] as const;

export const goalShape = (fk: FkSchema) =>
  z.object({
    title: text,
    description: optText,
    /** Unidad de medida ("USD", "clientes", "kg"…). */
    unit: text,
    /** Si la meta es monetaria, su moneda principal. Nunca se reemplaza por una conversión. */
    currency: currencyCode.nullable().default(null),
    baseline_value: num.default(0),
    target_value: num,
    current_value: optNum,
    /** KPI que mide la meta (metric_definitions.key). */
    kpi_metric_key: metricKey.nullable().default(null),
    /** Cómo se calcula el valor actual a partir del KPI (texto declarativo). */
    formula: optText,
    start_date: isoDate,
    deadline: isoDate,
    activation_state: z.enum(GOAL_ACTIVATION_STATES).default("queued"),
    /** §11: no nulo = meta bloqueada; solo cambia vía flujo de cambio de meta + decisión. */
    locked_at: timestamp.nullable().default(null),
    success_criteria: optText,
    failure_criteria: optText,
    area_id: fk.nullable().default(null),
  });

// OBJETIVOS (L1) §12–13 (P-1) -------------------------------------------------

export const OBJECTIVE_STATUSES = ["active", "paused", "completed", "cancelled"] as const;

export const objectiveShape = (fk: FkSchema) =>
  z.object({
    goal_id: fk,
    title: text,
    description: optText,
    metric_key: metricKey.nullable().default(null),
    unit: text,
    currency: currencyCode.nullable().default(null),
    target_value: num,
    current_value: optNum,
    deadline: isoDate.nullable().default(null),
    /** §12: "qué debe ser matemáticamente cierto" para que la meta ocurra. */
    formula: optText,
    status: z.enum(OBJECTIVE_STATUSES).default("active"),
  });

// SISTEMAS (L2) §23 -----------------------------------------------------------

export const SYSTEM_TYPES = ["acquisition", "sales", "fulfillment", "learning", "health", "finance", "university", "review", "other"] as const;
export const SYSTEM_STATUSES = ["designing", "active", "paused", "retired"] as const;

export const systemShape = (_fk: FkSchema) =>
  z.object({
    title: text,
    type: z.enum(SYSTEM_TYPES),
    purpose: optText,
    status: z.enum(SYSTEM_STATUSES).default("designing"),
    owner: optText,
  });

/** P-15: un sistema sirve a varios objetivos y viceversa. */
export const objectiveSystemShape = (fk: FkSchema) =>
  z.object({
    objective_id: fk,
    system_id: fk,
    contribution: optText,
  });

// MÉTRICAS como datos (P-4, P-14) -------------------------------------------

export const METRIC_AGGREGATIONS = ["sum", "last", "avg", "max"] as const;

export const metricDefinitionShape = (fk: FkSchema) =>
  z.object({
    key: metricKey,
    label: text,
    description: optText,
    category: z.enum(METRIC_CATEGORIES),
    unit: text,
    currency: currencyCode.nullable().default(null),
    aggregation: z.enum(METRIC_AGGREGATIONS).default("sum"),
    system_id: fk.nullable().default(null),
    /** Denominador mínimo para tratar una tasa derivada como dato histórico. */
    min_sample: z.number().int().positive().nullable().default(null),
  });

// FUNNELS §13–14 (P-14) -------------------------------------------------------

export const FUNNEL_CHANNELS = ["cold_calling", "cold_email", "social_outbound", "meta_ads", "google_ads", "referrals", "other"] as const;

export const funnelShape = (fk: FkSchema) =>
  z.object({
    system_id: fk,
    name: text,
    channel: z.enum(FUNNEL_CHANNELS),
    /** Etapas ordenadas; cada tasa = etapa[i+1] ÷ etapa[i]. */
    stages: z
      .array(z.object({ metric_key: metricKey, label: text }))
      .min(2, "Un funnel necesita al menos 2 etapas.")
      .refine((s) => new Set(s.map((x) => x.metric_key)).size === s.length, "Etapas repetidas en el funnel."),
  });

// HIPÓTESIS §15–19 -------------------------------------------------------------

export const HYPOTHESIS_TYPES = ["niche", "market", "offer", "message", "channel", "volume", "other"] as const;
export const HYPOTHESIS_TEST_STATUSES = ["untested", "testing", "validated", "rejected"] as const;
export const RISK_KINDS = ["financial", "time", "execution", "market", "skill", "dependency", "opportunity_cost"] as const;

/** Valor de un supuesto con su tipo (§18): nunca se presenta un supuesto como hecho. */
const assumedValue = z.object({ value: num, assumption_type: assumptionType });
const scenario = z.record(metricKey, assumedValue);

export const hypothesisShape = (fk: FkSchema) =>
  z.object({
    type: z.enum(HYPOTHESIS_TYPES),
    statement: text,
    goal_id: fk.nullable().default(null),
    objective_id: fk.nullable().default(null),
    system_id: fk.nullable().default(null),
    problem: optText,
    market: optText,
    icp: optText,
    offer: optText,
    channel: optText,
    mechanism: optText,
    /** §16–17: BEAR/BASE/BULL por métrica (tasas e inputs). ACTUAL se deriva de los datos, no se guarda. */
    scenarios: z.object({ bear: scenario.optional(), base: scenario.optional(), bull: scenario.optional() }).default({}),
    expected_revenue: optNum,
    timeline: optText,
    assumptions: z.array(z.object({ statement: text, assumption_type: assumptionType })).default([]),
    risks: z.array(z.object({ kind: z.enum(RISK_KINDS), description: text })).default([]),
    confidence_level: confidenceLevel.default("low"),
    test_status: z.enum(HYPOTHESIS_TEST_STATUSES).default("untested"),
    validation_criteria: optText,
    failure_criteria: optText,
    evidence: optText,
  });

// ROADMAP §20–22 (P-5) ----------------------------------------------------------

export const ROADMAP_PHASE_STATUSES = ["planned", "active", "completed", "skipped"] as const;

export const roadmapPhaseObject = (fk: FkSchema) =>
  z.object({
    goal_id: fk,
    hypothesis_id: fk.nullable().default(null),
    /** Versión del roadmap completo (Roadmap v1, v2…, §101). */
    roadmap_version: z.number().int().min(1).default(1),
    seq: z.number().int().min(1),
    name: text,
    objective: optText,
    start_date: isoDate,
    expected_end: isoDate,
    entry_criteria: textList,
    exit_criteria: textList,
    kpi_metric_keys: z.array(metricKey).default([]),
    dependencies: textList,
    risks: textList,
    status: z.enum(ROADMAP_PHASE_STATUSES).default("planned"),
  });
export const roadmapPhaseCheck = (p: { start_date: string; expected_end: string }) => p.expected_end >= p.start_date;
export const ROADMAP_MSG = "La fase termina antes de empezar.";
export const roadmapPhaseShape = (fk: FkSchema) => roadmapPhaseObject(fk).refine(roadmapPhaseCheck, ROADMAP_MSG);

// PROYECTOS (L3) §24 -------------------------------------------------------------

export const PROJECT_STATUSES = ["planeado", "activo", "pausado", "completado", "cancelado"] as const;

export const projectShape = (fk: FkSchema) =>
  z.object({
    title: text,
    description: optText,
    purpose: optText,
    goal_id: fk.nullable().default(null),
    objective_id: fk.nullable().default(null),
    system_id: fk.nullable().default(null),
    start_date: isoDate.nullable().default(null),
    deadline: isoDate.nullable().default(null),
    owner: optText,
    status: z.enum(PROJECT_STATUSES).default("planeado"),
    success_criteria: textList,
  });

export const projectDependencyShape = (fk: FkSchema) =>
  z.object({ project_id: fk, depends_on_project_id: fk });

export const milestoneShape = (fk: FkSchema) =>
  z.object({
    project_id: fk,
    title: text,
    deadline: isoDate.nullable().default(null),
    status: z.enum(["pendiente", "completado"]).default("pendiente"),
    sort_order: z.number().int().default(0),
  });

// EXPERIMENTOS §40–42 + intervenciones (P-12) ------------------------------------

export const EXPERIMENT_STATUSES = ["designed", "running", "finished", "evaluated"] as const;
/** Decisión al cerrar un experimento: mantener / revertir / modificar (+ sin conclusión). */
export const EXPERIMENT_DECISIONS = ["keep", "revert", "modify", "inconclusive"] as const;
/** Campos que una intervención puede sobrescribir (lista cerrada: nada arbitrario). */
export const INTERVENABLE_FIELDS = { routine: ["target_per_occurrence"] } as const;

export const interventionShape = (fk: FkSchema) =>
  z
    .object({
      target_type: z.literal("routine"),
      target_id: fk,
      field: z.enum(INTERVENABLE_FIELDS.routine),
      /** Valor base que se conserva (no se destruye al intervenir). */
      baseline: num,
      value: num,
      from: isoDate,
      to: isoDate,
    })
    .refine((i) => i.to >= i.from, "La intervención termina antes de empezar.");

export const experimentObject = (fk: FkSchema) =>
  z.object({
    name: text,
    hypothesis_id: fk.nullable().default(null),
    system_id: fk.nullable().default(null),
    problem: optText,
    observation: optText,
    variable: optText,
    metric_key: metricKey,
    baseline_value: optNum,
    target_value: optNum,
    variants: z.array(text).default([]),
    /** §42: muestra mínima. */
    sample_target: z.number().int().positive(),
    observation_window_days: z.number().int().positive().nullable().default(null),
    success_threshold: optNum,
    failure_threshold: optNum,
    interventions: z.array(interventionShape(fk)).default([]),
    started_on: isoDate.nullable().default(null),
    ended_on: isoDate.nullable().default(null),
    status: z.enum(EXPERIMENT_STATUSES).default("designed"),
    result: z.record(z.unknown()).nullable().default(null),
    conclusion: optText,
    decision: z.enum(EXPERIMENT_DECISIONS).nullable().default(null),
    decision_id: fk.nullable().default(null),
    sop_id: fk.nullable().default(null),
  });
export const experimentCheck = (e: { status: string; decision: string | null }) => !(e.status === "evaluated" && !e.decision);
export const EXPERIMENT_MSG = "Un experimento evaluado necesita una decisión.";
export const experimentShape = (fk: FkSchema) => experimentObject(fk).refine(experimentCheck, EXPERIMENT_MSG);

// DECISIONES §43–44 -----------------------------------------------------------------

export const DECISION_STATUSES = ["proposed", "approved", "rejected", "modified", "implemented", "evaluated"] as const;

export const decisionShape = (fk: FkSchema) =>
  z.object({
    /** Número correlativo por usuario (#017): lo asigna la base de datos. */
    number: z.number().int().positive().optional(),
    date: isoDate,
    title: text,
    problem: text,
    evidence: optText,
    diagnosis: optText,
    hypothesis_id: fk.nullable().default(null),
    experiment_id: fk.nullable().default(null),
    change: text,
    reason: text,
    expected_result: optText,
    actual_result: optText,
    conclusion: optText,
    follow_up: optText,
    status: z.enum(DECISION_STATUSES).default("proposed"),
    proposed_by: actor,
    approved_at: timestamp.nullable().default(null),
    implemented_at: timestamp.nullable().default(null),
    /** Entidad afectada + snapshot antes/después (§100). */
    entity_type: z.string().nullable().default(null),
    entity_id: fk.nullable().default(null),
    before: z.record(z.unknown()).nullable().default(null),
    after: z.record(z.unknown()).nullable().default(null),
    change_set_id: fk.nullable().default(null),
  });

// SOPs §75–76 -----------------------------------------------------------------------

export const sopShape = (fk: FkSchema) =>
  z.object({
    system_id: fk.nullable().default(null),
    name: text,
    purpose: optText,
    when_to_use: optText,
    inputs: textList,
    steps: z.array(text).min(1, "Un SOP necesita al menos un paso."),
    expected_output: optText,
    kpi_metric_keys: z.array(metricKey).default([]),
    common_errors: textList,
    source_experiment_id: fk.nullable().default(null),
    obsidian_path: optText,
  });

// IDENTIDAD (L-1) §9 -----------------------------------------------------------------

export const identityRuleShape = (_fk: FkSchema) =>
  z.object({
    /** Conductual y observable ("Ejecuto P0 antes que lo opcional"), no motivacional. */
    statement: text,
    metric_key: metricKey.nullable().default(null),
    status: z.enum(["active", "retired"]).default("active"),
  });

// IDEAS §59 (P-6) --------------------------------------------------------------------

export const IDEA_STATUSES = ["parked", "rejected", "postponed", "project", "experiment", "task", "goal_candidate"] as const;

export const ideaShape = (fk: FkSchema) =>
  z.object({
    title: text,
    description: optText,
    /** §29: cómo contribuiría a la meta actual (vacío = aparcada). */
    contribution: optText,
    status: z.enum(IDEA_STATUSES).default("parked"),
    converted_entity_id: fk.nullable().default(null),
  });

// Filas completas ------------------------------------------------------------------

export const Goal = rowOf(goalShape(z.string().uuid()), { versioned: true });
export const Objective = rowOf(objectiveShape(z.string().uuid()));
export const System = rowOf(systemShape(z.string().uuid()), { versioned: true });
export const ObjectiveSystem = rowOf(objectiveSystemShape(z.string().uuid()));
export const MetricDefinition = rowOf(metricDefinitionShape(z.string().uuid()));
export const Funnel = rowOf(funnelShape(z.string().uuid()), { versioned: true });
export const Hypothesis = rowOf(hypothesisShape(z.string().uuid()), { versioned: true });
export const Project = rowOf(projectShape(z.string().uuid()));
export const ProjectDependency = rowOf(projectDependencyShape(z.string().uuid()));
export const Milestone = rowOf(milestoneShape(z.string().uuid()));
export const Decision = rowOf(decisionShape(z.string().uuid()));
export const Sop = rowOf(sopShape(z.string().uuid()), { versioned: true });
export const IdentityRule = rowOf(identityRuleShape(z.string().uuid()));
export const Idea = rowOf(ideaShape(z.string().uuid()));

export type Goal = z.infer<typeof Goal>;
export type Objective = z.infer<typeof Objective>;
export type System = z.infer<typeof System>;
export type ObjectiveSystem = z.infer<typeof ObjectiveSystem>;
export type MetricDefinition = z.infer<typeof MetricDefinition>;
export type Funnel = z.infer<typeof Funnel>;
export type Hypothesis = z.infer<typeof Hypothesis>;
export type Project = z.infer<typeof Project>;
export type Milestone = z.infer<typeof Milestone>;
export type Decision = z.infer<typeof Decision>;
export type Sop = z.infer<typeof Sop>;
export type IdentityRule = z.infer<typeof IdentityRule>;
export type Idea = z.infer<typeof Idea>;
export const RoadmapPhase = rowOf(roadmapPhaseObject(z.string().uuid()), { versioned: true }).refine(roadmapPhaseCheck, ROADMAP_MSG);
export const Experiment = rowOf(experimentObject(z.string().uuid())).refine(experimentCheck, EXPERIMENT_MSG);
export type RoadmapPhase = z.infer<typeof RoadmapPhase>;
export type Experiment = z.infer<typeof Experiment>;
export type Intervention = z.infer<ReturnType<typeof interventionShape>>;
