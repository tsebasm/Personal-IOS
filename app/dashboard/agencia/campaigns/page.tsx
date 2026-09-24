import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { deleteCampaign } from "@/lib/actions/campaigns";
import { computeCampaignRates } from "@/lib/agencia/metrics";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { AgenciaTabs } from "../tabs";
import { CreateCampaignButton } from "./create-button";
import { EditCampaignButton } from "./edit-button";
import { money, pct as formatPct } from "@/lib/format";

const pct = (n: number | null) => formatPct(n, 1);

const STATUS_TONE: Record<string, "good" | "warn" | "neutral"> = {
  activa: "good",
  pausada: "warn",
  finalizada: "neutral",
};
const STATUS_LABEL: Record<string, string> = {
  activa: "Activa",
  pausada: "Pausada",
  finalizada: "Finalizada",
};

export default async function CampaignsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("campaigns")
    .select(
      "id, name, start_date, end_date, status, spend, leads, qualified_leads, forms_completed, calls_scheduled, calls_attended, calls_total_accumulated, calls_goal"
    )
    .order("start_date", { ascending: false });

  const campaigns = data ?? [];

  return (
    <main className="flex-1 px-6 md:px-8 py-6 max-w-4xl w-full mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Agencia</h1>
          <p className="text-sm text-ink-dim mt-1">Campañas de adquisición pagada.</p>
        </div>
        <CreateCampaignButton />
      </div>

      <AgenciaTabs />

      {campaigns.length === 0 ? (
        <Card className="px-6 py-10">
          <EmptyState
            icon={<Megaphone size={20} />}
            title="Sin campañas registradas"
            description="Registra tu primera campaña para empezar a ver métricas de adquisición."
            action={<CreateCampaignButton />}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {campaigns.map((c) => {
            const rates = computeCampaignRates({
              spend: Number(c.spend),
              leads: c.leads,
              qualifiedLeads: c.qualified_leads,
              callsScheduled: c.calls_scheduled,
              callsAttended: c.calls_attended,
            });
            return (
              <Card key={c.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-ink truncate">{c.name}</div>
                    <div className="text-xs text-ink-dim mt-0.5">
                      {c.start_date}
                      {c.end_date ? ` → ${c.end_date}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 flex-none">
                    <Badge tone={STATUS_TONE[c.status] ?? "neutral"}>{STATUS_LABEL[c.status] ?? c.status}</Badge>
                    <EditCampaignButton campaign={{ ...c, spend: Number(c.spend) }} />
                    <DeleteButton
                      action={deleteCampaign.bind(null, c.id)}
                      confirmMessage={`¿Eliminar la campaña "${c.name}"?`}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <Metric label="Gasto" value={money(Number(c.spend))} />
                  <Metric label="Leads" value={`${c.leads}`} />
                  <Metric label="Calificados" value={`${c.qualified_leads}`} />
                  <Metric label="CPL" value={rates.cpl !== null ? money(rates.cpl) : "—"} />
                  <Metric label="Tasa calificación" value={pct(rates.qualificationRate)} />
                  <Metric label="Tasa agendamiento" value={pct(rates.schedulingRate)} />
                  <Metric label="Tasa asistencia" value={pct(rates.attendanceRate)} />
                  <Metric
                    label="Llamadas"
                    value={`${c.calls_total_accumulated}${c.calls_goal ? ` / ${c.calls_goal}` : ""}`}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-ink-dim mb-1">{label}</div>
      <div className="font-semibold text-ink tabular-nums">{value}</div>
    </div>
  );
}
