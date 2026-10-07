import { describe, expect, it } from "vitest";
import { validateChangeSet } from "@/lib/domain/registry";
import { TemplateInterpreter } from "./template-interpreter";
import type { StrategyContext } from "./interpreter";
import { PLAN_FIXTURE } from "./fixtures/plan-outbound";

const GOAL = { id: "11111111-1111-4111-8111-111111111111", title: "Facturar 5.000 USD", locked: true };
const ctx: StrategyContext = { today: "2026-10-06", goal: GOAL, systems: [], metricKeys: [] };
const interp = (content: string, c = ctx) => new TemplateInterpreter().interpret(content, c);

describe("intérprete de plantilla (A5)", () => {
  it("el change set que produce es válido para el dominio (mismas reglas que las filas reales)", () => {
    const r = interp(PLAN_FIXTURE);
    expect(r.changeSet).not.toBeNull();
    const v = validateChangeSet(r.changeSet!.items, "user");
    expect(v.errors).toEqual([]);
    expect(r.changeSet!.items.map((i) => i.entity_type)).toEqual([
      "objective", "system", "objective_system",
      "metric_definition", "metric_definition", "metric_definition", "metric_definition", "metric_definition",
      "funnel", "hypothesis", "routine", "experiment", "roadmap_phase", "roadmap_phase", "project", "task", "task",
    ]);
  });

  it("sin meta principal no inventa una: pregunta y no propone nada", () => {
    const r = interp(PLAN_FIXTURE, { ...ctx, goal: null });
    expect(r.changeSet).toBeNull();
    expect(r.questions.map((q) => q.id)).toContain("goal_missing");
  });

  it("reutiliza un sistema existente (P-15) y lo pregunta en vez de duplicarlo", () => {
    const existing = { id: "22222222-2222-4222-8222-222222222222", title: "adquisicion OUTBOUND" };
    const r = interp(PLAN_FIXTURE, { ...ctx, systems: [existing], metricKeys: ["contacts", "replies"] });
    const types = r.changeSet!.items.map((i) => i.entity_type);
    expect(types).not.toContain("system");
    expect(types.filter((t) => t === "metric_definition")).toHaveLength(3); // contacts y replies ya existen
    expect(r.changeSet!.items.find((i) => i.entity_type === "routine")!.payload.system_id).toBe(existing.id);
    expect(r.questions.map((q) => q.id)).toContain("system_reused");
    expect(validateChangeSet(r.changeSet!.items, "user").ok).toBe(true);
  });

  it("si no se dice si el valor base es medido, lo marca como supuesto y lo pregunta (§18)", () => {
    const r = interp(PLAN_FIXTURE.replace("- base: supuesto\n", ""));
    expect(r.questions.map((q) => q.id)).toContain("baseline_kind");
    const hyp = r.changeSet!.items.find((i) => i.entity_type === "hypothesis")!;
    expect((hyp.payload.assumptions as { assumption_type: string }[])[0].assumption_type).toBe("assumed");
  });

  it("detecta inconsistencias: intervención sobre una rutina que no existe, tareas sin nivel, inicio no declarado", () => {
    const bad = PLAN_FIXTURE.replace("Contactar prospectos = 60", "Llamar en frío = 60")
      .replace("- [p1] Preparar guion de outbound", "- Preparar guion de outbound")
      .replace("inicio: 2026-10-07\n", "");
    const r = interp(bad);
    expect(r.inconsistencies.map((i) => i.code)).toEqual(expect.arrayContaining(["intervention_target_unknown", "task_unparsed", "assumed_start"]));
    expect(r.changeSet).toBeNull(); // una intervención ambigua no se convierte en realidad
  });

  it("un plan nunca toca la meta: no hay ningún ítem sobre goal", () => {
    expect(interp(PLAN_FIXTURE).changeSet!.items.some((i) => i.entity_type === "goal")).toBe(false);
  });
});
