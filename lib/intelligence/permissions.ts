/**
 * Permisos por operación sobre la capa de cambios (spec §99, §130 C-3).
 *
 * La base de datos no distingue "usuario" de "Claude" (ambos actúan con la
 * sesión del usuario). Por eso TODA operación de lib/intelligence/change-sets.ts
 * recibe el actor explícito y pasa por `assertCan` antes de tocar la base:
 *  - la UI (server actions) llama con actor 'user';
 *  - cualquier herramienta de Claude debe llamar con actor 'claude'
 *    (hoy el asistente no ejecuta herramientas: solo escribe mensajes).
 * Las garantías que sí viven en la base (0018/0019): aprobación registrada como
 * 'user', estados solo vía cs_*, ownership, meta bloqueada, datos observados.
 */

export type Actor = "user" | "claude" | "system";

/** §99: niveles de autoridad de Claude. */
export const CLAUDE_LEVELS = {
  0: "Leer",
  1: "Analizar",
  2: "Proponer (texto)",
  3: "Generar borradores de cambios (change sets)",
  4: "Ejecutar cambios aprobados",
  5: "Cambios automáticos de bajo riesgo explícitamente autorizados",
} as const;

export const OPERATIONS = [
  "read",
  "create_draft",
  "propose",
  "propose_goal_change",
  "review",
  "apply",
  "evaluate_decision",
  "record_observed_data",
  "materialize_routines",
] as const;
export type Operation = (typeof OPERATIONS)[number];

type Rule = { user: boolean; claude: boolean; system: boolean; claudeLevel: keyof typeof CLAUDE_LEVELS | null; why: string };

export const POLICY: Record<Operation, Rule> = {
  read: { user: true, claude: true, system: true, claudeLevel: 0, why: "Leer el estado del sistema." },
  create_draft: { user: true, claude: true, system: true, claudeLevel: 3, why: "Borrador de change set: no cambia nada real." },
  propose: { user: true, claude: true, system: true, claudeLevel: 3, why: "Pasar un borrador a revisión humana." },
  propose_goal_change: { user: true, claude: false, system: false, claudeLevel: null, why: "§11: el cambio de meta lo inicia solo el usuario." },
  review: { user: true, claude: false, system: false, claudeLevel: null, why: "C-3: Claude nunca aprueba ni rechaza (tampoco sus propias propuestas)." },
  apply: { user: true, claude: false, system: false, claudeLevel: null, why: "Aplicar es un acto del usuario en este ciclo: nada estratégico se aplica en silencio." },
  evaluate_decision: { user: true, claude: false, system: false, claudeLevel: null, why: "Evaluar el resultado de una decisión es del usuario; Claude puede analizarlo." },
  record_observed_data: { user: true, claude: false, system: true, claudeLevel: null, why: "§6: Claude no inventa resultados (métricas, recibos, evidencia, tasas)." },
  materialize_routines: { user: true, claude: false, system: true, claudeLevel: null, why: "§99 nivel 5: crear las instancias del día de reglas ya aprobadas; automático y de bajo riesgo, nunca de Claude." },
};

export class PermissionError extends Error {
  constructor(
    public actor: Actor,
    public operation: Operation
  ) {
    super(`${actor} no puede ejecutar "${operation}": ${POLICY[operation].why}`);
    this.name = "PermissionError";
  }
}

export function can(actor: Actor, op: Operation): boolean {
  return POLICY[op][actor];
}

export function assertCan(actor: Actor, op: Operation): void {
  if (!can(actor, op)) throw new PermissionError(actor, op);
}
