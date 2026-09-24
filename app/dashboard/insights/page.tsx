import Link from "next/link";
import { BarChart2, TrendingUp } from "lucide-react";
import { loadAnalytics } from "@/lib/data/analytics";
import { money } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RollupSummary } from "@/components/rollup-summary";

const p1 = (num: number, den: number) => (den > 0 ? `${((num / den) * 100).toFixed(1)}%` : "—");

/** Analítica real: semana en curso vs plan y tendencia de 8 semanas (antes: 3 contadores de toda la historia). */
export default async function InsightsPage() {
  const a = await loadAnalytics();
  if (!a) return null;
  const closed = new Set(a.closedWeeks);

  return (
    <main className="flex-1 px-4 md:px-8 py-6 max-w-4xl w-full mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Insights</h1>
        <p className="text-sm text-ink-dim mt-1">Plan → real → varianza. La interpretación y los ajustes se registran al cerrar la semana.</p>
      </div>

      <Card className="mb-6">
        <CardHeader
          title={`Semana en curso · ${a.current.start} → ${a.current.end}`}
          icon={<TrendingUp size={16} className="text-ink-dim" />}
          action={
            <Link href="/dashboard/reviews" className="text-xs font-medium text-ink-dim hover:text-ink">
              {closed.has(a.current.start) ? "Semana cerrada · ver" : "Cerrar semana →"}
            </Link>
          }
        />
        <div className="px-5 pb-5">
          <RollupSummary rollup={a.current} />
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <CardHeader title="Tendencia (8 semanas)" icon={<BarChart2 size={16} className="text-ink-dim" />} />
        <table className="w-full text-xs mb-4 min-w-[640px]">
          <thead>
            <tr className="text-ink-dim">
              <th className="text-left font-normal px-5 py-1">Semana</th>
              <th className="text-right font-normal px-2">Contactos</th>
              <th className="text-right font-normal px-2">Resp.</th>
              <th className="text-right font-normal px-2">% resp.</th>
              <th className="text-right font-normal px-2">Citas</th>
              <th className="text-right font-normal px-2">Cierres</th>
              <th className="text-right font-normal px-2">h ventas</th>
              <th className="text-right font-normal px-2">Hábitos</th>
              <th className="text-right font-normal px-5">Facturado</th>
            </tr>
          </thead>
          <tbody className="tabular-nums text-ink">
            {[...a.weeks].reverse().map((w) => (
              <tr key={w.start} className="border-t border-border">
                <td className="px-5 py-1.5">
                  {w.start.slice(5)}
                  {closed.has(w.start) && (
                    <Badge tone="good" className="ml-1.5">
                      revisada
                    </Badge>
                  )}
                </td>
                <td className="text-right px-2">{w.prospecting.contacts}</td>
                <td className="text-right px-2">{w.prospecting.replies}</td>
                <td className="text-right px-2">{p1(w.prospecting.replies, w.prospecting.contacts)}</td>
                <td className="text-right px-2">{w.prospecting.appointments}</td>
                <td className="text-right px-2">{w.prospecting.closed}</td>
                <td className="text-right px-2">{(w.salesMinutes / 60).toFixed(1)}</td>
                <td className="text-right px-2">{w.habitCompliancePct === null ? "—" : `${w.habitCompliancePct}%`}</td>
                <td className="text-right px-5">{money(w.revenueEnd - w.revenueStart)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
