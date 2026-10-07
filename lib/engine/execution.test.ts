import { describe, expect, it } from "vitest";
import { dailyActuals, executionScore, paceGap, paceStatus, taskCompletion, type DayTask } from "./execution";

describe("ritmo en 6 estados (§48)", () => {
  it("clasifica por ritmo real ÷ requerido", () => {
    expect(paceStatus(100, 160).state).toBe("very_ahead");
    expect(paceStatus(100, 115).state).toBe("ahead");
    expect(paceStatus(100, 96).state).toBe("on_pace");
    expect(paceStatus(100, 85).state).toBe("slightly_behind");
    expect(paceStatus(100, 60).state).toBe("behind");
    expect(paceStatus(100, 20).state).toBe("critically_behind");
  });
  it("sin requerimiento, meta lograda o sin ritmo real: no inventa un estado", () => {
    expect(paceStatus(null, 10)).toEqual({ state: null, reason: "no_requirement" });
    expect(paceStatus(0, 10)).toEqual({ state: null, reason: "achieved" });
    expect(paceStatus(50, null)).toEqual({ state: null, reason: "no_actual" });
  });
  it("brecha diaria y proyectada a 7 días (§62)", () => {
    expect(paceGap(30, 12)).toEqual({ daily: 18, weekly: 126 });
    expect(paceGap(30, 40)).toEqual({ daily: 0, weekly: 0 });
  });
});

describe("completitud y score de ejecución (§50)", () => {
  const contact: DayTask = { id: "1", title: "Contactar", tier: "p0", done: false, target_qty: 60, unit: "contactos", metric_key: "contacts" };
  it("una tarea cuantificable se completa por sus datos, no por una casilla", () => {
    expect(taskCompletion(contact, 17)).toEqual({ actual: 17, progress: 17 / 60, complete: false });
    expect(taskCompletion(contact, 60).complete).toBe(true);
    expect(taskCompletion(contact, null)).toEqual({ actual: null, progress: null, complete: false });
  });
  it("score = requeridas (P0+P1) completadas ÷ planificadas; P2 no cuenta; P0 pendiente se informa", () => {
    const s = executionScore([
      { tier: "p0", complete: false },
      { tier: "p0", complete: true },
      { tier: "p1", complete: true },
      { tier: "p2", complete: false },
    ]);
    expect(s.score).toBe(67);
    expect(s.byTier).toEqual({ p0: { planned: 2, done: 1 }, p1: { planned: 1, done: 1 }, p2: { planned: 1, done: 0 } });
    expect(s.p0Pending).toBe(1);
    expect(s.missionComplete).toBe(false);
  });
  it("misión principal completada cuando todo P0 está hecho; sin plan, score nulo", () => {
    expect(executionScore([{ tier: "p0", complete: true }, { tier: "p1", complete: false }]).missionComplete).toBe(true);
    expect(executionScore([{ tier: "p2", complete: true }]).score).toBeNull();
  });
  it("suma del día por métrica", () => {
    const m = dailyActuals(
      [
        { metric_key: "contacts", date: "2026-10-09", value: 30 },
        { metric_key: "contacts", date: "2026-10-09", value: 17 },
        { metric_key: "contacts", date: "2026-10-08", value: 5 },
      ],
      "2026-10-09"
    );
    expect(m.get("contacts")).toBe(47);
  });
});
