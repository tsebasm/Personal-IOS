import { describe, expect, it } from "vitest";
import {
  billingEndDate,
  computeBillingSummary,
  monthsActiveSince,
  monthsBilled,
  totalClientRevenue,
  type VantClient,
} from "./billing";

const base: VantClient = {
  id: "c1",
  name: "Cliente",
  start_date: "2026-07-10",
  status: "activo",
  setup_fee: 1_000_000,
  commission_type: "fijo",
  commission_value: 0,
  monthly_fee: 500_000,
  additional_commission: 0,
  ad_spend: 0,
  paused_at: null,
  cancelled_at: null,
};

const today = "2026-09-23";

describe("monthsActiveSince", () => {
  it("cuenta el mes de inicio como 1", () => {
    expect(monthsActiveSince("2026-09-01", "2026-09-30")).toBe(1);
    expect(monthsActiveSince("2026-07-10", "2026-09-23")).toBe(3);
    expect(monthsActiveSince("2025-12-15", "2026-01-02")).toBe(2);
  });
});

describe("billingEndDate / monthsBilled", () => {
  it("un cliente activo factura hasta hoy", () => {
    expect(billingEndDate(base, today)).toBe(today);
    expect(monthsBilled(base, today)).toBe(3);
  });

  it("un cliente cancelado deja de facturar en cancelled_at", () => {
    const c = { ...base, status: "cancelado", cancelled_at: "2026-08-05" };
    expect(billingEndDate(c, today)).toBe("2026-08-05");
    expect(monthsBilled(c, today)).toBe(2);
  });

  it("un cliente pausado deja de facturar en paused_at", () => {
    const c = { ...base, status: "pausado", paused_at: "2026-07-31" };
    expect(monthsBilled(c, today)).toBe(1);
  });

  it("paused_at se ignora si el cliente volvió a estar activo", () => {
    const c = { ...base, status: "activo", paused_at: "2026-07-31" };
    expect(monthsBilled(c, today)).toBe(3);
  });

  it("un cliente que aún no inicia no factura", () => {
    const c = { ...base, start_date: "2026-10-01" };
    expect(monthsBilled(c, today)).toBe(0);
    expect(totalClientRevenue(c, today)).toBe(0);
  });
});

describe("computeBillingSummary", () => {
  it("no infla la facturación acumulada con clientes cancelados", () => {
    const cancelled = { ...base, id: "c2", status: "cancelado", cancelled_at: "2026-07-20" };
    const summary = computeBillingSummary([base, cancelled], today);
    // activo: 1M + 0,5M × 3 = 2,5M · cancelado: 1M + 0,5M × 1 = 1,5M
    expect(summary.totalRevenue).toBe(4_000_000);
    expect(summary.activeClients).toBe(1);
    expect(summary.currentMonthRevenue).toBe(500_000);
    expect(summary.revenueByClient.map((r) => r.revenue)).toEqual([2_500_000, 1_500_000]);
  });

  it("comisión porcentual sobre la inversión publicitaria", () => {
    const c = { ...base, commission_type: "porcentaje", commission_value: 10, ad_spend: 2_000_000, monthly_fee: 0 };
    const summary = computeBillingSummary([c], today);
    expect(summary.commissionsRevenueTotal).toBe(600_000); // 200k × 3 meses
    expect(summary.adSpendTotal).toBe(2_000_000);
  });

  it("suma el setup al mes actual solo si el cliente inició este mes", () => {
    const newClient = { ...base, start_date: "2026-09-02" };
    expect(computeBillingSummary([newClient], today).currentMonthRevenue).toBe(1_500_000);
  });
});
