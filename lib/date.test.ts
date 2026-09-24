import { describe, expect, it } from "vitest";
import { isoDateInTimezone, shiftIsoDate, startOfDayInTimezone } from "./date";

describe("shiftIsoDate", () => {
  it("cruza límites de mes y año", () => {
    expect(shiftIsoDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftIsoDate("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftIsoDate("2028-03-01", -1)).toBe("2028-02-29");
  });
});

describe("isoDateInTimezone", () => {
  it("usa el día del usuario, no el del servidor", () => {
    // 03:00 UTC del 24 = 22:00 del 23 en Bogotá (UTC-5).
    const instant = new Date("2026-09-24T03:00:00Z");
    expect(isoDateInTimezone("America/Bogota", instant)).toBe("2026-09-23");
    expect(isoDateInTimezone("UTC", instant)).toBe("2026-09-24");
  });
});

describe("startOfDayInTimezone", () => {
  it("medianoche de Bogotá es 05:00 UTC", () => {
    expect(startOfDayInTimezone("2026-09-24", "America/Bogota")).toBe("2026-09-24T05:00:00.000Z");
    expect(startOfDayInTimezone("2026-09-24", "UTC")).toBe("2026-09-24T00:00:00.000Z");
    expect(startOfDayInTimezone("2026-09-24", "Asia/Tokyo")).toBe("2026-09-23T15:00:00.000Z");
  });
});
