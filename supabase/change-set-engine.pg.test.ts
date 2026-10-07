import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, createUser, migratedDb } from "./pg-harness";
import { ENTITY_REGISTRY, ENTITY_TYPES } from "@/lib/domain/registry";

/**
 * A3 — motor de change sets sobre Postgres real (contrato PHASE-A-DESIGN §9).
 * Todo corre como usuario autenticado (RLS activo), igual que en Supabase.
 */

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const T = 60_000;

type Item = { seq: number; op?: string; entity_type: string; entity_id?: string | null; temp_ref?: string | null; payload?: object; depends_on?: string[]; sensitivity?: string };
const DECISION = { title: "Adoptar plan", problem: "Sin estructura", change: "Crear estructura", reason: "Ejecutar el plan" };

let db: PGlite;
const q = <R = Record<string, unknown>>(sql: string, p: unknown[] = []) => db.query<R>(sql, p);
const one = async <R = Record<string, unknown>>(sql: string, p: unknown[] = []) => (await q<R>(sql, p)).rows[0];
const n = async (sql: string, p: unknown[] = []) => Number((await one<{ n: number }>(`select count(*)::int as n from (${sql}) x`, p)).n);
const as = <R>(u: string, fn: () => Promise<R>) => asUser(db, u, fn);

async function createSet(items: Item[], opts: { proposed_by?: string; kind?: string; plan_import_id?: string } = {}) {
  const s = await one<{ id: string }>(
    "insert into change_sets (title, proposed_by, kind, plan_import_id) values ('paquete', $1, $2, $3) returning id",
    [opts.proposed_by ?? "user", opts.kind ?? "standard", opts.plan_import_id ?? null]
  );
  for (const it of items) {
    await q(
      `insert into change_items (change_set_id, seq, op, entity_type, entity_id, temp_ref, payload, depends_on, sensitivity)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [s.id, it.seq, it.op ?? "create", it.entity_type, it.entity_id ?? null, it.temp_ref ?? null, JSON.stringify(it.payload ?? {}), it.depends_on ?? [], it.sensitivity ?? "normal"]
    );
  }
  return s.id;
}
const propose = (id: string, decision: object | null = DECISION) => one<{ d: string | null }>("select cs_propose($1, $2) as d", [id, decision ? JSON.stringify(decision) : null]);
const review = (id: string, ok: number[], no: number[] = []) => one<{ s: string }>("select cs_review($1, $2, $3) as s", [id, ok, no]);
const apply = async (id: string) => (await one<{ r: { status: string; reason?: string; created?: Record<string, string> } }>("select cs_apply($1) as r", [id])).r;
const setStatus = async (id: string) => (await one<{ status: string; failure_reason: string | null }>("select status, failure_reason from change_sets where id = $1", [id]));
const decisionOf = async (id: string) =>
  one<{ number: number; status: string; approved_at: string | null; implemented_at: string | null; before: Record<string, unknown> | null; after: Record<string, unknown> | null; entity_id: string | null }>(
    "select d.* from decisions d join change_sets s on s.decision_id = d.id where s.id = $1", [id]
  );

async function goalOf(user: string) {
  return as(user, () => one<{ id: string }>("insert into goals (title, unit, target_value, deadline) values ('Meta', 'COP', 1000, '2026-12-31') returning id"));
}

/** Paquete con la forma del caso de aceptación (estratégico, con refs temporales e intervención). */
function planItems(goalId: string): Item[] {
  return [
    { seq: 1, entity_type: "objective", temp_ref: "$obj", sensitivity: "strategic", payload: { goal_id: goalId, title: "5 clientes", unit: "clientes", target_value: 5 } },
    { seq: 2, entity_type: "system", temp_ref: "$sys", sensitivity: "strategic", payload: { title: "Adquisición outbound", type: "acquisition" } },
    { seq: 3, entity_type: "objective_system", payload: { objective_id: "$obj", system_id: "$sys" } },
    { seq: 4, entity_type: "routine", temp_ref: "$rt", payload: { system_id: "$sys", title: "Contactar", metric_key: "contacts", target_per_occurrence: 30, unit: "contactos", cadence: "weekdays", tier: "p0", valid_from: "2026-10-07" } },
    { seq: 5, entity_type: "experiment", temp_ref: "$exp", sensitivity: "strategic", payload: { name: "Volumen 30→60", system_id: "$sys", metric_key: "replies", sample_target: 600, interventions: [{ target_type: "routine", target_id: "$rt", field: "target_per_occurrence", baseline: 30, value: 60, from: "2026-10-07", to: "2026-10-20" }] } },
    { seq: 6, entity_type: "project", temp_ref: "$prj", payload: { title: "Campaña outbound", objective_id: "$obj", system_id: "$sys", success_criteria: ["5 clientes"] } },
    { seq: 7, entity_type: "task", payload: { title: "Lista de prospectos", project_id: "$prj", tier: "p0", target_qty: 840, unit: "prospectos" } },
  ];
}

beforeAll(async () => {
  db = await migratedDb();
  for (const u of [A, B, C]) await createUser(db, u);
}, T);

// -----------------------------------------------------------------------------
describe("1–3. máquinas de estado y sincronización change set ↔ decisión", () => {
  it("draft → proposed → approved → applied; decisión proposed → approved → implemented → evaluated", async () => {
    const goal = await goalOf(A);
    await as(A, async () => {
      const id = await createSet(planItems(goal.id), { proposed_by: "claude" });
      await expect(propose(id, null)).rejects.toThrow(/exige decisión/);
      await propose(id);
      expect((await setStatus(id)).status).toBe("proposed");
      expect((await decisionOf(id)).status).toBe("proposed");

      expect((await review(id, [1, 2, 3, 4, 5, 6, 7])).s).toBe("approved");
      const d1 = await decisionOf(id);
      expect([d1.status, d1.approved_at !== null]).toEqual(["approved", true]);
      expect(await one("select approved_by from change_sets where id = $1", [id])).toEqual({ approved_by: "user" });

      const r = await apply(id);
      expect(r.status).toBe("applied");
      const d2 = await decisionOf(id);
      expect([d2.status, d2.implemented_at !== null]).toEqual(["implemented", true]);

      // Entidades reales con trazabilidad y refs resueltas (incluida la intervención anidada).
      const rt = r.created!["$rt"];
      const exp = await one<{ interventions: { target_id: string }[]; origin: string; created_by: string }>("select interventions, origin, created_by from experiments where id = $1", [r.created!["$exp"]]);
      expect(exp.interventions[0].target_id).toBe(rt);
      expect([exp.origin, exp.created_by]).toEqual(["claude", "claude"]);
      expect(await n("select 1 from objective_systems where objective_id = $1 and system_id = $2", [r.created!["$obj"], r.created!["$sys"]])).toBe(1);
      expect(await n("select 1 from projects p join change_items ci on ci.id = p.origin_change_item_id where ci.change_set_id = $1", [id])).toBe(1);
      expect(await one("select success_criteria from projects where id = $1", [r.created!["$prj"]])).toEqual({ success_criteria: ["5 clientes"] });
      expect(await n("select 1 from change_items where change_set_id = $1 and status = 'applied'", [id])).toBe(7);

      // Decisión: solo implemented → evaluated fuera del motor.
      const did = (await one<{ decision_id: string }>("select decision_id from change_sets where id = $1", [id])).decision_id;
      await expect(q("update decisions set status = 'rejected' where id = $1", [did])).rejects.toThrow(/solo ocurre a través del paquete/);
      await q("update decisions set status = 'evaluated', actual_result = 'ok', conclusion = 'funcionó' where id = $1", [did]);
      expect((await decisionOf(id)).status).toBe("evaluated");
    });
  });

  it("aprobación parcial: decisión 'modified'; solo se aplica lo aprobado; no se aprueba lo que depende de un rechazado", async () => {
    const goal = await goalOf(A);
    await as(A, async () => {
      const id = await createSet(planItems(goal.id));
      await propose(id);
      await expect(review(id, [1, 2, 3, 4, 5, 6, 7], [1])).rejects.toThrow(/a la vez/);
      await expect(review(id, [1, 2])).rejects.toThrow(/exactamente todos/);
      await expect(review(id, [1, 3, 4, 5, 6, 7], [2])).rejects.toThrow(/depende de \$sys/);
      expect((await review(id, [1, 2, 3, 4, 5, 6], [7])).s).toBe("partially_approved");
      expect((await decisionOf(id)).status).toBe("modified");
      expect((await apply(id)).status).toBe("applied");
      expect(await n("select 1 from tasks t join change_items ci on ci.id = t.origin_change_item_id where ci.change_set_id = $1", [id])).toBe(0);
      expect((await decisionOf(id)).status).toBe("implemented");
    });
  });

  it("rechazo total: paquete y decisión 'rejected'; estado terminal", async () => {
    const goal = await goalOf(A);
    await as(A, async () => {
      const id = await createSet(planItems(goal.id).slice(0, 2));
      await propose(id);
      expect((await review(id, [], [1, 2])).s).toBe("rejected");
      expect((await decisionOf(id)).status).toBe("rejected");
      await expect(apply(id)).rejects.toThrow(/solo se aplica un paquete aprobado/);
      await expect(propose(id)).rejects.toThrow(/solo se propone desde draft o failed/);
      await expect(review(id, [1, 2])).rejects.toThrow(/solo se revisa un paquete proposed/);
      expect(await n("select 1 from systems s join change_items ci on ci.id = s.origin_change_item_id where ci.change_set_id = $1", [id])).toBe(0);
    });
  });
});

// -----------------------------------------------------------------------------
describe("4. permisos y registro SQL ↔ TypeScript", () => {
  it("el registro SQL coincide con lib/domain/registry.ts (tablas, sensibilidad, permisos de Claude)", async () => {
    const rank = { normal: 0, strategic: 1, locked: 2 } as const;
    for (const t of ENTITY_TYPES) {
      const spec = ENTITY_REGISTRY[t];
      const row = await one<{ tbl: string; c: number; u: number; a: number; claude: boolean }>(
        `select cs_entity_table($1)::text as tbl, cs_required_sensitivity($1,'create') as c, cs_required_sensitivity($1,'update') as u,
                cs_required_sensitivity($1,'archive') as a, cs_claude_may_propose($1) as claude`, [t]
      );
      expect(row.tbl, t).toBe(spec.table);
      expect([row.c, row.u, row.a], t).toEqual([rank[spec.sensitivity.create], rank[spec.sensitivity.update], rank[spec.sensitivity.archive]]);
      expect(row.claude, t).toBe(spec.claudeMayPropose);
    }
    expect(await one("select cs_entity_table('spaceship') as t")).toEqual({ t: null });
    // En sentido inverso: toda tabla con provenance (P-13) es una entidad del registro TS.
    const provTables = (await q<{ t: string }>(
      "select attrelid::regclass::text as t from pg_attribute where attname = 'origin_change_item_id' and not attisdropped and attrelid::regclass::text not like 'pg_%' order by 1"
    )).rows.map((r) => r.t);
    expect(provTables.sort()).toEqual(Object.values(ENTITY_REGISTRY).map((s) => s.table).sort());
  });
});

// -----------------------------------------------------------------------------
describe("6. rechazo de cambios no autorizados", () => {
  it("Claude no propone datos observados ni puede iniciar un cambio de meta", async () => {
    const goal = await goalOf(A);
    await as(A, async () => {
      const id = await createSet([{ seq: 1, entity_type: "revenue_receipt", payload: { counterparty: "X", received_at: "2026-10-06T10:00:00Z", amount: 1, concept: "other" } }], { proposed_by: "claude" });
      await expect(propose(id)).rejects.toThrow(/Claude no puede proponer revenue_receipt/);
      const id2 = await createSet([{ seq: 1, entity_type: "metric_entry", payload: { metric_key: "closes", date: "2026-10-06", value: 3, source: "claude", quality: "estimated" } }], { proposed_by: "claude" });
      await expect(propose(id2)).rejects.toThrow(/Claude no puede proponer metric_entry/);
      await expect(createSet([{ seq: 1, op: "update", entity_type: "goal", entity_id: goal.id, sensitivity: "locked", payload: { target_value: 1 } }], { proposed_by: "claude", kind: "goal_change" })).rejects.toThrow(/goal_change_by_user/);
    });
  });

  it("la meta no se cambia en un paquete estándar; la sensibilidad no se puede rebajar", async () => {
    const goal = await goalOf(A);
    await as(A, async () => {
      const id = await createSet([{ seq: 1, op: "update", entity_type: "goal", entity_id: goal.id, sensitivity: "strategic", payload: { target_value: 1 } }]);
      await expect(propose(id)).rejects.toThrow(/sensibilidad strategic menor|cambio bloqueado/);
      const id2 = await createSet([{ seq: 1, entity_type: "hypothesis", sensitivity: "normal", payload: { type: "volume", statement: "x" } }]);
      await expect(propose(id2)).rejects.toThrow(/menor a la requerida/);
    });
  });

  it("nadie se salta el ciclo: sin aprobación no se aplica; lo aprobado no se edita; el estado no se toca por fuera", async () => {
    await as(A, async () => {
      const id = await createSet([{ seq: 1, entity_type: "project", payload: { title: "P" } }]);
      await expect(apply(id)).rejects.toThrow(/solo se aplica un paquete aprobado/);
      await propose(id);
      await expect(apply(id)).rejects.toThrow(/solo se aplica un paquete aprobado/);
      await expect(q("update change_items set payload = '{\"title\":\"otro\"}' where change_set_id = $1", [id])).rejects.toThrow(/no cambia después de proponer/);
      await expect(q("insert into change_items (change_set_id, seq, op, entity_type, payload, sensitivity) values ($1, 2, 'create', 'project', '{\"title\":\"colado\"}', 'normal')", [id])).rejects.toThrow(/solo se agregan ítems a un paquete en draft/);
      await expect(q("update change_items set status = 'approved' where change_set_id = $1", [id])).rejects.toThrow(/solo cambia mediante/);
      await expect(q("update change_sets set status = 'approved', approved_by = 'user', approved_at = now() where id = $1", [id])).rejects.toThrow(/solo cambia mediante/);
      await expect(q("insert into decisions (title, problem, change, reason, proposed_by, change_set_id) values ('d','p','c','r','user',$1)", [id])).rejects.toThrow(/la crea cs_propose/);
    });
  });

  it("columnas reservadas y desconocidas hacen fallar la aplicación sin escribir nada", async () => {
    await as(A, async () => {
      const id = await createSet([
        { seq: 1, entity_type: "project", temp_ref: "$p", payload: { title: "Antes del fallo" } },
        { seq: 2, entity_type: "task", payload: { title: "t", project_id: "$p", user_id: B } },
      ]);
      await propose(id);
      await review(id, [1, 2]);
      const r = await apply(id);
      expect(r.status).toBe("failed");
      expect(r.reason).toMatch(/columna reservada user_id/);
      expect(await n("select 1 from projects where title = 'Antes del fallo'")).toBe(0); // atomicidad
      expect((await setStatus(id)).status).toBe("failed");
    });
  });
});

// -----------------------------------------------------------------------------
describe("7. ownership: ningún ítem toca ni enlaza datos de otro usuario", () => {
  it("FK del catálogo: objetivo colgado de la meta de otro usuario", async () => {
    const goalB = await goalOf(B);
    await as(A, async () => {
      const id = await createSet([{ seq: 1, entity_type: "objective", sensitivity: "strategic", payload: { goal_id: goalB.id, title: "robo", unit: "x", target_value: 1 } }]);
      await propose(id);
      await review(id, [1]);
      const r = await apply(id);
      expect([r.status, r.reason]).toEqual(["failed", expect.stringMatching(/ownership: .*goal_id .* no pertenece/)]);
      expect(await n("select 1 from objectives where title = 'robo'")).toBe(0);
    });
  });

  it("update/archive sobre una entidad ajena; goal_change sobre la meta ajena", async () => {
    const goalB = await goalOf(B);
    const projB = await as(B, () => one<{ id: string }>("insert into projects (title) values ('de B') returning id"));
    await as(A, async () => {
      const id = await createSet([{ seq: 1, op: "archive", entity_type: "project", entity_id: projB.id, sensitivity: "strategic" }]);
      await propose(id);
      await review(id, [1]);
      expect((await apply(id)).reason).toMatch(/ownership/);
      const g = await createSet([{ seq: 1, op: "update", entity_type: "goal", entity_id: goalB.id, sensitivity: "locked", payload: { target_value: 1 } }], { kind: "goal_change" });
      await expect(propose(g)).rejects.toThrow(/ownership: goal_change/);
    });
    expect(await one("select archived_at from projects where id = $1", [projB.id])).toEqual({ archived_at: null });
  });

  it("columnas polimórficas y referencias dentro de jsonb (evidencia, intervenciones)", async () => {
    const taskB = await as(B, () => one<{ id: string }>("insert into tasks (title) values ('de B') returning id"));
    const sysB = await as(B, () => one<{ id: string }>("insert into systems (title, type) values ('S', 'other') returning id"));
    const rtB = await as(B, () => one<{ id: string }>("insert into routines (system_id, title, metric_key, target_per_occurrence, unit, cadence, tier, valid_from) values ($1,'r','contacts',30,'n','daily','p0','2026-10-07') returning id", [sysB.id]));
    await as(A, async () => {
      const ev = await createSet([{ seq: 1, entity_type: "evidence", payload: { entity_type: "task", entity_id: taskB.id, source: "manual" } }]);
      await propose(ev);
      await review(ev, [1]);
      expect((await apply(ev)).reason).toMatch(/ownership: .*entity_id/);
      const ex = await createSet([{ seq: 1, entity_type: "experiment", sensitivity: "strategic", payload: { name: "x", metric_key: "replies", sample_target: 10, interventions: [{ target_type: "routine", target_id: rtB.id, field: "target_per_occurrence", baseline: 30, value: 60, from: "2026-10-07", to: "2026-10-20" }] } }]);
      await propose(ex);
      await review(ex, [1]);
      expect((await apply(ex)).reason).toMatch(/ownership: .*interventions\.target_id/);
    });
  });

  it("otro usuario no puede proponer, revisar ni aplicar un paquete ajeno", async () => {
    const id = await as(A, async () => {
      const s = await createSet([{ seq: 1, entity_type: "project", payload: { title: "P" } }]);
      await propose(s);
      return s;
    });
    await as(B, async () => {
      await expect(review(id, [1])).rejects.toThrow(/inexistente o ajeno/);
      await expect(apply(id)).rejects.toThrow(/inexistente o ajeno/);
      await expect(propose(id)).rejects.toThrow(/inexistente o ajeno/);
    });
  });

  it("completitud: toda columna uuid de las tablas del registro está cubierta por el chequeo de ownership", async () => {
    const tables = [...new Set(Object.values(ENTITY_REGISTRY).map((s) => `public.${s.table}`))];
    const cols = (await q<{ tbl: string; col: string; fk: boolean; poly: boolean }>(
      `select a.attrelid::regclass::text as tbl, a.attname as col,
              exists (select 1 from pg_constraint c where c.conrelid = a.attrelid and c.contype = 'f' and c.conkey = array[a.attnum]) as fk,
              cs_is_polymorphic(a.attrelid::regclass, a.attname) as poly
         from pg_attribute a
        where a.attrelid = any($1::regclass[]) and a.attnum > 0 and not a.attisdropped and a.atttypid = 'uuid'::regtype`,
      [tables]
    )).rows;
    const uncovered = cols.filter((c) => !c.fk && !c.poly && !["id", "user_id"].includes(c.col));
    expect(uncovered).toEqual([]);
    // Las únicas referencias dentro de jsonb son las intervenciones (cubiertas explícitamente).
    const jsonbCols = (await q<{ tbl: string; col: string }>(
      `select a.attrelid::regclass::text as tbl, a.attname as col from pg_attribute a
        where a.attrelid = any($1::regclass[]) and a.attnum > 0 and not a.attisdropped and a.atttypid = 'jsonb'::regtype order by 1, 2`, [tables]
    )).rows.map((r) => `${r.tbl}.${r.col}`);
    expect(jsonbCols).toEqual([
      "daily_logs.tiers", "decisions.after", "decisions.before", "experiments.interventions", "experiments.result",
      "funnels.stages", "hypotheses.assumptions", "hypotheses.risks", "hypotheses.scenarios",
    ]);
  });
});

// -----------------------------------------------------------------------------
describe("8. idempotencia y reaplicación", () => {
  it("aplicar dos veces no duplica: la segunda falla y no escribe", async () => {
    await as(A, async () => {
      const id = await createSet([{ seq: 1, entity_type: "project", payload: { title: "Único" } }]);
      await propose(id);
      await review(id, [1]);
      expect((await apply(id)).status).toBe("applied");
      await expect(apply(id)).rejects.toThrow(/ya fue aplicado/);
      await expect(review(id, [1])).rejects.toThrow(/solo se revisa un paquete proposed/);
      expect(await n("select 1 from projects where title = 'Único'")).toBe(1);
    });
  });

  it("un fallo deja todo como estaba; tras corregir la causa se re-propone y se aplica una sola vez", async () => {
    await as(A, async () => {
      const sys = await one<{ id: string }>("insert into systems (title, type) values ('S', 'acquisition') returning id");
      const rt = await one<{ id: string }>("insert into routines (system_id, title, metric_key, target_per_occurrence, unit, cadence, tier, valid_from) values ($1,'Contactar','contacts',30,'n','daily','p0','2026-10-07') returning id", [sys.id]);
      const blocker = await one<{ id: string }>("insert into tasks (title, routine_id, scheduled_date, status) values ('manual', $1, '2026-10-08', 'pending') returning id", [rt.id]);
      const id = await createSet([
        { seq: 1, entity_type: "project", temp_ref: "$p", payload: { title: "Reintento" } },
        { seq: 2, entity_type: "task", payload: { title: "Contactar hoy", routine_id: rt.id, scheduled_date: "2026-10-08", tier: "p0" } },
      ]);
      await propose(id);
      await review(id, [1, 2]);
      const r1 = await apply(id);
      expect(r1.status).toBe("failed");
      expect(await n("select 1 from projects where title = 'Reintento'")).toBe(0);

      await q("delete from tasks where id = $1", [blocker.id]); // se corrige la causa
      await propose(id);
      await review(id, [1, 2]);
      expect((await apply(id)).status).toBe("applied");
      expect(await n("select 1 from projects where title = 'Reintento'")).toBe(1);
      expect(await n("select 1 from tasks where routine_id = $1 and scheduled_date = '2026-10-08'", [rt.id])).toBe(1);
    });
  });

  it("revenue_receipts: idempotency_key única; monto inmutable; reversión con motivo y sin vuelta atrás", async () => {
    await as(A, async () => {
      const ins = "insert into revenue_receipts (counterparty, received_at, amount, concept, idempotency_key) values ('Cliente', '2026-10-05T15:00:00Z', 1500000, 'setup', 'bank-tx-001') returning id";
      const r = await one<{ id: string }>(ins);
      await expect(q(ins)).rejects.toThrow(/duplicate|unique/);
      await expect(q("update revenue_receipts set amount = 1 where id = $1", [r.id])).rejects.toThrow(/inmutables/);
      await expect(q("update revenue_receipts set status = 'reversed', reversed_at = now() where id = $1", [r.id])).rejects.toThrow(/check/);
      await q("update revenue_receipts set status = 'reversed', reversed_at = now(), reversal_reason = 'Pago devuelto' where id = $1", [r.id]);
      await expect(q("update revenue_receipts set status = 'received', reversed_at = null, reversal_reason = null where id = $1", [r.id])).rejects.toThrow(/no vuelve a contar/);
      expect(await one("select amount::text, currency from revenue_receipts where id = $1", [r.id])).toEqual({ amount: "1500000", currency: "COP" });
    });
  });
});

// -----------------------------------------------------------------------------
describe("5. Decisión #001 — cambio de meta a 5.000 USD (§11)", () => {
  it("propuesta → aprobación del usuario → aplicación → meta actualizada y bloqueada → trazabilidad completa", async () => {
    await as(C, async () => {
      // Estado actual replicado: meta principal de 20.000.000 COP.
      const goal = await one<{ id: string }>(
        "insert into goals (title, unit, target_value, baseline_value, deadline, status) values ('Facturar 20.000.000 COP', 'COP', 20000000, 0, '2026-12-31', 'activo') returning id"
      );
      await q("insert into profiles (id) values ($1) on conflict (id) do nothing", [C]);
      await q("update profiles set north_star_goal_id = $1 where id = $2", [goal.id, C]);

      // Fuente: la instrucción del usuario, inmutable.
      const doc = await one<{ id: string }>(
        "insert into source_documents (kind, title, content, content_hash, created_by) values ('chat_text', 'Meta definitiva', 'La meta queda definida como: 5.000 USD acumulados antes del 31/12/2026.', $1, 'user') returning id",
        ["c".repeat(64)]
      );
      const imp = await one<{ id: string }>("insert into plan_imports (source_document_id, interpreter, interpreter_version, status) values ($1, 'manual', 'decision-001', 'proposed') returning id", [doc.id]);
      const id = await createSet(
        [{ seq: 1, op: "update", entity_type: "goal", entity_id: goal.id, sensitivity: "locked", payload: { title: "Facturar 5.000 USD acumulados", unit: "USD", currency: "USD", target_value: 5000, deadline: "2026-12-31", kpi_metric_key: "revenue_received", activation_state: "active" } }],
        { kind: "goal_change", plan_import_id: imp.id }
      );
      await propose(id, { title: "Meta principal: 5.000 USD acumulados al 2026-12-31", problem: "La meta registrada (20.000.000 COP) no es la meta definitiva.", change: "Meta = 5.000 USD (moneda principal USD), deadline 2026-12-31, bloqueada.", reason: "Decisión explícita del usuario (2026-10-06). COP queda como moneda operativa de registro." });
      expect((await decisionOf(id)).number).toBe(1);
      expect((await review(id, [1])).s).toBe("approved");
      expect((await apply(id)).status).toBe("applied");

      const g = await one<{ title: string; unit: string; currency: string; target_value: string; locked_at: string | null; version: number }>(
        "select title, unit, currency, target_value::text, locked_at, version from goals where id = $1", [goal.id]
      );
      expect(g).toMatchObject({ title: "Facturar 5.000 USD acumulados", unit: "USD", currency: "USD", target_value: "5000", version: 2 });
      expect(g.locked_at).not.toBeNull();

      const d = await decisionOf(id);
      expect(d).toMatchObject({ number: 1, status: "implemented", entity_id: goal.id });
      expect(d.before).toMatchObject({ target_value: 20000000, unit: "COP", locked_at: null });
      expect(d.after).toMatchObject({ target_value: 5000, currency: "USD" });

      const trail = await one<{ content: string; number: number }>(`
        select sd.content, d.number from decisions d
          join change_sets cs on cs.id = d.change_set_id
          join plan_imports pi on pi.id = cs.plan_import_id
          join source_documents sd on sd.id = pi.source_document_id
         where d.entity_id = $1`, [goal.id]);
      expect(trail).toEqual({ content: "La meta queda definida como: 5.000 USD acumulados antes del 31/12/2026.", number: 1 });
      expect(await one("select status from plan_imports where id = $1", [imp.id])).toEqual({ status: "applied" });

      // Bloqueada: la definición no se edita directamente; el dato (valor actual) sí.
      await expect(q("update goals set target_value = 4000 where id = $1", [goal.id])).rejects.toThrow(/meta está bloqueada/);
      await expect(q("update goals set locked_at = null where id = $1", [goal.id])).rejects.toThrow(/meta está bloqueada/);
      await q("update goals set current_value = 120 where id = $1", [goal.id]);
    });
  });
});

// -----------------------------------------------------------------------------
describe("A4. instancias de rutinas (materialize_routine_instances)", () => {
  it("idempotente, con snapshot del objetivo del día y origen 'system'", async () => {
    await as(A, async () => {
      const sys = await one<{ id: string }>("insert into systems (title, type) values ('Adq', 'acquisition') returning id");
      const rt = await one<{ id: string }>("insert into routines (system_id, title, metric_key, target_per_occurrence, unit, cadence, tier, valid_from) values ($1,'Contactar','contacts',30,'contactos','weekdays','p0','2026-10-07') returning id", [sys.id]);
      const inst = [{ routine_id: rt.id, title: "Contactar", scheduled_date: "2026-10-09", target_qty: 60, unit: "contactos", metric_key: "contacts", tier: "p0", execution_mode: null, estimated_minutes: 240 }];
      expect((await one<{ n: number }>("select materialize_routine_instances($1) as n", [JSON.stringify(inst)])).n).toBe(1);
      expect((await one<{ n: number }>("select materialize_routine_instances($1) as n", [JSON.stringify(inst)])).n).toBe(0);
      const t = await one<{ target_qty: string; status: string; plan_state: string; origin: string; created_by: string; system_id: string }>(
        "select target_qty::text, status, plan_state, origin, created_by, system_id from tasks where routine_id = $1", [rt.id]
      );
      expect(t).toEqual({ target_qty: "60", status: "pending", plan_state: "today", origin: "system", created_by: "system", system_id: sys.id });
      // Cambiar la regla después no reescribe la instancia ya creada.
      await q("update routines set target_per_occurrence = 45 where id = $1", [rt.id]);
      await q("select materialize_routine_instances($1)", [JSON.stringify(inst.map((i) => ({ ...i, target_qty: 45 })))]);
      expect(await one("select target_qty::text from tasks where routine_id = $1", [rt.id])).toEqual({ target_qty: "60" });
    });
  });

  it("no crea instancias de rutinas de otro usuario", async () => {
    const sysB = await as(B, () => one<{ id: string }>("insert into systems (title, type) values ('S', 'other') returning id"));
    const rtB = await as(B, () => one<{ id: string }>("insert into routines (system_id, title, metric_key, target_per_occurrence, unit, cadence, tier, valid_from) values ($1,'r','contacts',30,'n','daily','p0','2026-10-07') returning id", [sysB.id]));
    await as(A, async () => {
      const inst = [{ routine_id: rtB.id, title: "x", scheduled_date: "2026-10-09", target_qty: 1, unit: "n", metric_key: "contacts", tier: "p0", execution_mode: null, estimated_minutes: null }];
      await expect(q("select materialize_routine_instances($1)", [JSON.stringify(inst)])).rejects.toThrow(/ownership/);
    });
    expect(await n("select 1 from tasks where routine_id = $1", [rtB.id])).toBe(0);
  });
});

// -----------------------------------------------------------------------------
describe("B2. override de P0/P1/P2 (0021)", () => {
  it("la sugerencia se conserva, el override no se pisa al recalcular, y revertir vuelve a la sugerencia", async () => {
    await as(A, async () => {
      const t = await one<{ id: string }>("insert into tasks (title, lever) values ('Llamar leads', 'sales_call') returning id");
      const sug = (tier: string) => JSON.stringify([{ id: t.id, tier, source: "rule", reason: "Regla de prioridad (palanca sales_call)" }]);
      await q("select apply_tier_suggestions($1)", [sug("p0")]);
      expect(await one("select tier, tier_source, tier_suggested from tasks where id = $1", [t.id])).toEqual({ tier: "p0", tier_source: "rule", tier_suggested: "p0" });

      await q("select set_tier_override($1, 'p2', 'Hoy delego las llamadas')", [t.id]);
      // Cambia la regla: la sugerencia se actualiza, el nivel efectivo del usuario NO.
      await q("select apply_tier_suggestions($1)", [sug("p1")]);
      expect(await one("select tier, tier_source, tier_suggested, tier_overridden_by, tier_override_reason from tasks where id = $1", [t.id])).toEqual({
        tier: "p2", tier_source: "user", tier_suggested: "p1", tier_overridden_by: "user", tier_override_reason: "Hoy delego las llamadas",
      });

      await q("select clear_tier_override($1)", [t.id]);
      expect(await one("select tier, tier_source, tier_overridden_at from tasks where id = $1", [t.id])).toEqual({ tier: "p1", tier_source: "rule", tier_overridden_at: null });

      const log = (await q<{ action: string; payload: Record<string, unknown> }>("select action, payload from activity_logs where entity_id = $1 order by created_at", [t.id])).rows;
      expect(log.map((l) => l.action)).toEqual(["tier_override_set", "tier_override_cleared"]);
      expect(log[0].payload).toMatchObject({ from: "p0", to: "p2", suggested: "p0", reason: "Hoy delego las llamadas" });
    });
  });

  it("un override sin marca de usuario es imposible; nadie cambia el nivel de una tarea ajena", async () => {
    const tB = await as(B, () => one<{ id: string }>("insert into tasks (title) values ('de B') returning id"));
    await as(A, async () => {
      await expect(q("update tasks set tier_source = 'user' where id = (select id from tasks limit 1)")).rejects.toThrow(/check/);
      await expect(q("select set_tier_override($1, 'p0', null)", [tB.id])).rejects.toThrow(/inexistente o ajena/);
    });
  });

  it("las reglas son únicas por (sistema, palanca) vigentes; archivar libera el lugar", async () => {
    await as(A, async () => {
      const r = await one<{ id: string }>("insert into priority_rules (lever, tier) values ('outbound', 'p0') returning id");
      await expect(q("insert into priority_rules (lever, tier) values ('outbound', 'p1')")).rejects.toThrow(/duplicate|unique/);
      await q("update priority_rules set archived_at = now() where id = $1", [r.id]);
      await q("insert into priority_rules (lever, tier) values ('outbound', 'p1')");
      await expect(q("insert into priority_rules (tier) values ('p1')")).rejects.toThrow(/check/);
    });
  });
});
