import { FlaskConical } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { deleteHypothesis } from "@/lib/actions/hypotheses";
import { computeProspectingRates, sumProspectingTotals } from "@/lib/agencia/metrics";
import {
  HYPOTHESIS_COLUMNS,
  HYPOTHESIS_STATUS_LABEL,
  HYPOTHESIS_TYPE_LABEL,
  type Hypothesis,
} from "@/lib/agencia/hypotheses";
import { pct as formatPct } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { AgenciaTabs } from "../tabs";
import { CreateHypothesisButton, EditHypothesisButton } from "./buttons";

const pct = (n: number | null) => formatPct(n, 1);

const STATUS_TONE: Record<string, "good" | "warn" | "bad" | "neutral"> = {
  untested: "neutral",
  testing: "warn",
  validated: "good",
  rejected: "bad",
};

export default async function HypothesesPage() {
  const supabase = await createClient();
  const [{ data: hypothesesData }, { data: sessionsData }] = await Promise.all([
    supabase.from("hypotheses").select(HYPOTHESIS_COLUMNS).order("created_at", { ascending: false }),
    supabase
      .from("prospecting_sessions")
      .select("hypothesis_id, contacts_count, replies_count, appointments_count, clients_closed")
      .not("hypothesis_id", "is", null),
  ]);

  const hypotheses = (hypothesesData ?? []) as Hypothesis[];
  const others = hypotheses.map((h) => ({ id: h.id, statement: h.statement }));
  const statementById = new Map(hypotheses.map((h) => [h.id, h.statement]));

  // Evidencia medida: lo que las sesiones atribuidas a cada hipótesis produjeron.
  const sessionsByHypothesis = new Map<string, NonNullable<typeof sessionsData>>();
  for (const s of sessionsData ?? []) {
    if (!s.hypothesis_id) continue;
    const list = sessionsByHypothesis.get(s.hypothesis_id) ?? [];
    list.push(s);
    sessionsByHypothesis.set(s.hypothesis_id, list);
  }

  return (
    <main className="flex-1 px-6 md:px-8 py-6 max-w-4xl w-full mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Agencia</h1>
          <p className="text-sm text-ink-dim mt-1">
            Hipótesis de nicho, oferta, mensaje y canal. Nada aquí es un hecho hasta que los datos lo validen.
          </p>
        </div>
        <CreateHypothesisButton others={others} />
      </div>

      <AgenciaTabs />

      {hypotheses.length === 0 ? (
        <Card className="px-6 py-10">
          <EmptyState
            icon={<FlaskConical size={20} />}
            title="Sin hipótesis registradas"
            description="Registra los nichos u ofertas que quieres probar. Luego atribuye cada sesión de prospección a una hipótesis para medirla."
            action={<CreateHypothesisButton others={others} />}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {hypotheses.map((h) => {
            const totals = sumProspectingTotals(sessionsByHypothesis.get(h.id) ?? []);
            const rates = computeProspectingRates(totals);
            const scores = [
              ["Urgencia", h.urgency],
              ["Capacidad de pago", h.ability_to_pay],
              ["Competencia", h.competition],
              ["Potencial oferta", h.offer_potential],
            ] as const;
            return (
              <Card key={h.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge tone="neutral">{HYPOTHESIS_TYPE_LABEL[h.type]}</Badge>
                      {h.market && <span className="text-xs text-ink-dim">{h.market}</span>}
                      {h.confidence !== null && <span className="text-xs text-ink-dim">· confianza {h.confidence}%</span>}
                    </div>
                    <div className="text-sm font-medium text-ink">{h.statement}</div>
                    {h.superseded_by && (
                      <div className="text-xs text-ink-dim mt-1">
                        Reemplazada por: {statementById.get(h.superseded_by)?.slice(0, 80) ?? "—"}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 flex-none">
                    <Badge tone={STATUS_TONE[h.status]}>{HYPOTHESIS_STATUS_LABEL[h.status]}</Badge>
                    <EditHypothesisButton hypothesis={h} others={others} />
                    <DeleteButton
                      action={deleteHypothesis.bind(null, h.id)}
                      confirmMessage="¿Eliminar esta hipótesis? Si ya tiene datos, es mejor marcarla como rechazada."
                    />
                  </div>
                </div>

                {(h.icp || h.problem) && (
                  <div className="text-xs text-ink-dim mb-2">
                    {h.icp && <div>ICP: {h.icp}</div>}
                    {h.problem && <div>Problema: {h.problem}</div>}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-2">
                  {scores.map(([label, v]) => (
                    <Metric key={label} label={label} value={v === null ? "—" : `${v}/5`} />
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-border pt-2">
                  <Metric label="Contactos atribuidos" value={`${totals.contacts}`} />
                  <Metric label="Tasa de respuesta" value={pct(rates.replyRate)} />
                  <Metric label="Citas" value={`${totals.appointments}`} />
                  <Metric label="Cierres" value={`${totals.closed}`} />
                </div>

                {h.evidence && <p className="text-xs text-ink-dim mt-2 whitespace-pre-line">Evidencia: {h.evidence}</p>}
                {h.source && <p className="text-xs text-ink-dim mt-1">Fuente: {h.source}</p>}
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
