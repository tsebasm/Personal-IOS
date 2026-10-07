import { describe, expect, it } from "vitest";
import { effectiveTarget, instanceProgress, materializeRoutines, routineOccursOn, type ExperimentLike, type RoutineLike } from "./routines";

const outbound: RoutineLike = {
  id: "rt-1",
  system_id: "sys-1",
  title: "Contactar prospectos",
  metric_key: "contacts",
  target_per_occurrence: 30,
  unit: "contactos",
  cadence: "weekdays",
  days_of_week: [],
  tier: "p0",
  execution_mode: "shallow",
  estimated_minutes_per_unit: 4,
  valid_from: "2026-10-07",
  valid_to: null,
  status: "active",
};

const volumeExperiment = (status = "running"): ExperimentLike => ({
  id: "exp-1",
  name: "Volumen 30 → 60",
  status,
  interventions: [{ target_type: "routine", target_id: "rt-1", field: "target_per_occurrence", baseline: 30, value: 60, from: "2026-10-07", to: "2026-10-20" }],
});

describe("rutinas → instancias diarias (P-11)", () => {
  it("cadencia laborable: lunes a viernes, nada el fin de semana", () => {
    expect(routineOccursOn(outbound, "2026-10-09")).toBe(true); // viernes
    expect(routineOccursOn(outbound, "2026-10-10")).toBe(false); // sábado
    expect(routineOccursOn({ ...outbound, cadence: "custom", days_of_week: [2, 4] }, "2026-10-08")).toBe(true); // jueves
    expect(routineOccursOn({ ...outbound, cadence: "custom", days_of_week: [2, 4] }, "2026-10-09")).toBe(false);
  });

  it("solo rutinas vigentes: activas, no archivadas, dentro de su período", () => {
    expect(materializeRoutines([outbound], [], "2026-10-06")).toEqual([]); // antes de valid_from
    expect(materializeRoutines([{ ...outbound, status: "paused" }], [], "2026-10-08")).toEqual([]);
    expect(materializeRoutines([{ ...outbound, archived_at: "2026-10-01T00:00:00Z" }], [], "2026-10-08")).toEqual([]);
    expect(materializeRoutines([{ ...outbound, valid_to: "2026-10-07" }], [], "2026-10-08")).toEqual([]);
  });

  it("criterio de aceptación: con el experimento en curso, día 3 = 60; día 20 vuelve al valor base 30", () => {
    const exps = [volumeExperiment()];
    const day3 = materializeRoutines([outbound], exps, "2026-10-09")[0];
    expect(day3).toMatchObject({ target_qty: 60, tier: "p0", metric_key: "contacts", estimated_minutes: 240 });
    expect(day3.trace).toMatch(/experimento "Volumen 30 → 60" \(valor base 30\)/);
    const day20 = materializeRoutines([outbound], exps, "2026-10-26")[0];
    expect(day20.target_qty).toBe(30);
    expect(outbound.target_per_occurrence).toBe(30); // la rutina nunca se modifica
  });

  it("una intervención solo actúa si el experimento está en curso", () => {
    expect(effectiveTarget(outbound, "2026-10-09", [volumeExperiment("designed")]).value).toBe(30);
    expect(effectiveTarget(outbound, "2026-10-09", [volumeExperiment("finished")]).value).toBe(30);
  });

  it("intervenciones superpuestas: se usa el valor base y se avisa (no se elige un ganador en silencio)", () => {
    const other: ExperimentLike = { ...volumeExperiment(), id: "exp-2", name: "Volumen 45" };
    other.interventions = [{ ...other.interventions[0], value: 45 }];
    const t = effectiveTarget(outbound, "2026-10-09", [volumeExperiment(), other]);
    expect(t).toMatchObject({ value: 30, source: "routine", conflict: ["Volumen 30 → 60", "Volumen 45"] });
    expect(materializeRoutines([outbound], [volumeExperiment(), other], "2026-10-09")[0].trace).toMatch(/superpuestas/);
  });
});

describe("avance derivado de datos reales (no de un contador)", () => {
  const instance = { metric_key: "contacts", scheduled_date: "2026-10-09", target_qty: 60 };
  it("suma los registros del día de esa métrica", () => {
    const values = [
      { metric_key: "contacts", date: "2026-10-09", value: 30 },
      { metric_key: "contacts", date: "2026-10-09", value: 17 },
      { metric_key: "contacts", date: "2026-10-08", value: 99 },
      { metric_key: "replies", date: "2026-10-09", value: 5 },
    ];
    expect(instanceProgress(instance, values)).toEqual({ actual: 47, progress: 47 / 60 });
  });
  it("sin datos el avance es desconocido, no cero (§69)", () => {
    expect(instanceProgress(instance, [{ metric_key: "contacts", date: "2026-10-09", value: null }])).toEqual({ actual: null, progress: null });
  });
});
