import type { Inconsistency, Question } from "@/lib/domain/intelligence";
import type { DecisionInput, ProposedItemInput } from "./change-sets";

/**
 * Contrato de interpretación (PHASE-A-DESIGN §5, P-10): entrada humana libre →
 * estructura propuesta. Un intérprete NUNCA escribe entidades reales: produce
 * un change set que pasa por validación, aprobación humana y cs_apply.
 *
 * Implementaciones: TemplateInterpreter (A5, determinista, sin IA) ·
 * ClaudeInterpreter (Fase C) · interpretación manual.
 */

export type StrategyContext = {
  today: string;
  /** Meta principal vigente (si existe). Si está bloqueada, un plan nunca la reemplaza: propone objetivos debajo. */
  goal: { id: string; title: string; locked: boolean } | null;
  systems: { id: string; title: string }[];
  metricKeys: string[];
};

export type DetectedStructure = {
  plan: string | null;
  objective: string | null;
  system: string | null;
  hypothesis: string | null;
  experiment: string | null;
  routines: string[];
  project: string | null;
  tasks: string[];
  metrics: string[];
  roadmap: string[];
};

export type Interpretation = {
  interpreter: "template" | "claude" | "manual";
  interpreterVersion: string;
  detected: DetectedStructure;
  inconsistencies: Inconsistency[];
  /** Ambigüedades para el usuario: nada ambiguo se convierte en realidad sin respuesta. */
  questions: Question[];
  /** null si falta información imprescindible (status needs_input). */
  changeSet: { title: string; rationale: string; items: ProposedItemInput[]; decision: DecisionInput } | null;
};

export interface PlanInterpreter {
  interpret(content: string, ctx: StrategyContext): Interpretation;
}
