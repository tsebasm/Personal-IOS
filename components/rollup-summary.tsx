import type { WeeklyRollup } from "@/lib/engine/rollup";
import { money } from "@/lib/format";

const p1 = (x: number | null) => (x === null ? "—" : `${(x * 100).toFixed(1)}%`);
const h = (m: number) => `${(m / 60).toFixed(1)}h`;

/** Plan vs real + conversión + eficiencia de una semana (misma vista en Insights y Revisiones). */
export function RollupSummary({ rollup }: { rollup: WeeklyRollup }) {
  const { plan, actual, variance, rates, previousRates, efficiency, execution } = rollup;
  return (
    <div className="flex flex-col gap-4 text-xs">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Contactos (real / plan)" value={`${actual.contacts} / ${plan.contacts ?? "—"}`} hint={variance.contactsPct !== null ? `${variance.contactsPct}% del plan` : "sin plan calculado"} />
        <Stat label="Horas de ventas (real / plan)" value={`${h(actual.salesMinutes)} / ${plan.salesMinutes === null ? "—" : h(plan.salesMinutes)}`} />
        <Stat label="Follow-ups" value={`${actual.followups}`} />
        <Stat label="Facturación ganada" value={money(actual.revenueDelta)} />
      </div>

      <table className="w-full">
        <thead>
          <tr className="text-ink-dim">
            <th className="text-left font-normal py-1">Conversión</th>
            <th className="text-right font-normal">Semana anterior</th>
            <th className="text-right font-normal">Esta semana</th>
          </tr>
        </thead>
        <tbody className="tabular-nums text-ink">
          {(
            [
              ["reply", "Respuesta"],
              ["booking", "Agendamiento"],
              ["show", "Asistencia"],
              ["close", "Cierre"],
            ] as const
          ).map(([k, label]) => (
            <tr key={k} className="border-t border-border">
              <td className="py-1">{label}</td>
              <td className="text-right">{p1(previousRates?.[k] ?? null)}</td>
              <td className="text-right font-semibold">{p1(rates[k])}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Respuestas / hora de ventas" value={efficiency.repliesPerSalesHour === null ? "—" : efficiency.repliesPerSalesHour.toFixed(2)} />
        <Stat label="Citas / hora de ventas" value={efficiency.appointmentsPerSalesHour === null ? "—" : efficiency.appointmentsPerSalesHour.toFixed(2)} />
        <Stat label="Tareas completadas" value={execution.tasksDoneRate === null ? "—" : `${execution.tasksDoneRate}%`} />
        <Stat label="Hábitos (SER)" value={execution.habitCompliancePct === null ? "—" : `${execution.habitCompliancePct}%`} />
      </div>

      {rollup.observations.length > 0 && (
        <div>
          <div className="text-ink-dim mb-1">Observaciones (datos, no causas)</div>
          <ul className="list-disc pl-5 text-ink">
            {rollup.observations.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
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
