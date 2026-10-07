import { proposalSchema, validateChangeSet, type ChangeSetValidation } from "@/lib/domain/registry";
import type { ChangeItem } from "@/lib/domain/intelligence";
import { assertCan, type Actor } from "./permissions";

/**
 * Servicio de change sets (contrato PHASE-A-DESIGN §9). Cada operación:
 *  1. verifica el permiso del actor (lib/intelligence/permissions.ts);
 *  2. valida con el dominio (mismas reglas que las filas reales);
 *  3. delega la transición a las funciones transaccionales de la base
 *     (cs_propose / cs_review / cs_apply, migración 0019).
 * No hay otra vía para mover estados: los triggers rechazan updates directos.
 */

/** Lo mínimo de un cliente Supabase que usa el servicio (permite tests sin red). */
export type Db = {
  from: (table: string) => {
    insert: (values: unknown) => {
      select: (cols: string) => { single: () => PromiseLike<{ data: { id: string } | null; error: { message: string } | null }> };
    };
  };
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export type ProposedItemInput = Pick<ChangeItem, "seq" | "op" | "entity_type" | "entity_id" | "temp_ref" | "payload" | "depends_on" | "sensitivity">;
export type DecisionInput = { title: string; problem: string; change: string; reason: string; evidence?: string; expected_result?: string };

export class ChangeSetError extends Error {
  constructor(
    message: string,
    public validation?: ChangeSetValidation
  ) {
    super(message);
    this.name = "ChangeSetError";
  }
}

/** Validación específica del flujo de cambio de meta (§11): un único update sobre goal. */
export function validateGoalChange(items: ProposedItemInput[]): ChangeSetValidation {
  const errors: ChangeSetValidation["errors"] = [];
  if (items.length !== 1 || items[0].op !== "update" || items[0].entity_type !== "goal" || !items[0].entity_id) {
    errors.push({ code: "goal_change_shape", message: "Un cambio de meta contiene exactamente un update sobre la meta.", refs: [] });
  } else {
    const parsed = proposalSchema("goal", "update").safeParse(items[0].payload);
    if (!parsed.success) {
      for (const i of parsed.error.issues) errors.push({ code: "invalid_payload", message: `${i.path.join(".")} — ${i.message}`, refs: [] });
    }
    if ("locked_at" in (items[0].payload ?? {})) {
      errors.push({ code: "reserved_field", message: "locked_at lo asigna el motor al aplicar.", refs: [] });
    }
  }
  return { ok: errors.length === 0, errors, order: errors.length === 0 ? [items[0].seq] : null };
}

export async function createChangeSet(
  db: Db,
  actor: Actor,
  input: { kind?: "standard" | "goal_change"; title: string; rationale?: string; planImportId?: string | null; items: ProposedItemInput[] }
): Promise<string> {
  const kind = input.kind ?? "standard";
  assertCan(actor, kind === "goal_change" ? "propose_goal_change" : "create_draft");
  const validation = kind === "goal_change" ? validateGoalChange(input.items) : validateChangeSet(input.items, actor);
  if (!validation.ok) throw new ChangeSetError("El paquete no es válido.", validation);

  const { data: set, error } = await db
    .from("change_sets")
    .insert({ kind, title: input.title, rationale: input.rationale ?? null, proposed_by: actor, plan_import_id: input.planImportId ?? null })
    .select("id")
    .single();
  if (error || !set) throw new ChangeSetError(`No se pudo crear el paquete: ${error?.message ?? "sin respuesta"}`);

  for (const it of input.items) {
    const { error: e } = await db
      .from("change_items")
      .insert({ change_set_id: set.id, ...it, depends_on: it.depends_on ?? [] })
      .select("id")
      .single();
    if (e) throw new ChangeSetError(`No se pudo guardar el ítem ${it.seq}: ${e.message}`);
  }
  return set.id;
}

async function rpc(db: Db, fn: string, args: Record<string, unknown>) {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new ChangeSetError(error.message);
  return data;
}

export async function proposeChangeSet(db: Db, actor: Actor, id: string, decision: DecisionInput | null, kind: "standard" | "goal_change" = "standard") {
  assertCan(actor, kind === "goal_change" ? "propose_goal_change" : "propose");
  return (await rpc(db, "cs_propose", { p_set: id, p_decision: decision })) as string | null;
}

export async function reviewChangeSet(db: Db, actor: Actor, id: string, approvedSeqs: number[], rejectedSeqs: number[]) {
  assertCan(actor, "review");
  return (await rpc(db, "cs_review", { p_set: id, p_approved: approvedSeqs, p_rejected: rejectedSeqs })) as
    | "approved"
    | "partially_approved"
    | "rejected";
}

export type ApplyResult = { status: "applied"; created: Record<string, string>; updated: string[]; archived: string[] } | { status: "failed"; reason: string };

export async function applyChangeSet(db: Db, actor: Actor, id: string): Promise<ApplyResult> {
  assertCan(actor, "apply");
  return (await rpc(db, "cs_apply", { p_set: id })) as ApplyResult;
}
