import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { applyMigrationsAfter, applySqlFile, asUser, createUser, migratedDb } from "./pg-harness";

/**
 * Migraciones sobre Postgres real (PGlite): se aplican en orden, la migración de
 * datos de C-4 es correcta y reversible, los datos previos se conservan, las
 * restricciones de la Fase A se cumplen y RLS no expone datos de otro usuario.
 */

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const T = 60_000;

const NEW_TABLES = [
  "objectives", "systems", "objective_systems", "metric_definitions", "funnels", "roadmap_phases",
  "project_dependencies", "sops", "decisions", "identity_rules", "ideas", "routines", "evidence",
  "metric_entries", "daily_logs", "fx_rates", "source_documents", "plan_imports", "change_sets", "change_items",
];

const one = async <R = Record<string, unknown>>(db: PGlite, sql: string, params: unknown[] = []) =>
  (await db.query<R>(sql, params)).rows[0];
const count = async (db: PGlite, sql: string, params: unknown[] = []) =>
  Number((await one<{ n: number }>(db, `select count(*)::int as n from (${sql}) q`, params)).n);
const HASH = "a".repeat(64);

describe("migraciones 0001 → 0018 sobre Postgres", () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await migratedDb();
    await createUser(db, A);
    await createUser(db, B);
  }, T);

  it("toda tabla nueva tiene RLS activo y sus 4 políticas por auth.uid() = user_id", async () => {
    for (const t of NEW_TABLES) {
      const rls = await one<{ r: boolean }>(db, "select relrowsecurity as r from pg_class where oid = $1::regclass", [`public.${t}`]);
      expect(rls.r, `RLS en ${t}`).toBe(true);
      const pols = (await db.query<{ cmd: string; qual: string | null; with_check: string | null }>(
        "select cmd, qual, with_check from pg_policies where schemaname = 'public' and tablename = $1", [t]
      )).rows;
      expect(pols.map((p) => p.cmd).sort(), `políticas en ${t}`).toEqual(["DELETE", "INSERT", "SELECT", "UPDATE"]);
      for (const p of pols) expect(`${p.qual ?? ""} ${p.with_check ?? ""}`).toMatch(/auth\.uid\(\) = user_id/);
    }
  });

  it("RLS: otro usuario no ve, no modifica, no borra ni inserta a nombre ajeno", async () => {
    const sys = await asUser(db, A, () => one<{ id: string }>(db, "insert into systems (title, type) values ('Adquisición', 'acquisition') returning id"));
    await asUser(db, A, () => db.query("insert into fx_rates (base_currency, quote_currency, rate, rate_date, source) values ('USD','COP',3900,'2026-10-01','TRM')"));
    await asUser(db, A, () => db.query("insert into source_documents (kind, title, content, content_hash, created_by) values ('chat_text','plan','texto',$1,'user')", [HASH]));

    await asUser(db, B, async () => {
      expect(await count(db, "select 1 from systems")).toBe(0);
      expect(await count(db, "select 1 from fx_rates")).toBe(0);
      expect(await count(db, "select 1 from source_documents")).toBe(0);
      const upd = await db.query("update systems set title = 'robado' where id = $1", [sys.id]);
      expect(upd.affectedRows ?? 0).toBe(0);
      const del = await db.query("delete from systems where id = $1", [sys.id]);
      expect(del.affectedRows ?? 0).toBe(0);
      await expect(db.query("insert into systems (user_id, title, type) values ($1, 'x', 'other')", [A])).rejects.toThrow(/row-level security/);
    });
    const still = await one<{ title: string }>(db, "select title from systems where id = $1", [sys.id]);
    expect(still.title).toBe("Adquisición");
  });

  it("decisiones: número correlativo por usuario y aprobación humana obligatoria", async () => {
    const ins = "insert into decisions (title, problem, change, reason, proposed_by) values ('d','p','c','r','user') returning number";
    const a1 = await asUser(db, A, () => one<{ number: number }>(db, ins));
    const a2 = await asUser(db, A, () => one<{ number: number }>(db, ins));
    const b1 = await asUser(db, B, () => one<{ number: number }>(db, ins));
    expect([a1.number, a2.number, b1.number]).toEqual([1, 2, 1]);
    await expect(
      asUser(db, A, () => db.query("insert into decisions (title, problem, change, reason, proposed_by, status) values ('d','p','c','r','claude','approved')"))
    ).rejects.toThrow(/check/);
  });

  it("change sets (C-3): nacen en draft y su estado no se cambia por fuera del motor (0019)", async () => {
    await asUser(db, A, async () => {
      await expect(db.query("insert into change_sets (title, proposed_by, status, approved_by, approved_at) values ('x','claude','approved','claude', now())")).rejects.toThrow();
      await expect(db.query("insert into change_sets (title, proposed_by, status) values ('x','claude','approved')")).rejects.toThrow(/nace en draft/);
      const cs = await one<{ id: string }>(db, "insert into change_sets (title, proposed_by) values ('x','claude') returning id");
      await expect(db.query("update change_sets set status = 'approved', approved_by = 'user', approved_at = now() where id = $1", [cs.id])).rejects.toThrow(/solo cambia mediante/);
    });
    // Ciclo completo y estados terminales: change-set-engine.pg.test.ts
  });

  it("trazabilidad: entidad → change_item → change_set → plan_import → source_document", async () => {
    const trail = await asUser(db, A, async () => {
      const doc = await one<{ id: string }>(db, "insert into source_documents (kind, title, content, content_hash, created_by) values ('chat_text','p2','otro texto',$1,'user') returning id", ["b".repeat(64)]);
      const imp = await one<{ id: string }>(db, "insert into plan_imports (source_document_id, interpreter, interpreter_version) values ($1,'template','v1') returning id", [doc.id]);
      const cs = await one<{ id: string }>(db, "insert into change_sets (plan_import_id, title, proposed_by) values ($1,'plan','user') returning id", [imp.id]);
      const ci = await one<{ id: string }>(db, "insert into change_items (change_set_id, seq, op, entity_type, temp_ref, payload, sensitivity) values ($1,1,'create','system','$sys','{}','strategic') returning id", [cs.id]);
      await db.query("insert into systems (title, type, origin, origin_change_item_id, created_by) values ('Outbound','acquisition','import',$1,'user')", [ci.id]);
      return one<{ content: string }>(db, `
        select d.content from systems s
          join change_items ci on ci.id = s.origin_change_item_id
          join change_sets cs on cs.id = ci.change_set_id
          join plan_imports pi on pi.id = cs.plan_import_id
          join source_documents d on d.id = pi.source_document_id
         where s.title = 'Outbound'`);
    });
    expect(trail.content).toBe("otro texto");
  });

  it("restricciones de dominio en la base", async () => {
    await asUser(db, A, async () => {
      // documento fuente inmutable
      await expect(db.query("update source_documents set content = 'cambiado' where content_hash = $1", [HASH])).rejects.toThrow(/inmutable/);
      // un faltante no es cero
      await expect(db.query("insert into metric_entries (metric_key, date, value, source, quality) values ('contacts','2026-10-06',null,'manual','self_reported')")).rejects.toThrow(/check/);
      await db.query("insert into metric_entries (metric_key, date, value, source, quality) values ('contacts','2026-10-06',null,'manual','missing')");
      // tasa de cambio: monedas distintas, positiva, con fuente
      await expect(db.query("insert into fx_rates (base_currency, quote_currency, rate, rate_date, source) values ('USD','USD',1,'2026-10-02','x')")).rejects.toThrow(/check/);
      await expect(db.query("insert into fx_rates (base_currency, quote_currency, rate, rate_date, source) values ('USD','COP',0,'2026-10-02','x')")).rejects.toThrow(/check/);
      await expect(db.query("insert into fx_rates (base_currency, quote_currency, rate, rate_date, source) values ('USD','COP',3900,'2026-10-02','  ')")).rejects.toThrow(/check/);
      // rutina custom sin días; tarea cuantificable sin unidad
      const sys = await one<{ id: string }>(db, "insert into systems (title, type) values ('S','other') returning id");
      await expect(db.query("insert into routines (system_id, title, metric_key, target_per_occurrence, unit, cadence, tier, valid_from) values ($1,'r','contacts',30,'n','custom','p0','2026-10-07')", [sys.id])).rejects.toThrow(/check/);
      await expect(db.query("insert into tasks (title, target_qty) values ('t', 30)")).rejects.toThrow(/check/);
      // una instancia por rutina y día
      const r = await one<{ id: string }>(db, "insert into routines (system_id, title, metric_key, target_per_occurrence, unit, cadence, tier, valid_from) values ($1,'r','contacts',30,'n','weekdays','p0','2026-10-07') returning id", [sys.id]);
      await db.query("insert into tasks (title, routine_id, scheduled_date, status) values ('i', $1, '2026-10-07', 'pending')", [r.id]);
      await expect(db.query("insert into tasks (title, routine_id, scheduled_date, status) values ('i', $1, '2026-10-07', 'pending')", [r.id])).rejects.toThrow(/duplicate|unique/);
      // experimento evaluado sin decisión; decisión antigua 'change' ya no es válida
      await expect(db.query("insert into experiments (name, status) values ('e','evaluated')")).rejects.toThrow(/check/);
      await expect(db.query("insert into experiments (name, status, decision) values ('e','finished','change')")).rejects.toThrow(/check/);
      await db.query("insert into experiments (name, status, decision) values ('e','finished','revert')");
    });
  });
});

describe("migración de datos: datos previos a 0017", () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await migratedDb("0016_ai_message_types.sql");
    await createUser(db, A);
    await asUser(db, A, async () => {
      await db.query("insert into experiments (name, status, decision) values ('cambió', 'finished', 'change'), ('mantuvo', 'finished', 'keep'), ('en curso', 'running', null)");
      await db.query("insert into tasks (title, status) values ('hoy', 'today'), ('hecha', 'done'), ('esperando', 'waiting')");
      await db.query("insert into goals (title, status) values ('activa', 'activo'), ('pausada', 'pausado')");
    });
    await applyMigrationsAfter(db, "0016_ai_message_types.sql");
  }, T);

  it("C-4: 'change' → 'modify' auditado; el resto intacto", async () => {
    const rows = (await db.query<{ name: string; decision: string | null }>("select name, decision from experiments order by name")).rows;
    expect(rows).toEqual([
      { name: "cambió", decision: "modify" },
      { name: "en curso", decision: null },
      { name: "mantuvo", decision: "keep" },
    ]);
    const audit = await one<{ n: number; payload: { from: string; to: string } }>(
      db, "select count(*) over ()::int as n, payload from activity_logs where action = 'migration_0017_decision_renamed'"
    );
    expect(audit.n).toBe(1);
    expect(audit.payload).toMatchObject({ from: "change", to: "modify" });
  });

  it("tareas y metas existentes conservan su estado; se separa el de planificación", async () => {
    const tasks = (await db.query<{ title: string; status: string; plan_state: string | null }>("select title, status, plan_state from tasks order by title")).rows;
    expect(tasks).toEqual([
      { title: "esperando", status: "waiting", plan_state: null },
      { title: "hecha", status: "done", plan_state: null },
      { title: "hoy", status: "today", plan_state: "today" },
    ]);
    const goals = (await db.query<{ title: string; status: string; activation_state: string; locked_at: string | null }>(
      "select title, status, activation_state, locked_at from goals order by title"
    )).rows;
    expect(goals).toEqual([
      { title: "activa", status: "activo", activation_state: "active", locked_at: null },
      { title: "pausada", status: "pausado", activation_state: "queued", locked_at: null },
    ]);
    const prov = await one<{ origin: string; created_by: string; version: number }>(db, "select origin, created_by, version from goals limit 1");
    expect(prov).toEqual({ origin: "manual", created_by: "user", version: 1 });
  });

  it("C-4 es reversible y la reversión queda registrada", async () => {
    await applySqlFile(db, path.join(__dirname, "rollback", "0017_experiment_decision_down.sql"));
    const d = await one<{ decision: string }>(db, "select decision from experiments where name = 'cambió'");
    expect(d.decision).toBe("change");
    expect(await count(db, "select 1 from activity_logs where action = 'migration_0017_decision_reverted'")).toBe(1);
    expect(await count(db, "select 1 from activity_logs where action = 'migration_0017_decision_renamed'")).toBe(1);
  });

  it("la reversión aborta sin cambios si ya hay decisiones nuevas (no pierde información)", async () => {
    const fresh = await migratedDb();
    await createUser(fresh, A);
    await asUser(fresh, A, () => fresh.query("insert into experiments (name, status, decision) values ('nuevo', 'finished', 'revert')"));
    await expect(applySqlFile(fresh, path.join(__dirname, "rollback", "0017_experiment_decision_down.sql"))).rejects.toThrow(/no se puede restaurar/);
    await fresh.exec("rollback");
    const d = await one<{ decision: string }>(fresh, "select decision from experiments where name = 'nuevo'");
    expect(d.decision).toBe("revert");
    // el CHECK nuevo sigue vigente
    await expect(asUser(fresh, A, () => fresh.query("insert into experiments (name, status, decision) values ('x','finished','change')"))).rejects.toThrow(/check/);
  }, T);
});
