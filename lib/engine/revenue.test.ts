import { describe, expect, it } from "vitest";
import { recognizedRevenue } from "./revenue";

describe("ingreso reconocido (regla definitiva C-1)", () => {
  const r = (amount: number, status: string, received_at = "2026-10-01T15:00:00Z", currency = "COP") => ({ amount, currency, status, received_at });

  it("solo cuenta lo recibido; lo revertido conserva el registro pero no suma", () => {
    expect(recognizedRevenue([r(1_000_000, "received"), r(500_000, "reversed"), r(250_000, "received")])).toEqual([{ amount: 1_250_000, currency: "COP" }]);
  });

  it("received_at decide cuándo entra al acumulado", () => {
    const receipts = [r(1_000_000, "received", "2026-10-01T15:00:00Z"), r(2_000_000, "received", "2026-10-10T15:00:00Z")];
    expect(recognizedRevenue(receipts, "2026-10-05T00:00:00Z")).toEqual([{ amount: 1_000_000, currency: "COP" }]);
  });

  it("agrupa por moneda original sin convertir (eso es de fx.ts)", () => {
    expect(recognizedRevenue([r(100, "received", undefined, "USD"), r(400_000, "received")])).toEqual([
      { amount: 400_000, currency: "COP" },
      { amount: 100, currency: "USD" },
    ]);
  });

  it("acepta montos numeric como texto (así los devuelve Postgres)", () => {
    expect(recognizedRevenue([{ amount: "1500000", currency: "COP", status: "received", received_at: "2026-10-01T00:00:00Z" }])).toEqual([{ amount: 1_500_000, currency: "COP" }]);
  });
});
