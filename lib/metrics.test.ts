import { describe, expect, it } from "vitest";
import { computeStreak } from "./metrics";

describe("computeStreak", () => {
  const today = "2026-09-23";

  it("cuenta días consecutivos terminando hoy", () => {
    expect(computeStreak(new Set(["2026-09-21", "2026-09-22", "2026-09-23"]), today)).toBe(3);
  });

  it("no rompe la racha si hoy aún no se marcó", () => {
    expect(computeStreak(new Set(["2026-09-21", "2026-09-22"]), today)).toBe(2);
  });

  it("es 0 si faltaron ayer y hoy", () => {
    expect(computeStreak(new Set(["2026-09-20", "2026-09-21"]), today)).toBe(0);
  });

  it("se corta en el primer hueco", () => {
    expect(computeStreak(new Set(["2026-09-19", "2026-09-21", "2026-09-22", "2026-09-23"]), today)).toBe(3);
  });
});
