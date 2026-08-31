import { Target, Users, Phone, Percent, TrendingUp, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { isoDateInTimezone } from "@/lib/date";
import { computeBillingSummary, type VantClient } from "@/lib/agencia/billing";
import { sumCampaignTotals, safeRatio, safePercent } from "@/lib/agencia/metrics";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { AgenciaTabs } from "./tabs";
import { VantGoalConfig } from "./vant-goal-config";

const money = (n: number) =>
  n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const pct = (n: number | null) => (n === null ? "—" : `${n.toFixed(1)}%`);

export default async function AgenciaPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const timezone = profile?.timezone ?? "America/Bogota";
  const today = isoDateInTimezone(timezone);
  const canConfigure = profile?.mode === "config";

  const [{ data: settings }, { data: goalsData }, { data: campaignsData }, { data: clientsData }] =
    await Promise.all([
      supabase.from("agencia_settings").select("vant_goal_id").maybeSingle(),
      supabase.from("goals").select("id, title").order("created_at", { ascending: false }),
      supabase
        .from("campaigns")
        .select(
          "id, spend, leads, qualified_leads, forms_completed, calls_scheduled, calls_attended, calls_total_accumulated, calls_goal"
        ),
      supabase
        .from("vant_clients")
        .select(
          "id, name, start_date, status, setup_fee, commission_type, commission_value, monthly_fee, additional_commission, ad_spend"
        ),
    ]);

  const goals = goalsData ?? [];
  const vantGoalId = settings?.vant_goal_id ?? null;
  const { data: vantGoal } = vantGoalId
    ? await supabase
        .from("goals")
        .select("id, title, target_value, unit, deadline")
        .eq("id", vantGoalId)
        .maybeSingle()
    : { data: null };

  const campaigns = campaignsData ?? [];
  const clients: VantClient[] = (clientsData ?? []).map((c) => ({
    ...c,
    setup_fee: Number(c.setup_fee),
    commission_value: Number(c.commission_value),
    monthly_fee: Number(c.monthly_fee),
    additional_commission: Number(c.additional_commission),
    ad_spend: Number(c.ad_spend),
  }));

  const totals = sumCampaignTotals(campaigns);
  const billing = computeBillingSummary(clients, today);

  const target = vantGoal?.target_value ? Number(vantGoal.target_value) : null;
  const compliancePct = target ? Math.min(100, Math.round((billing.totalRevenue / target) * 100)) : null;
  const remaining = target ? Math.max(0, target - billing.totalRevenue) : null;

  const closingRate = safePercent(clients.length, totals.callsAttended);

  return (
    <main className="flex-1 px-6 md:px-8 py-6 max-w-6xl w-full mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Agencia</h1>
          <p className="text-sm text-ink-dim mt-1">VANT: adquisición, clientes y facturación en un solo lugar.</p>
        </div>
      </div>

      <AgenciaTabs />

      {canConfigure && <VantGoalConfig goals={goals} selectedGoalId={vantGoalId} />}

      {!vantGoal ? (
        <Card className="px-6 py-10 mb-6">
          <EmptyState
            icon={<Target size={20} />}
            title="VANT no tiene una meta de facturación vinculada"
            description={
              canConfigure
                ? "Selecciona arriba la meta que representa la facturación de VANT."
                : "Activa el modo configuración para vincular una meta de facturación."
            }
          />
        </Card>
      ) : (
        <Card className="px-5 py-4 mb-6">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="min-w-0">
              <div className="text-xs text-ink-dim mb-0.5">Meta vinculada</div>
              <div className="text-sm font-medium text-ink truncate">{vantGoal.title}</div>
            </div>
            <div className="text-2xl font-semibold text-ink tabular-nums">
              {compliancePct !== null ? `${compliancePct}%` : "—"}
            </div>
          </div>
          {target !== null && (
            <>
              <ProgressBar value={compliancePct ?? 0} className="mb-2" />
              <div className="flex items-center justify-between text-xs text-ink-dim">
                <span>
                  {money(billing.totalRevenue)} de {money(target)}
                </span>
                <span>Restante: {money(remaining ?? 0)}</span>
              </div>
            </>
          )}
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard icon={<Wallet size={16} />} label="Facturación acumulada" value={money(billing.totalRevenue)} />
        <MetricCard icon={<TrendingUp size={16} />} label="Facturación mensual" value={money(billing.currentMonthRevenue)} />
        <MetricCard icon={<Users size={16} />} label="Clientes" value={`${billing.activeClients} activos / ${billing.totalClients}`} />
        <MetricCard icon={<Wallet size={16} />} label="Inversión publicitaria gestionada" value={money(billing.adSpendTotal)} />
      </div>

      <Card className="mb-6">
        <CardHeader title="Adquisición (campañas pagadas)" icon={<Phone size={16} className="text-ink-dim" />} />
        {campaigns.length === 0 ? (
          <EmptyState title="Sin campañas registradas" description="Registra tu primera campaña para ver métricas aquí." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-5 pb-5">
            <Stat label="Leads" value={`${totals.leads}`} />
            <Stat label="Leads calificados" value={`${totals.qualifiedLeads}`} />
            <Stat label="Llamadas asistidas" value={`${totals.callsAttended}`} />
            <Stat label="CPL" value={totals.leads > 0 ? money(safeRatio(totals.spend, totals.leads) ?? 0) : "—"} />
            <Stat label="Tasa de calificación" value={pct(safePercent(totals.qualifiedLeads, totals.leads))} />
            <Stat label="Tasa de agendamiento" value={pct(safePercent(totals.callsScheduled, totals.qualifiedLeads))} />
            <Stat label="Tasa de asistencia" value={pct(safePercent(totals.callsAttended, totals.callsScheduled))} />
            <Stat label="Tasa de cierre" value={pct(closingRate)} />
          </div>
        )}
      </Card>

      {billing.revenueByClient.length > 0 && (
        <Card>
          <CardHeader title="Facturación por cliente" icon={<Percent size={16} className="text-ink-dim" />} />
          <ul className="divide-y divide-border">
            {billing.revenueByClient.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="text-sm text-ink truncate">{c.name}</span>
                <span className="text-sm text-ink-dim tabular-nums">{money(c.revenue)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </main>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="px-4 py-4">
      <div className="flex items-center gap-1.5 text-ink-dim mb-2">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-lg font-semibold text-ink tabular-nums">{value}</div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-ink-dim mb-1">{label}</div>
      <div className="text-sm font-semibold text-ink tabular-nums">{value}</div>
    </div>
  );
}
