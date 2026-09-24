/**
 * Modo adaptativo: una tarea que no se completó no se arrastra sola al día
 * siguiente. Se registra POR QUÉ (dato para aprender) y QUÉ se decide.
 * Compartido entre la acción y el formulario.
 */

export const MISS_REASONS = [
  "time",
  "energy",
  "priority",
  "difficulty",
  "avoidance",
  "external_blocker",
  "bad_estimate",
] as const;
export type MissReason = (typeof MISS_REASONS)[number];

export const MISS_REASON_LABEL: Record<MissReason, string> = {
  time: "Tiempo — no alcanzó",
  energy: "Energía — no tenía",
  priority: "Prioridad — algo más importante",
  difficulty: "Dificultad — no sabía cómo avanzar",
  avoidance: "Evitación — la estuve evitando",
  external_blocker: "Bloqueo externo — dependía de alguien",
  bad_estimate: "Mala estimación — era más grande",
};

export const MISS_DECISIONS = ["keep", "reschedule", "break_down", "remove", "reprioritize"] as const;
export type MissDecision = (typeof MISS_DECISIONS)[number];

export const MISS_DECISION_LABEL: Record<MissDecision, string> = {
  keep: "Mantener — hacerla hoy",
  reschedule: "Reprogramar — elegir fecha",
  break_down: "Dividir — en pasos más pequeños (hoy)",
  remove: "Eliminar — ya no aporta",
  reprioritize: "Repriorizar — sacarla de la agenda",
};
