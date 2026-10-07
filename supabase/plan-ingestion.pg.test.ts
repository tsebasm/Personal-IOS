import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, createUser, migratedDb } from "./pg-harness";
import { applyChangeSet, createChangeSet, proposeChangeSet, reviewChangeSet, type Db } from "@/lib/intelligence/change-sets";
import { TemplateInterpreter } from "@/lib/intelligence/template-interpreter";
import { PLAN_FIXTURE } from "@/lib/intelligence/fixtures/plan-outbound";
import { instanceProgress, materializeRoutines, type ExperimentLike, type RoutineLike } from "@/lib/engine/routines";

/**
 * CRITERIO DE ACEPTACIÓN DE LA FASE A (PHASE-A-DESIGN §6), de punta a punta:
 * documento → interpretación → propuesta → validación → aprobación humana →
 * estructura → ejecución (instancias diarias) → datos → avance.
 * Usa el servicio real (permisos + validación de dominio) sobre Postgres real.
 */

const U = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const T = 60_000;



let db: PGlite;
const one = async <R = Record<string, unknown>>(sql: string, p: unknown[] = []) => (await db.query<R>(sql, p)).rows[0];
const all = async <R = Record<string, unknown>>(sql: string, p: unknown[] = []) => (await db.query<R>(sql, p)).rows;

const toParam = (v: unknown) => (v !== null && typeof v === "object" && !Array.isArray(v) ? JSON.stringify(v) : v);

/** Adaptador PGlite → la interfaz Db del servicio (lo mínimo de supabase-js que usa). */
function pgDb(): Db {
  return {
    from: (table) => ({
      insert: (values) => ({
        select: () => ({
          single: async () => {
            const row = values as Record<string, unknown>;
            const cols = Object.keys(row);
            try {
              const r = await one<{ id: string }>(
                `insert into ${table} (${cols.join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")}) returning id`,
                cols.map((c) => toParam(row[c]))
              );
              return { data: r, error: null };
            } catch (e) {
              return { data: null, error: { message: (e as Error).message } };
            }
          },
        }),
      }),
    }),
    rpc: async (fn, args) => {
      const keys = Object.keys(args);
      try {
        const r = await one<{ r: unknown }>(`select ${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as r`, keys.map((k) => toParam(args[k])));
        return { data: r.r, error: null };
      } catch (e) {
        return { data: null, error: { message: (e as Error).message } };
      }
    },
  };
}

beforeAll(async () => {
  db = await migratedDb();
  await createUser(db, U);
}, T);

describe("Fase A — criterio de aceptación: plan → estructura → ejecución", () => {
  it("“5 clientes en 60 días vía outbound, 30→60 durante 14 días” se convierte en estructura operativa trazable", async () => {
    await asUser(db, U, async () => {
      // Meta principal bloqueada (5.000 USD): el plan NO la toca; cuelga un objetivo de ella.
      const goal = await one<{ id: string }>(
        "insert into goals (title, unit, currency, target_value, deadline, locked_at, activation_state) values ('Facturar 5.000 USD acumulados','USD','USD',5000,'2026-12-31', now(), 'active') returning id"
      );

      // 1. INGESTA: el documento tal cual, inmutable.
      const doc = await one<{ id: string }>(
        "insert into source_documents (kind, title, content, content_hash, created_by) values ('upload', 'Plan outbound', $1, $2, 'user') returning id",
        [PLAN_FIXTURE, createHash("sha256").update(PLAN_FIXTURE).digest("hex")]
      );

      // 2. INTERPRETACIÓN (determinista, sin IA).
      const ctx = { today: "2026-10-06", goal: { id: goal.id, title: "Facturar 5.000 USD acumulados", locked: true }, systems: [], metricKeys: [] };
      const interp = new TemplateInterpreter().interpret(PLAN_FIXTURE, ctx);
      expect(interp.inconsistencies).toEqual([]);
      expect(interp.questions).toEqual([]);
      expect(interp.detected).toMatchObject({ objective: "Conseguir 5 clientes", system: "Adquisición outbound", experiment: "Volumen 30 → 60", routines: ["Contactar prospectos"] });
      const imp = await one<{ id: string }>(
        "insert into plan_imports (source_document_id, interpreter, interpreter_version, status, detected, inconsistencies, questions) values ($1,'template',$2,'proposed',$3,$4,$5) returning id",
        [doc.id, interp.interpreterVersion, JSON.stringify(interp.detected), JSON.stringify(interp.inconsistencies), JSON.stringify(interp.questions)]
      );

      // 3. PROPUESTA + VALIDACIÓN (dominio) → 4. APROBACIÓN HUMANA → 5. ESTRUCTURA.
      const cs = interp.changeSet!;
      const pdb = pgDb();
      const id = await createChangeSet(pdb, "user", { title: cs.title, rationale: cs.rationale, planImportId: imp.id, items: cs.items });
      await proposeChangeSet(pdb, "user", id, cs.decision);
      await reviewChangeSet(pdb, "user", id, cs.items.map((i) => i.seq), []);
      const result = await applyChangeSet(pdb, "user", id);
      expect(result.status).toBe("applied");

      // Árbol: META → OBJETIVO ⇄ SISTEMA → {funnel, métricas, rutina, hipótesis → experimento → intervención, roadmap, proyecto → tareas}
      const obj = await one<{ id: string; goal_id: string; target_value: string; deadline: string; origin: string }>(
        "select id, goal_id, target_value::text, deadline::text, origin from objectives where title = 'Conseguir 5 clientes'"
      );
      expect(obj).toMatchObject({ goal_id: goal.id, target_value: "5", deadline: "2026-12-05", origin: "import" });
      const sys = await one<{ id: string; type: string }>("select s.id, s.type from systems s join objective_systems os on os.system_id = s.id where os.objective_id = $1", [obj.id]);
      expect(sys.type).toBe("acquisition");
      const funnel = await one<{ stages: { metric_key: string }[] }>("select stages from funnels where system_id = $1", [sys.id]);
      expect(funnel.stages.map((s) => s.metric_key)).toEqual(["contacts", "replies", "meetings_booked", "proposals", "closes"]);
      expect(await all("select key, category from metric_definitions order by key")).toEqual([
        { key: "closes", category: "output" },
        { key: "contacts", category: "input" },
        { key: "meetings_booked", category: "process" },
        { key: "proposals", category: "process" },
        { key: "replies", category: "process" },
      ]);
      const hyp = await one<{ id: string; assumptions: { assumption_type: string }[]; confidence_level: string }>("select id, assumptions, confidence_level from hypotheses where objective_id = $1", [obj.id]);
      expect(hyp.assumptions[0].assumption_type).toBe("assumed");
      expect(hyp.confidence_level).toBe("low");
      const rt = await one<{ id: string; target_per_occurrence: string; tier: string }>("select id, target_per_occurrence::text, tier from routines where system_id = $1", [sys.id]);
      expect(rt).toMatchObject({ target_per_occurrence: "30", tier: "p0" });
      const exp = await one<{ hypothesis_id: string; status: string; interventions: { target_id: string; value: number; to: string }[] }>(
        "select hypothesis_id, status, interventions from experiments where system_id = $1", [sys.id]
      );
      expect(exp).toMatchObject({ hypothesis_id: hyp.id, status: "running" });
      expect(exp.interventions[0]).toMatchObject({ target_id: rt.id, value: 60, to: "2026-10-20" });
      expect(await all("select seq, name, start_date::text, expected_end::text from roadmap_phases where goal_id = $1 order by seq", [goal.id])).toEqual([
        { seq: 1, name: "Experimento: Volumen 30 → 60", start_date: "2026-10-07", expected_end: "2026-10-20" },
        { seq: 2, name: "Ejecución con la decisión del experimento", start_date: "2026-10-21", expected_end: "2026-12-05" },
      ]);
      const prj = await one<{ id: string }>("select id from projects where objective_id = $1 and system_id = $2", [obj.id, sys.id]);
      expect(await all("select title, tier, target_qty::text from tasks where project_id = $1 order by title", [prj.id])).toEqual([
        { title: "Construir lista de prospectos", tier: "p0", target_qty: "840" },
        { title: "Preparar guion de outbound", tier: "p1", target_qty: null },
      ]);

      // Trazabilidad: cualquier entidad responde "¿de dónde salió?" hasta el documento.
      const trail = await one<{ title: string; interpreter: string; number: number }>(`
        select sd.title, pi.interpreter, d.number from experiments e
          join change_items ci on ci.id = e.origin_change_item_id
          join change_sets cs on cs.id = ci.change_set_id
          join plan_imports pi on pi.id = cs.plan_import_id
          join source_documents sd on sd.id = pi.source_document_id
          join decisions d on d.id = cs.decision_id
         where e.system_id = $1`, [sys.id]);
      expect(trail).toMatchObject({ title: "Plan outbound", interpreter: "template" });
      expect((await one<{ status: string }>("select status from decisions where change_set_id = $1", [id])).status).toBe("implemented");
      // La meta bloqueada no se tocó.
      expect(await one("select target_value::text, version from goals where id = $1", [goal.id])).toEqual({ target_value: "5000", version: 1 });

      // 6. EJECUCIÓN: las rutinas generan las tareas del día; el experimento las ajusta.
      const routines = (await all<RoutineLike>("select id, system_id, title, metric_key, target_per_occurrence, unit, cadence, days_of_week, tier, execution_mode, estimated_minutes_per_unit, valid_from::text, valid_to::text, status, archived_at from routines")).map((r) => ({ ...r, target_per_occurrence: Number(r.target_per_occurrence) }));
      const experiments = await all<ExperimentLike>("select id, name, status, interventions from experiments");
      const day3 = materializeRoutines(routines, experiments, "2026-10-09");
      const day20 = materializeRoutines(routines, experiments, "2026-10-26");
      expect(day3.map((i) => i.target_qty)).toEqual([60]);
      expect(day20.map((i) => i.target_qty)).toEqual([30]);
      await one("select materialize_routine_instances($1)", [JSON.stringify([...day3, ...day20])]);
      expect(await all("select scheduled_date::text, target_qty::text, tier from tasks where routine_id = $1 order by scheduled_date", [rt.id])).toEqual([
        { scheduled_date: "2026-10-09", target_qty: "60", tier: "p0" },
        { scheduled_date: "2026-10-26", target_qty: "30", tier: "p0" },
      ]);

      // 7. DATOS → AVANCE (derivado, sin contador duplicado).
      await one("insert into metric_entries (metric_key, date, value, source, quality, system_id) values ('contacts','2026-10-09',47,'manual','self_reported',$1)", [sys.id]);
      const values = (await all<{ metric_key: string; date: string; value: string }>("select metric_key, date::text, value::text from metric_entries")).map((v) => ({ ...v, value: Number(v.value) }));
      expect(instanceProgress({ metric_key: "contacts", scheduled_date: "2026-10-09", target_qty: 60 }, values)).toEqual({ actual: 47, progress: 47 / 60 });
    });
  }, T);
});
