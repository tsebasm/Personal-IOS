import { describe, expect, it } from "vitest";
import {
  ENTITY_REGISTRY,
  ENTITY_TYPES,
  effectiveTaskStatus,
  funnelShape,
  goalShape,
  interventionShape,
  metricEntryShape,
  proposalSchema,
  taskProgress,
  tempRefsIn,
  uuid,
  validateChangeSet,
} from "./index";

const GOAL_ID = "11111111-1111-4111-8111-111111111111";

type Item = Parameters<typeof validateChangeSet>[0][number];
const item = (seq: number, p: Partial<Item> & Pick<Item, "entity_type" | "payload">): Item => ({
  seq,
  op: "create",
  entity_id: null,
  temp_ref: null,
  depends_on: [],
  sensitivity: "normal",
  ...p,
});

/** Forma del caso de aceptación de PHASE-A-DESIGN §6 ("5 clientes en 60 días vía outbound"). */
function acceptanceChangeSet(): Item[] {
  return [
    item(1, {
      entity_type: "objective",
      temp_ref: "$obj",
      sensitivity: "strategic",
      payload: { goal_id: GOAL_ID, title: "Conseguir 5 clientes", unit: "clientes", target_value: 5, deadline: "2026-12-05", metric_key: "closes" },
    }),
    item(2, { entity_type: "system", temp_ref: "$sys", sensitivity: "strategic", payload: { title: "Adquisición outbound", type: "acquisition" } }),
    item(3, { entity_type: "objective_system", payload: { objective_id: "$obj", system_id: "$sys" } }),
    ...["contacts:input", "replies:process", "meetings_booked:process", "proposals:process", "closes:output"].map((km, i) => {
      const [key, category] = km.split(":");
      return item(4 + i, { entity_type: "metric_definition", temp_ref: `$m_${key}`, payload: { key, label: key, category, unit: "n", system_id: "$sys" } });
    }),
    item(9, {
      entity_type: "funnel",
      temp_ref: "$fun",
      sensitivity: "strategic",
      depends_on: ["$m_contacts", "$m_closes"],
      payload: {
        system_id: "$sys",
        name: "Outbound",
        channel: "social_outbound",
        stages: ["contacts", "replies", "meetings_booked", "proposals", "closes"].map((k) => ({ metric_key: k, label: k })),
      },
    }),
    item(10, {
      entity_type: "hypothesis",
      temp_ref: "$hyp",
      sensitivity: "strategic",
      payload: {
        type: "volume",
        statement: "Subir de 30 a 60 contactos/día aumenta proporcionalmente las oportunidades",
        objective_id: "$obj",
        system_id: "$sys",
        mechanism: "volumen",
        confidence_level: "low",
        assumptions: [{ statement: "Baseline de 30/día", assumption_type: "assumed" }],
      },
    }),
    item(11, {
      entity_type: "roadmap_phase",
      sensitivity: "strategic",
      payload: { goal_id: GOAL_ID, hypothesis_id: "$hyp", seq: 1, name: "Experimento de volumen", start_date: "2026-10-07", expected_end: "2026-10-20" },
    }),
    item(12, { entity_type: "project", temp_ref: "$prj", payload: { title: "Campaña de adquisición outbound", objective_id: "$obj", system_id: "$sys" } }),
    item(13, {
      entity_type: "routine",
      temp_ref: "$rt",
      payload: { system_id: "$sys", title: "Contactar prospectos", metric_key: "contacts", target_per_occurrence: 30, unit: "contactos", cadence: "weekdays", tier: "p0", valid_from: "2026-10-07" },
    }),
    item(14, {
      entity_type: "experiment",
      sensitivity: "strategic",
      payload: {
        name: "Volumen 30 → 60",
        hypothesis_id: "$hyp",
        system_id: "$sys",
        metric_key: "replies",
        sample_target: 600,
        interventions: [{ target_type: "routine", target_id: "$rt", field: "target_per_occurrence", baseline: 30, value: 60, from: "2026-10-07", to: "2026-10-20" }],
      },
    }),
    item(15, { entity_type: "task", payload: { title: "Construir lista de prospectos", project_id: "$prj", tier: "p0", target_qty: 840, unit: "prospectos" } }),
  ];
}

describe("dominio: meta", () => {
  it("la meta conserva su moneda principal (5.000 USD) y el bloqueo", () => {
    const g = goalShape(uuid).parse({
      title: "Facturar 5.000 USD acumulados",
      unit: "USD",
      currency: "USD",
      target_value: 5000,
      start_date: "2026-10-06",
      deadline: "2026-12-31",
      activation_state: "active",
      locked_at: "2026-10-06T12:00:00Z",
    });
    expect(g.currency).toBe("USD");
    expect(g.target_value).toBe(5000);
    expect(g.locked_at).not.toBeNull();
  });
});

describe("dominio: tareas (§26, P-2)", () => {
  const base = { deadline: "2026-10-05", verified_at: null };
  it("vencida es derivada y solo aplica a tareas abiertas", () => {
    expect(effectiveTaskStatus({ ...base, status: "pending" }, "2026-10-06")).toBe("overdue");
    expect(effectiveTaskStatus({ ...base, status: "partially_completed" }, "2026-10-06")).toBe("overdue");
    expect(effectiveTaskStatus({ ...base, status: "pending" }, "2026-10-05")).toBe("pending");
  });
  it("completar tarde no es fallar: vuelve a completada; verificada tiene prioridad", () => {
    expect(effectiveTaskStatus({ ...base, status: "completed" }, "2026-10-09")).toBe("completed");
    expect(effectiveTaskStatus({ ...base, status: "completed", verified_at: "2026-10-09T10:00:00Z" }, "2026-10-09")).toBe("verified");
    expect(effectiveTaskStatus({ ...base, status: "blocked" }, "2026-10-09")).toBe("blocked");
  });
  it("progreso cuantificable; sin dato real no inventa 0", () => {
    expect(taskProgress({ target_qty: 30, actual_qty: 17 })).toBeCloseTo(17 / 30);
    expect(taskProgress({ target_qty: 30, actual_qty: 40 })).toBe(1);
    expect(taskProgress({ target_qty: 30, actual_qty: null })).toBeNull();
    expect(taskProgress({ target_qty: null, actual_qty: 5 })).toBeNull();
  });
});

describe("dominio: datos y estructura", () => {
  it("un dato faltante no es cero (§69)", () => {
    const entry = { metric_key: "contacts", date: "2026-10-06", source: "manual" };
    expect(metricEntryShape(uuid).safeParse({ ...entry, value: null, quality: "missing" }).success).toBe(true);
    expect(metricEntryShape(uuid).safeParse({ ...entry, value: null, quality: "self_reported" }).success).toBe(false);
  });
  it("funnel: mínimo 2 etapas y sin repetidas", () => {
    const f = { system_id: GOAL_ID, name: "x", channel: "cold_email" };
    expect(funnelShape(uuid).safeParse({ ...f, stages: [{ metric_key: "a", label: "a" }] }).success).toBe(false);
    expect(funnelShape(uuid).safeParse({ ...f, stages: [{ metric_key: "a", label: "a" }, { metric_key: "a", label: "b" }] }).success).toBe(false);
  });
  it("intervención conserva baseline y exige período coherente (P-12)", () => {
    const i = { target_type: "routine", target_id: GOAL_ID, field: "target_per_occurrence", baseline: 30, value: 60 };
    expect(interventionShape(uuid).parse({ ...i, from: "2026-10-07", to: "2026-10-20" }).baseline).toBe(30);
    expect(interventionShape(uuid).safeParse({ ...i, from: "2026-10-20", to: "2026-10-07" }).success).toBe(false);
  });
  it("las propuestas rechazan campos desconocidos (mismas reglas que la fila real)", () => {
    expect(proposalSchema("system", "create").safeParse({ title: "x", type: "acquisition", vant_only: true }).success).toBe(false);
  });
  it("el registro cubre las entidades de la spec con tablas únicas", () => {
    for (const t of ["goal", "objective", "system", "objective_system", "project", "task", "routine", "hypothesis", "experiment", "decision", "sop", "roadmap_phase", "idea", "identity_rule", "metric_definition", "metric_entry", "funnel", "evidence", "daily_log", "habit", "milestone"]) {
      expect(ENTITY_TYPES).toContain(t);
    }
    const tables = Object.values(ENTITY_REGISTRY).map((s) => s.table);
    expect(new Set(tables).size).toBe(tables.length);
  });
  it("detecta referencias temporales anidadas", () => {
    expect([...tempRefsIn({ a: "$x", b: [{ c: "$y" }], d: "texto $no" })].sort()).toEqual(["$x", "$y"]);
  });
});

describe("change sets (P-10)", () => {
  it("el caso de aceptación es válido y se ordena por dependencias", () => {
    const res = validateChangeSet(acceptanceChangeSet(), "claude");
    expect(res.errors).toEqual([]);
    const order = res.order!;
    const pos = (seq: number) => order.indexOf(seq);
    expect(pos(1)).toBeLessThan(pos(3)); // objetivo antes del enlace
    expect(pos(2)).toBeLessThan(pos(13)); // sistema antes de la rutina
    expect(pos(13)).toBeLessThan(pos(14)); // rutina antes del experimento que la interviene
    expect(pos(4)).toBeLessThan(pos(9)); // métrica antes del funnel
  });

  it("referencia sin declarar", () => {
    const res = validateChangeSet([item(1, { entity_type: "project", payload: { title: "x", system_id: "$nope" } })], "user");
    expect(res.errors.map((e) => e.code)).toContain("unresolved_ref");
  });

  it("ciclo de dependencias", () => {
    const res = validateChangeSet(
      [
        item(1, { entity_type: "project", temp_ref: "$a", depends_on: ["$b"], payload: { title: "a" } }),
        item(2, { entity_type: "project", temp_ref: "$b", depends_on: ["$a"], payload: { title: "b" } }),
      ],
      "user"
    );
    expect(res.order).toBeNull();
    expect(res.errors.map((e) => e.code)).toContain("dependency_cycle");
  });

  it("la meta no se modifica por change set: requiere el flujo de §11", () => {
    const res = validateChangeSet([item(1, { entity_type: "goal", op: "update", entity_id: GOAL_ID, sensitivity: "locked", payload: { target_value: 4000 } })], "claude");
    expect(res.errors.map((e) => e.code)).toContain("locked_change");
  });

  it("no se puede rebajar la sensibilidad de un cambio estratégico", () => {
    const res = validateChangeSet([item(1, { entity_type: "hypothesis", payload: { type: "volume", statement: "x" } })], "user");
    expect(res.errors.map((e) => e.code)).toContain("sensitivity_too_low");
  });

  it("Claude no puede proponer datos observados (§6)", () => {
    const res = validateChangeSet(
      [item(1, { entity_type: "metric_entry", payload: { metric_key: "closes", date: "2026-10-06", value: 3, source: "claude", quality: "estimated" } })],
      "claude"
    );
    expect(res.errors.map((e) => e.code)).toContain("claude_cannot_propose_data");
  });

  it("valida el payload con las reglas de dominio (tarea cuantificable sin unidad)", () => {
    const res = validateChangeSet([item(1, { entity_type: "task", payload: { title: "Contactar", target_qty: 30 } })], "user");
    expect(res.errors.map((e) => e.code)).toContain("invalid_payload");
  });

  it("operaciones incoherentes y entidades desconocidas", () => {
    const res = validateChangeSet(
      [
        item(1, { entity_type: "project", entity_id: GOAL_ID, payload: { title: "x" } }),
        item(2, { entity_type: "project", op: "update", payload: { title: "x" } }),
        item(3, { entity_type: "spaceship", payload: {} }),
      ],
      "user"
    );
    const codes = res.errors.map((e) => e.code);
    expect(codes).toEqual(expect.arrayContaining(["create_with_id", "missing_entity_id", "unknown_entity"]));
  });
});
