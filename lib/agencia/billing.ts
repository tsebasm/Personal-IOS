export type VantClient = {
  id: string;
  name: string;
  start_date: string;
  status: string;
  setup_fee: number;
  commission_type: string;
  commission_value: number;
  monthly_fee: number;
  additional_commission: number;
  ad_spend: number;
  paused_at?: string | null;
  cancelled_at?: string | null;
};

/** Meses transcurridos desde el inicio del cliente hasta `endIso`, contando el mes de inicio como 1. */
export function monthsActiveSince(startDate: string, endIso: string): number {
  const [sy, sm] = startDate.split("-").map(Number);
  const [ty, tm] = endIso.split("-").map(Number);
  return Math.max(1, (ty - sy) * 12 + (tm - sm) + 1);
}

/**
 * Último día en que el cliente generó facturación recurrente: la fecha de
 * cancelación o pausa si aplica, si no hoy. Un cliente reactivado vuelve a
 * status 'activo' y la acción de actualización limpia paused_at.
 */
export function billingEndDate(
  client: Pick<VantClient, "status" | "paused_at" | "cancelled_at">,
  todayIso: string
): string {
  const stop =
    client.status === "cancelado" ? client.cancelled_at : client.status === "pausado" ? client.paused_at : null;
  return stop && stop < todayIso ? stop : todayIso;
}

/** Meses efectivamente facturados: desde el inicio hasta la pausa/cancelación (o hoy). 0 si aún no inicia. */
export function monthsBilled(
  client: Pick<VantClient, "start_date" | "status" | "paused_at" | "cancelled_at">,
  todayIso: string
): number {
  if (client.start_date > todayIso) return 0;
  return monthsActiveSince(client.start_date, billingEndDate(client, todayIso));
}

/** Comisión mensual: % sobre la inversión publicitaria que gestiona VANT, o un valor fijo. */
export function monthlyCommission(client: Pick<VantClient, "commission_type" | "commission_value" | "ad_spend">): number {
  return client.commission_type === "porcentaje"
    ? client.ad_spend * (client.commission_value / 100)
    : client.commission_value;
}

/** Fee + comisión + comisión adicional: lo que VANT factura cada mes que el cliente está activo. */
export function monthlyRecurringRevenue(
  client: Pick<VantClient, "monthly_fee" | "additional_commission" | "commission_type" | "commission_value" | "ad_spend">
): number {
  return client.monthly_fee + monthlyCommission(client) + client.additional_commission;
}

/** Facturación acumulada de un cliente: setup (una vez) + recurrente * meses facturados. */
export function totalClientRevenue(client: VantClient, todayIso: string): number {
  const months = monthsBilled(client, todayIso);
  if (months === 0) return 0;
  return client.setup_fee + monthlyRecurringRevenue(client) * months;
}

function isSameMonth(dateIso: string, todayIso: string): boolean {
  return dateIso.slice(0, 7) === todayIso.slice(0, 7);
}

export type BillingSummary = {
  totalClients: number;
  activeClients: number;
  totalRevenue: number;
  currentMonthRevenue: number;
  setupRevenueTotal: number;
  monthlyFeesRevenueTotal: number;
  commissionsRevenueTotal: number;
  adSpendTotal: number;
  revenueByClient: { id: string; name: string; revenue: number }[];
};

export function computeBillingSummary(clients: VantClient[], todayIso: string): BillingSummary {
  let totalRevenue = 0;
  let currentMonthRevenue = 0;
  let setupRevenueTotal = 0;
  let monthlyFeesRevenueTotal = 0;
  let commissionsRevenueTotal = 0;
  let adSpendTotal = 0;
  let activeClients = 0;
  const revenueByClient: { id: string; name: string; revenue: number }[] = [];

  for (const client of clients) {
    const months = monthsBilled(client, todayIso);
    const recurring = monthlyRecurringRevenue(client);
    const revenue = totalClientRevenue(client, todayIso);

    totalRevenue += revenue;
    if (months > 0) setupRevenueTotal += client.setup_fee;
    monthlyFeesRevenueTotal += client.monthly_fee * months;
    commissionsRevenueTotal += (monthlyCommission(client) + client.additional_commission) * months;
    revenueByClient.push({ id: client.id, name: client.name, revenue });

    if (client.status === "activo" && months > 0) {
      activeClients += 1;
      adSpendTotal += client.ad_spend; // solo la inversión que VANT gestiona hoy
      currentMonthRevenue += recurring;
      if (isSameMonth(client.start_date, todayIso)) currentMonthRevenue += client.setup_fee;
    }
  }

  return {
    totalClients: clients.length,
    activeClients,
    totalRevenue,
    currentMonthRevenue,
    setupRevenueTotal,
    monthlyFeesRevenueTotal,
    commissionsRevenueTotal,
    adSpendTotal,
    revenueByClient,
  };
}
