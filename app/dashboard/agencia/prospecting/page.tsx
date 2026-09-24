import { Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { deleteProspectingSession } from "@/lib/actions/prospecting";
import { computeProspectingRates, sumProspectingTotals } from "@/lib/agencia/metrics";
import { pct as formatPct } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { AgenciaTabs } from "../tabs";
import { CreateProspectingButton } from "./create-button";
import { EditProspectingButton } from "./edit-button";
import type { ProspectingSession } from "./session-form";

const pct = (n: number | null) => formatPct(n, 1);

export default async function ProspectingPage() {
  const supabase = await createClient();
  const [{ data }, { data: hypothesesData }, { data: experimentsData }] = await Promise.all([
    supabase
      .from("prospecting_sessions")
      .select(
        "id, date, channel, contacts_count, replies_count, appointments_count, shows_count, proposals_count, followups_count, clients_closed, minutes_spent, hypothesis_id, message_variant, experiment_id, offer, notes"
      )
      .order("date", { ascending: false }),
    supabase.from("hypotheses").select("id, statement, status").order("created_at", { ascending: false }),
    supabase.from("experiments").select("id, name, status, variants").order("created_at", { ascending: false }),
  ]);

  const sessions = (data ?? []) as ProspectingSession[];
  const hypotheses = hypothesesData ?? [];
  const experiments = experimentsData ?? [];
  const hypothesisById = new Map(hypotheses.map((h) => [h.id, h.statement]));
  const totals = sumProspectingTotals(sessions);
  const totalsRates = computeProspectingRates(totals);

  return (
    <main className="flex-1 px-6 md:px-8 py-6 max-w-4xl w-full mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Agencia</h1>
          <p className="text-sm text-ink-dim mt-1">Prospección en frío (outbound).</p>
        </div>
        <CreateProspectingButton hypotheses={hypotheses} experiments={experiments} />
      </div>

      <AgenciaTabs />

      {sessions.length === 0 ? (
        <Card className="px-6 py-10">
          <EmptyState
            icon={<Phone size={20} />}
            title="Sin sesiones de prospección"
            description="Registra tu primera sesión de outbound para ver resultados acumulados."
            action={<CreateProspectingButton hypotheses={hypotheses} experiments={experiments} />}
          />
        </Card>
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader title="Resultados acumulados" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-5 pb-5 text-xs">
              <Metric label="Contactos" value={`${totals.contacts}`} />
              <Metric label="Follow-ups" value={`${totals.followups}`} />
              <Metric label="Respuestas" value={`${totals.replies}`} />
              <Metric label="Citas agendadas" value={`${totals.appointments}`} />
              <Metric label="Citas asistidas" value={`${totals.shows}`} />
              <Metric label="Propuestas" value={`${totals.proposals}`} />
              <Metric label="Clientes cerrados" value={`${totals.closed}`} />
              <Metric label="Horas invertidas" value={totals.minutes > 0 ? (totals.minutes / 60).toFixed(1) : "—"} />
              <Metric label="Tasa de respuesta" value={pct(totalsRates.replyRate)} />
              <Metric label="Tasa de agendamiento" value={pct(totalsRates.schedulingRate)} />
              <Metric label="Tasa de asistencia" value={pct(totalsRates.showRate)} />
              <Metric label="Tasa de cierre" value={pct(totalsRates.closingRate)} />
            </div>
          </Card>

          <div className="flex flex-col gap-3">
            {sessions.map((s) => {
              const rates = computeProspectingRates({
                contacts: s.contacts_count,
                replies: s.replies_count,
                appointments: s.appointments_count,
                shows: s.shows_count,
                closed: s.clients_closed,
              });
              const hypothesis = s.hypothesis_id ? hypothesisById.get(s.hypothesis_id) : null;
              return (
                <Card key={s.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-ink">{s.channel}</div>
                      <div className="text-xs text-ink-dim mt-0.5">
                        {s.date}
                        {s.message_variant ? ` · mensaje ${s.message_variant}` : ""}
                        {s.offer ? ` · ${s.offer}` : ""}
                      </div>
                      {hypothesis && <div className="text-xs text-ink-dim mt-0.5 truncate">Hipótesis: {hypothesis}</div>}
                    </div>
                    <div className="flex items-center gap-2.5 flex-none">
                      <EditProspectingButton session={s} hypotheses={hypotheses} experiments={experiments} />
                      <DeleteButton
                        action={deleteProspectingSession.bind(null, s.id)}
                        confirmMessage="¿Eliminar esta sesión de prospección?"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <Metric label="Contactos" value={`${s.contacts_count}`} />
                    <Metric label="Respuestas" value={`${s.replies_count}`} />
                    <Metric label="Citas / asistidas" value={`${s.appointments_count} / ${s.shows_count}`} />
                    <Metric label="Cerrados" value={`${s.clients_closed}`} />
                    <Metric label="Tasa respuesta" value={pct(rates.replyRate)} />
                    <Metric label="Tasa agendamiento" value={pct(rates.schedulingRate)} />
                    <Metric label="Tasa asistencia" value={pct(rates.showRate)} />
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
