import { Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { deleteProspectingSession } from "@/lib/actions/prospecting";
import { computeProspectingRates, sumProspectingTotals } from "@/lib/agencia/metrics";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { AgenciaTabs } from "../tabs";
import { CreateProspectingButton } from "./create-button";
import { EditProspectingButton } from "./edit-button";

const pct = (n: number | null) => (n === null ? "—" : `${n.toFixed(1)}%`);

export default async function ProspectingPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prospecting_sessions")
    .select("id, date, channel, contacts_count, replies_count, appointments_count, clients_closed, offer, notes")
    .order("date", { ascending: false });

  const sessions = data ?? [];
  const totals = sumProspectingTotals(sessions);
  const totalsRates = computeProspectingRates(totals);

  return (
    <main className="flex-1 px-6 md:px-8 py-6 max-w-4xl w-full mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Agencia</h1>
          <p className="text-sm text-ink-dim mt-1">Prospección en frío (outbound).</p>
        </div>
        <CreateProspectingButton />
      </div>

      <AgenciaTabs />

      {sessions.length === 0 ? (
        <Card className="px-6 py-10">
          <EmptyState
            icon={<Phone size={20} />}
            title="Sin sesiones de prospección"
            description="Registra tu primera sesión de outbound para ver resultados acumulados."
            action={<CreateProspectingButton />}
          />
        </Card>
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader title="Resultados acumulados" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-5 pb-5 text-xs">
              <Metric label="Contactos" value={`${totals.contacts}`} />
              <Metric label="Respuestas" value={`${totals.replies}`} />
              <Metric label="Citas agendadas" value={`${totals.appointments}`} />
              <Metric label="Clientes cerrados" value={`${totals.closed}`} />
              <Metric label="Tasa de respuesta" value={pct(totalsRates.replyRate)} />
              <Metric label="Tasa de agendamiento" value={pct(totalsRates.schedulingRate)} />
              <Metric label="Tasa de cierre" value={pct(totalsRates.closingRate)} />
            </div>
          </Card>

          <div className="flex flex-col gap-3">
            {sessions.map((s) => {
              const rates = computeProspectingRates({
                contacts: s.contacts_count,
                replies: s.replies_count,
                appointments: s.appointments_count,
                closed: s.clients_closed,
              });
              return (
                <Card key={s.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-ink">{s.channel}</div>
                      <div className="text-xs text-ink-dim mt-0.5">
                        {s.date}
                        {s.offer ? ` · ${s.offer}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 flex-none">
                      <EditProspectingButton session={s} />
                      <DeleteButton
                        action={deleteProspectingSession.bind(null, s.id)}
                        confirmMessage="¿Eliminar esta sesión de prospección?"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <Metric label="Contactos" value={`${s.contacts_count}`} />
                    <Metric label="Respuestas" value={`${s.replies_count}`} />
                    <Metric label="Citas" value={`${s.appointments_count}`} />
                    <Metric label="Cerrados" value={`${s.clients_closed}`} />
                    <Metric label="Tasa respuesta" value={pct(rates.replyRate)} />
                    <Metric label="Tasa agendamiento" value={pct(rates.schedulingRate)} />
                    <Metric label="Tasa cierre" value={pct(rates.closingRate)} />
                  </div>
                  {s.notes && <p className="text-xs text-ink-dim mt-3">{s.notes}</p>}
                </Card>
              );
            })}
          </div>
        </>
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
