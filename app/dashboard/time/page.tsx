import { Timer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { deleteTimeEntry } from "@/lib/actions/time-entries";
import { shiftIsoDate } from "@/lib/date";
import { loadPlanContext } from "@/lib/data/plan";
import {
  TIME_CATEGORIES,
  TIME_CATEGORY_LABEL,
  computeAllocation,
  computeExecutionGap,
  outreachDaysIn,
  type TimeCategory,
} from "@/lib/engine/allocation";
import { actionableMinutes, computeDayCapacity, type CapacityBlock } from "@/lib/engine/capacity";
import { pct } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { QuickTimeLog } from "@/components/quick-time-log";

const h = (min: number) => `${(min / 60).toFixed(1)}h`;

export default async function TimePage() {
  const planCtx = await loadPlanContext();
  if (!planCtx) return null;
  const { today, assumptions } = planCtx;
  const weekStart = shiftIsoDate(today, -6);
  const supabase = await createClient();

  const [{ data: entriesData }, { data: blocks }, { data: sessions }] = await Promise.all([
    supabase
      .from("time_entries")
      .select("id, date, minutes, category, execution_mode, note")
      .gte("date", weekStart)
      .lte("date", today)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("capacity_blocks").select("id, label, kind, days_of_week, start_time, end_time, valid_from, valid_to"),
    supabase.from("prospecting_sessions").select("minutes_spent").gte("date", weekStart).lte("date", today),
  ]);

  const entries = entriesData ?? [];
  const allocation = computeAllocation(entries);
  const days = Array.from({ length: 7 }, (_, i) => shiftIsoDate(weekStart, i));
  const capacityMinutes = days.reduce((s, d) => s + actionableMinutes(computeDayCapacity((blocks ?? []) as CapacityBlock[], d)), 0);
  const reverse = planCtx.plan?.reverse;
  const gap = computeExecutionGap({
    allocation,
    dailySalesMinutesRequired: reverse?.ok ? reverse.dailyMinutes : null,
    outreachDaysInPeriod: outreachDaysIn(7, assumptions.outreach_days_per_week),
    capacityMinutesInPeriod: capacityMinutes,
  });
  const prospectingMinutes = (sessions ?? []).reduce((s, r) => s + (r.minutes_spent ?? 0), 0);
  const max = Math.max(1, ...TIME_CATEGORIES.map((c) => allocation.byCategory[c]));

  return (
    <main className="flex-1 px-4 md:px-8 py-6 max-w-3xl w-full mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Tiempo</h1>
        <p className="text-sm text-ink-dim mt-1">
          En qué se fue el tiempo esta semana vs lo que el plan necesita. Es asignación de recursos, no un juicio.
        </p>
      </div>

      <Card className="mb-4">
        <CardHeader title="Registrar tiempo" icon={<Timer size={16} className="text-ink-dim" />} />
        <div className="px-5 pb-5">
          <QuickTimeLog today={today} />
        </div>
      </Card>

      <Card className="mb-4">
        <CardHeader title={`Últimos 7 días · ${h(allocation.totalMinutes)} registradas`} />
        {allocation.totalMinutes === 0 ? (
          <EmptyState title="Sin registros esta semana" description="Registra bloques de tiempo arriba para ver tu asignación real." />
        ) : (
          <ul className="px-5 pb-5 flex flex-col gap-2">
            {TIME_CATEGORIES.map((c) => (
              <li key={c} className="text-xs">
                <div className="flex justify-between mb-1">
                  <span className="text-ink">{TIME_CATEGORY_LABEL[c]}</span>
                  <span className="text-ink-dim tabular-nums">
                    {h(allocation.byCategory[c])} · {pct(allocation.share[c])}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-2">
                  <div className="h-1.5 rounded-full bg-ink" style={{ width: `${(allocation.byCategory[c] / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mb-4">
        <CardHeader title="Execution gap (ventas)" />
        <div className="px-5 pb-5 text-sm">
          {!gap ? (
            <p className="text-ink-dim">
              El plan todavía no calcula minutos de ventas por día (faltan supuestos o minutos por contacto en Plan). Sin ese dato no
              hay una asignación requerida que comparar.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
                <Stat label="Ventas requeridas (7 días)" value={h(gap.requiredSalesMinutes)} />
                <Stat label="Ventas registradas" value={h(gap.actualSalesMinutes)} />
                <Stat label="Diferencia" value={`${gap.gapMinutes >= 0 ? "+" : ""}${h(gap.gapMinutes)}`} />
                <Stat
                  label="% de tu capacidad que exige el plan"
                  value={gap.requiredSalesShareOfCapacity === null ? "—" : pct(gap.requiredSalesShareOfCapacity)}
                  hint={capacityMinutes === 0 ? "Define tu capacidad" : `de ${h(capacityMinutes)} utilizables`}
                />
              </div>
              <Badge tone={gap.gapMinutes >= 0 ? "good" : "warn"}>
                {gap.gapMinutes >= 0 ? "Asignación suficiente para la cuota" : "Menos horas de ventas de las que el plan necesita"}
              </Badge>
            </>
          )}
          {prospectingMinutes > 0 && (
            <p className="text-xs text-ink-dim mt-3">
              Además, tus sesiones de prospección registran {h(prospectingMinutes)} esta semana. No se suman aquí para no contarlas dos
              veces: si ya las registraste como tiempo de ventas, es el mismo tiempo.
            </p>
          )}
        </div>
      </Card>

      {entries.length > 0 && (
        <Card>
          <CardHeader title="Registros" />
          <ul className="divide-y divide-border">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <div className="min-w-0">
                  <span className="text-ink">{TIME_CATEGORY_LABEL[e.category as TimeCategory] ?? e.category}</span>
                  <span className="text-xs text-ink-dim">
                    {" "}
                    · {e.date} · {e.minutes} min{e.note ? ` · ${e.note}` : ""}
                  </span>
                </div>
                <DeleteButton action={deleteTimeEntry.bind(null, e.id)} confirmMessage="¿Eliminar este registro?" />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </main>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-ink-dim mb-1">{label}</div>
      <div className="text-sm font-semibold text-ink tabular-nums">{value}</div>
      {hint && <div className="text-[0.68rem] text-ink-dim mt-0.5">{hint}</div>}
    </div>
  );
}
