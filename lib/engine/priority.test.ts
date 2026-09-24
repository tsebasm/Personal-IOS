import { describe, expect, it } from "vitest";
import { computeDayCapacity } from "./capacity";
import { descendsFrom, rankActions, scoreAction, type ActionCandidate, type PriorityContext } from "./priority";

const task = (over: Partial<ActionCandidate>): ActionCandidate => ({
  id: over.title ?? "t",
  kind: "task",
  title: "t",
  priority: "media",
  impact_score: null,
  effort: null,
  goal_id: null,
  lever: null,
  deadline: null,
  scheduled_date: null,
  estimated_minutes: null,
  execution_mode: null,
  openDependencies: 0,
  ...over,
});

const ctx: PriorityContext = {
  today: "2026-09-24",
  northStarGoalId: "ns",
  goalParents: new Map([
    ["ns", null],
    ["child", "ns"],
    ["grandchild", "child"],
    ["other", null],
  ]),
  activeGoalIds: new Set(["ns", "child", "grandchild", "other"]),
  acquisitionFocus: true,
  capacity: null,
};

describe("descendsFrom", () => {
  it("recorre la jerarquía de metas", () => {
    expect(descendsFrom("grandchild", "ns", ctx.goalParents)).toBe(true);
    expect(descendsFrom("other", "ns", ctx.goalParents)).toBe(false);
  });
});

describe("scoreAction", () => {
  it("una acción comercial ligada a la North Star supera a una genérica de alta prioridad", () => {
    const sales = scoreAction(task({ title: "follow-up", goal_id: "grandchild", lever: "follow_up", impact_score: 4 }), ctx);
    const generic = scoreAction(task({ title: "ordenar escritorio", priority: "alta" }), ctx);
    expect(sales.score).toBeGreaterThan(generic.score);
    expect(sales.reasons).toContain("mueve la meta principal");
    expect(generic.reasons).toContain("sin meta vinculada");
  });

  it("lo vencido pesa más que lo que vence en un mes", () => {
    const overdue = scoreAction(task({ deadline: "2026-09-20" }), ctx);
    const later = scoreAction(task({ deadline: "2026-10-30" }), ctx);
    expect(overdue.factors.urgency).toBe(2);
    expect(later.factors.urgency).toBe(1);
  });

  it("más esfuerzo baja el score", () => {
    const easy = scoreAction(task({ effort: 1 }), ctx);
    const hard = scoreAction(task({ effort: 5 }), ctx);
    expect(easy.score).toBe(hard.score * 2);
  });

  it("sin foco de adquisición, las palancas no pesan", () => {
    const s = scoreAction(task({ lever: "sales_call" }), { ...ctx, acquisitionFocus: false });
    expect(s.factors.outcome).toBe(1);
  });
});

describe("rankActions", () => {
  it("devuelve máximo 3 prioridades y el resto como secundarias", () => {
    const items = ["a", "b", "c", "d", "e"].map((t) => task({ title: t }));
    const r = rankActions(items, ctx);
    expect(r.top).toHaveLength(3);
    expect(r.secondary).toHaveLength(2);
  });

  it("excluye tareas bloqueadas por dependencias, con el motivo", () => {
    const r = rankActions([task({ title: "bloqueada", priority: "alta", openDependencies: 1 }), task({ title: "libre" })], ctx);
    expect(r.top.map((s) => s.item.title)).toEqual(["libre"]);
    expect(r.excluded[0].note).toMatch(/dependencia/);
  });

  it("no mete en el Top un deep work que no cabe en la capacidad del día", () => {
    const capacity = computeDayCapacity(
      [
        {
          id: "x",
          label: "bus",
          kind: "transport",
          days_of_week: [4],
          start_time: "16:00",
          end_time: "18:00",
          valid_from: null,
          valid_to: null,
        },
      ],
      "2026-09-24"
    );
    const r = rankActions(
      [
        task({ title: "construir landing", priority: "alta", execution_mode: "deep", estimated_minutes: 120 }),
        task({ title: "revisar métricas", execution_mode: "passive", estimated_minutes: 20 }),
      ],
      { ...ctx, capacity }
    );
    expect(r.top.map((s) => s.item.title)).toEqual(["revisar métricas"]);
    expect(r.secondary[0].note).toMatch(/no cabe/);
    expect(r.allocated.passive).toBe(20);
  });
});
