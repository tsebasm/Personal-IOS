import { describe, expect, it } from "vitest";
import { applyChangeSet, ChangeSetError, createChangeSet, proposeChangeSet, reviewChangeSet, type Db, type ProposedItemInput } from "./change-sets";
import { can, OPERATIONS, PermissionError, POLICY } from "./permissions";

const GOAL = "11111111-1111-4111-8111-111111111111";

/** Base falsa que registra cada llamada: si un permiso falla, no debe haber ninguna. */
function fakeDb() {
  const calls: { kind: "insert" | "rpc"; target: string; args: unknown }[] = [];
  const db: Db = {
    from: (table) => ({
      insert: (values) => {
        calls.push({ kind: "insert", target: table, args: values });
        return { select: () => ({ single: async () => ({ data: { id: `${table}-id` }, error: null }) }) };
      },
    }),
    rpc: async (fn, args) => {
      calls.push({ kind: "rpc", target: fn, args });
      return { data: fn === "cs_apply" ? { status: "applied", created: {}, updated: [], archived: [] } : "approved", error: null };
    },
  };
  return { db, calls };
}

const item = (p: Partial<ProposedItemInput> & Pick<ProposedItemInput, "entity_type" | "payload">): ProposedItemInput => ({
  seq: 1,
  op: "create",
  entity_id: null,
  temp_ref: null,
  depends_on: [],
  sensitivity: "normal",
  ...p,
});

describe("4. permisos de Claude por operación", () => {
  it("matriz: Claude lee y redacta/propone borradores; nunca aprueba, aplica, cambia la meta, evalúa ni registra datos", () => {
    const claude = Object.fromEntries(OPERATIONS.map((op) => [op, can("claude", op)]));
    expect(claude).toEqual({
      read: true,
      create_draft: true,
      propose: true,
      propose_goal_change: false,
      review: false,
      apply: false,
      evaluate_decision: false,
      record_observed_data: false,
      materialize_routines: false,
      override_tier: false,
    });
    for (const op of OPERATIONS) expect(POLICY[op].user, op).toBe(true);
  });

  it("Claude no puede revisar (aprobar/rechazar) ni aplicar: falla antes de tocar la base", async () => {
    const { db, calls } = fakeDb();
    await expect(reviewChangeSet(db, "claude", "cs", [1], [])).rejects.toBeInstanceOf(PermissionError);
    await expect(applyChangeSet(db, "claude", "cs")).rejects.toBeInstanceOf(PermissionError);
    await expect(reviewChangeSet(db, "system", "cs", [1], [])).rejects.toBeInstanceOf(PermissionError);
    expect(calls).toEqual([]);
  });

  it("Claude no puede iniciar un cambio de meta", async () => {
    const { db, calls } = fakeDb();
    const goalItem = item({ op: "update", entity_type: "goal", entity_id: GOAL, sensitivity: "locked", payload: { target_value: 1 } });
    await expect(createChangeSet(db, "claude", { kind: "goal_change", title: "x", items: [goalItem] })).rejects.toBeInstanceOf(PermissionError);
    await expect(proposeChangeSet(db, "claude", "cs", null, "goal_change")).rejects.toBeInstanceOf(PermissionError);
    expect(calls).toEqual([]);
  });

  it("Claude no puede proponer datos observados ni rebajar la sensibilidad (validación de dominio, sin escribir)", async () => {
    const { db, calls } = fakeDb();
    const receipt = item({ entity_type: "revenue_receipt", payload: { counterparty: "X", received_at: "2026-10-06T10:00:00Z", amount: 1, concept: "other" } });
    const err = await createChangeSet(db, "claude", { title: "x", items: [receipt] }).catch((e) => e);
    expect(err).toBeInstanceOf(ChangeSetError);
    expect((err as ChangeSetError).validation?.errors.map((e) => e.code)).toContain("claude_cannot_propose_data");
    const lowered = item({ entity_type: "system", payload: { title: "S", type: "acquisition" } });
    await expect(createChangeSet(db, "claude", { title: "x", items: [lowered] })).rejects.toBeInstanceOf(ChangeSetError);
    expect(calls).toEqual([]);
  });

  it("la meta no entra en un paquete estándar (ni siquiera del usuario)", async () => {
    const { db, calls } = fakeDb();
    const goalItem = item({ op: "update", entity_type: "goal", entity_id: GOAL, sensitivity: "locked", payload: { target_value: 1 } });
    await expect(createChangeSet(db, "user", { title: "x", items: [goalItem] })).rejects.toBeInstanceOf(ChangeSetError);
    expect(calls).toEqual([]);
  });

  it("un cambio de meta no puede fijar locked_at ni traer más de un ítem", async () => {
    const { db } = fakeDb();
    const a = item({ op: "update", entity_type: "goal", entity_id: GOAL, sensitivity: "locked", payload: { locked_at: "2026-10-06T00:00:00Z" } });
    await expect(createChangeSet(db, "user", { kind: "goal_change", title: "x", items: [a] })).rejects.toBeInstanceOf(ChangeSetError);
    const b = item({ op: "update", entity_type: "goal", entity_id: GOAL, sensitivity: "locked", payload: { target_value: 5000 } });
    await expect(createChangeSet(db, "user", { kind: "goal_change", title: "x", items: [b, { ...b, seq: 2 }] })).rejects.toBeInstanceOf(ChangeSetError);
  });

  it("flujo del usuario: crea, propone, revisa y aplica delegando en cs_*", async () => {
    const { db, calls } = fakeDb();
    const goalItem = item({ op: "update", entity_type: "goal", entity_id: GOAL, sensitivity: "locked", payload: { target_value: 5000, currency: "USD", unit: "USD" } });
    const id = await createChangeSet(db, "user", { kind: "goal_change", title: "Meta 5.000 USD", items: [goalItem] });
    await proposeChangeSet(db, "user", id, { title: "t", problem: "p", change: "c", reason: "r" }, "goal_change");
    await reviewChangeSet(db, "user", id, [1], []);
    await applyChangeSet(db, "user", id);
    expect(calls.map((c) => `${c.kind}:${c.target}`)).toEqual(["insert:change_sets", "insert:change_items", "rpc:cs_propose", "rpc:cs_review", "rpc:cs_apply"]);
    expect(calls[0].args).toMatchObject({ kind: "goal_change", proposed_by: "user" });
  });
});
