import { describe, expect, it } from "vitest";
import { combineMetricValues, PROVIDED_KEYS, prospectingProvider, receiptsProvider } from "./metric-providers";
import { instanceProgress } from "./routines";

const TZ = { timezone: "America/Bogota" };

describe("proveedores de métricas (P-14: VANT como instancia)", () => {
  const sessions = [
    { date: "2026-10-09", contacts_count: 30, followups_count: 4, replies_count: 3, appointments_count: 1, shows_count: 0, proposals_count: 0, clients_closed: 0 },
    { date: "2026-10-09", contacts_count: 17, followups_count: null, replies_count: 1, appointments_count: 0, shows_count: null, proposals_count: null, clients_closed: 0 },
  ];

  it("las sesiones de prospección alimentan claves genéricas del embudo", () => {
    const v = prospectingProvider.toValues(sessions, TZ);
    const sum = (k: string) => v.filter((x) => x.metric_key === k).reduce((s, x) => s + x.value, 0);
    expect(sum("contacts")).toBe(47);
    expect(sum("replies")).toBe(4);
    expect(sum("meetings_booked")).toBe(1);
    expect(v.filter((x) => x.metric_key === "followups")).toHaveLength(1); // null = sin dato, no 0
  });

  it("el avance de la rutina 'contactar' sale de los datos reales de VANT", () => {
    const values = prospectingProvider.toValues(sessions, TZ);
    expect(instanceProgress({ metric_key: "contacts", scheduled_date: "2026-10-09", target_qty: 60 }, values)).toEqual({ actual: 47, progress: 47 / 60 });
  });

  it("solo el dinero recibido produce revenue_received (los revertidos no)", () => {
    const v = receiptsProvider.toValues(
      [
      { amount: "1500000", currency: "COP", status: "received", received_at: "2026-10-05T15:00:00Z" },
      { amount: 800000, currency: "COP", status: "reversed", received_at: "2026-10-05T16:00:00Z" },
      ],
      TZ
    );
    expect(v).toEqual([{ metric_key: "revenue_received", date: "2026-10-05", value: 1_500_000, source: "app", provider: "revenue_receipts" }]);
  });

  it("fecha el pago en la zona del usuario: 21:00 en Bogotá sigue siendo ese día", () => {
    const v = receiptsProvider.toValues([{ amount: 1, currency: "COP", status: "received", received_at: "2026-10-06T02:00:00Z" }], TZ);
    expect(v[0].date).toBe("2026-10-05");
  });

  it("sin doble conteo: un registro manual de una clave con proveedor ese día es conflicto, no se suma", () => {
    const providerValues = prospectingProvider.toValues(sessions, TZ);
    const r = combineMetricValues(
      providerValues,
      [
        { metric_key: "contacts", date: "2026-10-09", value: 50, source: "manual" }, // mismo día que el proveedor → conflicto
        { metric_key: "contacts", date: "2026-10-10", value: 20, source: "manual" }, // día sin sesión → cuenta
        { metric_key: "deep_work_minutes", date: "2026-10-09", value: 90, source: "manual" }, // clave sin proveedor → cuenta
        { metric_key: "contacts", date: "2026-10-11", value: null, source: "manual" }, // faltante → no es cero
      ],
      PROVIDED_KEYS
    );
    expect(r.conflicts).toEqual([{ metric_key: "contacts", date: "2026-10-09", provider: "vant.prospecting_sessions", manualValue: 50, providerValue: 47 }]);
    const contacts = (d: string) => r.values.filter((v) => v.metric_key === "contacts" && v.date === d).reduce((s, v) => s + v.value, 0);
    expect(contacts("2026-10-09")).toBe(47);
    expect(contacts("2026-10-10")).toBe(20);
    expect(r.values.some((v) => v.metric_key === "contacts" && v.date === "2026-10-11")).toBe(false);
    expect(r.values.find((v) => v.metric_key === "deep_work_minutes")?.value).toBe(90);
  });
});
