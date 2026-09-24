import { describe, expect, it } from "vitest";
import { actionableMinutes, blockMinutes, computeDayCapacity, computeWeekCapacity, weekdayOf, type CapacityBlock } from "./capacity";

const block = (over: Partial<CapacityBlock>): CapacityBlock => ({
  id: over.label ?? "b",
  label: "b",
  kind: "deep",
  days_of_week: [1, 2, 3, 4],
  start_time: "08:00",
  end_time: "13:30",
  valid_from: null,
  valid_to: null,
  ...over,
});

// Semana tipo editable (NO es la del usuario hardcodeada: es un fixture de test).
const blocks: CapacityBlock[] = [
  block({ label: "sueño", kind: "sleep", days_of_week: [0, 1, 2, 3, 4, 5, 6], start_time: "23:00", end_time: "06:30" }),
  block({ label: "deep", kind: "deep", start_time: "08:00", end_time: "13:30" }),
  block({ label: "bus ida", kind: "transport", start_time: "16:00", end_time: "18:00" }),
  block({ label: "u", kind: "university", start_time: "18:00:00", end_time: "21:30:00" }),
  block({ label: "bus vuelta", kind: "transport", start_time: "21:30", end_time: "23:00" }),
];

describe("blockMinutes", () => {
  it("cruza medianoche", () => {
    expect(blockMinutes("23:00", "06:30")).toBe(450);
    expect(blockMinutes("08:00:00", "13:30:00")).toBe(330);
  });
});

describe("weekdayOf", () => {
  it("2026-09-24 es jueves", () => expect(weekdayOf("2026-09-24")).toBe(4));
});

describe("computeDayCapacity", () => {
  it("transporte cuenta como pasivo, universidad y sueño como comprometidos", () => {
    const c = computeDayCapacity(blocks, "2026-09-24"); // jueves
    expect(c.minutes.deep).toBe(330);
    expect(c.minutes.passive).toBe(210);
    expect(c.committed).toBe(450 + 210);
    expect(c.unplanned).toBe(1440 - 330 - 210 - 660);
    expect(actionableMinutes(c)).toBe(540);
    expect(c.blocks[0].label).toBe("deep"); // ordenados por hora de inicio
  });

  it("un día sin bloques propios solo tiene el sueño", () => {
    const c = computeDayCapacity(blocks, "2026-09-26"); // sábado
    expect(c.minutes.deep).toBe(0);
    expect(c.configured).toBe(true);
  });

  it("respeta valid_from / valid_to", () => {
    const vac = [block({ valid_from: "2026-12-01", valid_to: "2026-12-31" })];
    expect(computeDayCapacity(vac, "2026-09-24").configured).toBe(false);
    expect(computeDayCapacity(vac, "2026-12-03").minutes.deep).toBe(330);
  });
});

describe("computeWeekCapacity", () => {
  it("suma 7 días", () => {
    const days = ["2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27"];
    expect(computeWeekCapacity(blocks, days).deep).toBe(330 * 4);
  });
});
