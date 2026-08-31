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
};

/** Meses transcurridos desde el inicio del cliente hasta hoy, contando el mes de inicio como 1. */
export function monthsActiveSince(startDate: string, todayIso: string): number {
  const [sy, sm] = startDate.split("-").map(Number);
  const [ty, tm] = todayIso.split("-").map(Number);
  return Math.max(1, (ty - sy) * 12 + (tm - sm) + 1);
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

/** Facturación acumulada de un cliente desde su inicio hasta hoy: setup (una vez) + recurrente * meses. */
export function totalClientRevenue(client: VantClient, todayIso: string): number {
  return client.setup_fee + monthlyRecurringRevenue(client) * monthsActiveSince(client.start_date, todayIso);
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
    const months = monthsActiveSince(client.start_date, todayIso);
    const recurring = monthlyRecurringRevenue(client);
    const revenue = client.setup_fee + recurring * months;

    totalRevenue += revenue;
    setupRevenueTotal += client.setup_fee;
    monthlyFeesRevenueTotal += client.monthly_fee * months;
    commissionsRevenueTotal += (monthlyCommission(client) + client.additional_commission) * months;
    adSpendTotal += client.ad_spend;
    revenueByClient.push({ id: client.id, name: client.name, revenue });

    if (client.status === "activo") {
      activeClients += 1;
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
