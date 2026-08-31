import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { deleteVantClient } from "@/lib/actions/vant-clients";
import { isoDateInTimezone } from "@/lib/date";
import { monthlyRecurringRevenue, totalClientRevenue, type VantClient } from "@/lib/agencia/billing";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { AgenciaTabs } from "../tabs";
import { CreateVantClientButton } from "./create-button";
import { EditVantClientButton } from "./edit-button";

const money = (n: number) =>
  n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const STATUS_TONE: Record<string, "good" | "warn" | "bad"> = {
  activo: "good",
  pausado: "warn",
  cancelado: "bad",
};
const STATUS_LABEL: Record<string, string> = {
  activo: "Activo",
  pausado: "Pausado",
  cancelado: "Cancelado",
};

export default async function VantClientsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const timezone = profile?.timezone ?? "America/Bogota";
  const today = isoDateInTimezone(timezone);

  const { data } = await supabase
    .from("vant_clients")
    .select(
      "id, name, start_date, status, setup_fee, commission_type, commission_value, monthly_fee, additional_commission, ad_spend"
    )
    .order("start_date", { ascending: false });

  const clients = (data ?? []) as VantClient[];

  return (
    <main className="flex-1 px-6 md:px-8 py-6 max-w-4xl w-full mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Agencia</h1>
          <p className="text-sm text-ink-dim mt-1">Clientes de VANT y su modelo de cobro.</p>
        </div>
        <CreateVantClientButton />
      </div>

      <AgenciaTabs />

      {clients.length === 0 ? (
        <Card className="px-6 py-10">
          <EmptyState
            icon={<Users size={20} />}
            title="Sin clientes registrados"
            description="Registra tu primer cliente de VANT para empezar a calcular facturación."
            action={<CreateVantClientButton />}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {clients.map((c) => {
            const clientNum = { ...c, setup_fee: Number(c.setup_fee), commission_value: Number(c.commission_value), monthly_fee: Number(c.monthly_fee), additional_commission: Number(c.additional_commission), ad_spend: Number(c.ad_spend) };
            const monthly = monthlyRecurringRevenue(clientNum);
            const total = totalClientRevenue(clientNum, today);
            return (
              <Card key={c.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-ink truncate">{c.name}</div>
                    <div className="text-xs text-ink-dim mt-0.5">Desde {c.start_date}</div>
                  </div>
                  <div className="flex items-center gap-2.5 flex-none">
                    <Badge tone={STATUS_TONE[c.status] ?? "neutral"}>{STATUS_LABEL[c.status] ?? c.status}</Badge>
                    <EditVantClientButton client={clientNum} />
                    <DeleteButton
                      action={deleteVantClient.bind(null, c.id)}
                      confirmMessage={`¿Eliminar el cliente "${c.name}"?`}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <Metric label="Setup" value={money(clientNum.setup_fee)} />
                  <Metric label="Fee mensual" value={money(clientNum.monthly_fee)} />
                  <Metric
                    label="Comisión"
                    value={
                      clientNum.commission_type === "porcentaje"
                        ? `${clientNum.commission_value}% de inversión`
                        : money(clientNum.commission_value)
                    }
                  />
                  <Metric label="Inversión publicitaria" value={money(clientNum.ad_spend)} />
                  <Metric label="Recurrente mensual" value={money(monthly)} />
                  <Metric label="Facturado acumulado" value={money(total)} />
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
