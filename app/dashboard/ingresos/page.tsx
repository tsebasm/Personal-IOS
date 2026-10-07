import { ArrowLeftRight, Banknote, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { loadPlanContext } from "@/lib/data/plan";
import { goalCurrency } from "@/lib/engine/plan";
import { FX_POLICY, referenceRate } from "@/lib/engine/fx";
import { describeConversion, moneyIn, pct } from "@/lib/format";
import { isoDateInTimezone } from "@/lib/date";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { CONCEPT_LABEL, FxRateForm, ReceiptForm, ReverseReceiptForm } from "./forms";

/**
 * Ingresos: dinero efectivamente recibido (única fuente del acumulado de la meta)
 * y tasas de cambio con fecha y fuente (C-1). Las proyecciones de facturación no
 * se registran aquí: no cuentan para la meta.
 */
export default async function IncomePage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const timezone = profile.timezone;
  const today = isoDateInTimezone(timezone);
  const supabase = await createClient();
  const [planCtx, { data: receipts, error: rErr }, { data: rates, error: fErr }, { data: clients }] = await Promise.all([
    loadPlanContext(),
    supabase
      .from("revenue_receipts")
      .select("id, vant_client_id, counterparty, received_at, amount, currency, concept, status, reversed_at, reversal_reason, reference")
      .order("received_at", { ascending: false })
      .limit(100),
    supabase.from("fx_rates").select("id, base_currency, quote_currency, rate, rate_date, source, source_reference").order("rate_date", { ascending: false }).limit(30),
    supabase.from("vant_clients").select("id, name").order("name"),
  ]);
  const clientName = new Map((clients ?? []).map((c) => [c.id as string, c.name as string]));
  const plan = planCtx?.plan ?? null;
  const cur = plan ? goalCurrency(plan.goal) : null;
  const fmtGoal = (n: number | null) => (n === null || !cur ? "—" : moneyIn(n, cur));
  const fxRows = (rates ?? []).map((r) => ({ ...r, rate: Number(r.rate) }));
  const usdCop = referenceRate(fxRows, "COP", cur ?? "USD", today);
  const localDateTime = (iso: string) =>
    new Intl.DateTimeFormat("es-CO", { timeZone: timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

  return (
    <main className="flex-1 px-4 md:px-8 py-6 max-w-3xl w-full mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Ingresos</h1>
        <p className="text-sm text-ink-dim mt-1">Solo el dinero efectivamente recibido cuenta para la meta.</p>
      </div>

      {(rErr || fErr) && (
        <p className="mb-4 text-sm text-warn">No se pudieron leer los ingresos o las tasas ({(rErr ?? fErr)?.message}). ¿Aplicaste las migraciones 0017 y 0019?</p>
      )}

      <div className="flex flex-col gap-4">
        {plan && plan.currentSource === "receipts" && (
          <Card>
            <CardHeader title="Meta" icon={<Target size={16} className="text-ink-dim" />} />
            <div className="px-5 pb-5">
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-sm font-medium text-ink truncate">{plan.goal.title}</span>
                <span className="text-sm font-semibold text-ink tabular-nums">{pct(plan.gap.progressPct)}</span>
              </div>
              <ProgressBar value={plan.gap.progressPct ?? 0} className="mb-2" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-ink-dim mb-1">Acumulado ({cur})</div>
                  <div className="text-sm font-semibold text-ink tabular-nums">{plan.currentValue === null ? "Pendiente de conversión" : fmtGoal(plan.currentValue)}</div>
                </div>
                <div>
                  <div className="text-ink-dim mb-1">Meta</div>
                  <div className="text-sm font-semibold text-ink tabular-nums">{fmtGoal(plan.gap.target)}</div>
                </div>
                <div>
                  <div className="text-ink-dim mb-1">Recibido (original)</div>
                  <div className="text-sm font-semibold text-ink tabular-nums">
                    {(plan.revenueRecorded ?? []).length === 0 ? "—" : (plan.revenueRecorded ?? []).map((r) => moneyIn(r.amount, r.currency)).join(" + ")}
                  </div>
                </div>
              </div>
              {describeConversion(plan.conversion) && <p className="mt-2 text-[0.7rem] text-ink-dim">{describeConversion(plan.conversion)}</p>}
            </div>
          </Card>
        )}

        <Card>
          <CardHeader title="Registrar pago recibido" icon={<Banknote size={16} className="text-ink-dim" />} />
          <div className="px-5 pb-5">
            <ReceiptForm clients={(clients ?? []) as { id: string; name: string }[]} today={today} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Tasa de cambio"
            icon={<ArrowLeftRight size={16} className="text-ink-dim" />}
            action={
              usdCop.status === "ok" ? (
                <Badge tone="good">Vigente</Badge>
              ) : (
                <Badge tone="warn">{usdCop.reason === "no_rate" ? "Sin tasa" : "Vencida"}</Badge>
              )
            }
          />
          <div className="px-5 pb-5 flex flex-col gap-3">
            <p className="text-xs text-ink-dim">
              Se usa la tasa más reciente con fecha hasta hoy; vale {FX_POLICY.maxAgeDays} días. Sin una tasa vigente, el progreso en {cur ?? "USD"} queda pendiente y
              no se inventa ninguna cifra. Registrar una tasa nueva no modifica los pagos en su moneda original.
            </p>
            <FxRateForm today={today} />
            {fxRows.length > 0 && (
              <ul className="flex flex-col gap-1 border-t border-border pt-3">
                {fxRows.map((r) => (
                  <li key={r.id} className="flex flex-wrap justify-between gap-2 text-xs">
                    <span className="text-ink tabular-nums">
                      1 {r.base_currency} = {r.rate.toLocaleString("es-CO")} {r.quote_currency}
                    </span>
                    <span className="text-ink-dim">
                      {r.rate_date} · {r.source}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Pagos recibidos" />
          {(receipts ?? []).length === 0 ? (
            <EmptyState title="Sin pagos registrados" description="Registra aquí cada pago que entre: es lo único que mueve la meta." />
          ) : (
            <ul className="px-5 pb-5 flex flex-col gap-2">
              {(receipts ?? []).map((r) => {
                const reversed = r.status === "reversed";
                return (
                  <li key={r.id} className="flex items-start justify-between gap-3 border-t border-border pt-2 first:border-t-0 first:pt-0">
                    <div className="min-w-0">
                      <div className={`text-sm ${reversed ? "text-ink-dim line-through" : "text-ink"}`}>
                        {r.vant_client_id ? (clientName.get(r.vant_client_id) ?? "Cliente") : r.counterparty} ·{" "}
                        {CONCEPT_LABEL[r.concept as keyof typeof CONCEPT_LABEL] ?? r.concept}
                      </div>
                      <div className="text-xs text-ink-dim">
                        {localDateTime(r.received_at)}
                        {r.reference ? ` · ref. ${r.reference}` : ""}
                        {reversed ? ` · revertido: ${r.reversal_reason}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-sm font-semibold tabular-nums ${reversed ? "text-ink-dim line-through" : "text-ink"}`}>
                        {moneyIn(Number(r.amount), r.currency)}
                      </span>
                      {!reversed && <ReverseReceiptForm id={r.id} />}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </main>
  );
}
