import { createClient } from "@/lib/supabase/server";
import { loadPlanContext } from "@/lib/data/plan";
import { loadTodayContext } from "@/lib/data/today";
import { loadSerHacerTener } from "@/lib/data/ser-hacer-tener";
import { RATE_SOURCE_LABEL } from "@/lib/engine/rates";
import { FUNNEL_STAGES, FUNNEL_STAGE_LABEL } from "@/lib/engine/reverse";
import { BOTTLENECK_LABEL } from "@/lib/engine/bottleneck";
import { MISS_REASON_LABEL, type MissReason } from "@/lib/adaptive";

const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);
const cop = (n: number) => `${Math.round(n).toLocaleString("es-CO")} COP`;

/**
 * Conclusiones YA CALCULADAS por los motores (plan, prioridades, cuello de
 * botella, SER/HACER/TENER) en texto compacto. La IA interpreta estos
 * números; no los recalcula. Cada línea lleva su etiqueta de origen para
 * que la respuesta pueda citarla: [DATO], [ESTIMACIÓN], [HIPÓTESIS], [REGLA].
 */
export async function buildEngineContext(): Promise<string> {
  const [planCtx, today, sht] = await Promise.all([loadPlanContext(), loadTodayContext(), loadSerHacerTener()]);
  if (!planCtx) return "Sin contexto de motores (sesión no disponible).";
  const supabase = await createClient();

  const [{ data: hyps }, { data: exps }, { data: learnings }, { data: misses }] = await Promise.all([
    supabase.from("hypotheses").select("type, statement, status, confidence").neq("status", "rejected").limit(15),
    supabase.from("experiments").select("name, metric_key, variants, sample_target, status").eq("status", "running").limit(10),
    supabase
      .from("knowledge_items")
      .select("title, description, created_at")
      .eq("kind", "decision")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("activity_logs")
      .select("payload")
      .eq("action", "missed_resolved")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const lines: string[] = [`Fecha de hoy: ${planCtx.today}.`];
  const plan = planCtx.plan;

  if (!plan) {
    lines.push("META PRINCIPAL: no hay North Star ni meta de VANT vinculada. [DATO FALTANTE]");
  } else {
    const g = plan.gap;
    lines.push(
      `META PRINCIPAL: "${plan.goal.title}" · actual ${plan.goal.unit === "COP" ? cop(plan.currentValue) : plan.currentValue} (${
        plan.currentSource === "billing" ? "calculado de facturación real" : "valor manual"
      }) · objetivo ${g.target ?? "—"} · falta ${g.remaining ?? "—"} · días restantes ${g.daysLeft ?? "—"} · progreso ${g.progressPct ?? "—"}% [DATO]`
    );
    lines.push("TASAS DEL EMBUDO:");
    for (const s of FUNNEL_STAGES) {
      const r = plan.rates[s];
      lines.push(`  - ${FUNNEL_STAGE_LABEL[s]}: ${pct(r.value)} [${RATE_SOURCE_LABEL[r.source]}, n=${r.n}/${r.minSample}]`);
    }
    if (plan.closes.kind === "missing") lines.push(`CÁLCULO HACIA ATRÁS: falta ${plan.closes.missing.join(", ")} [DATO FALTANTE]`);
    else if (plan.closes.kind === "unsupported") lines.push(`CÁLCULO HACIA ATRÁS: ${plan.closes.reason}`);
    else if (plan.reverse?.ok) {
      const rv = plan.reverse;
      lines.push(
        `CÁLCULO HACIA ATRÁS [basado en las tasas de arriba]: ${plan.closes.closesNeeded} cliente(s) necesarios · ${rv.volume.contacts} contactos nuevos · ${
          rv.dailyContacts ?? "—"
        }/día hasta ${rv.outreachWindowEnd} · P(cumplir con ese volumen) ≈ ${Math.round(rv.probabilityAtExpectedVolume * 100)}% · para 80%: ${rv.contactsForConfidence.p80} contactos`
      );
    } else if (plan.reverse && !plan.reverse.ok) {
      lines.push(
        `CÁLCULO HACIA ATRÁS no disponible: ${[...plan.reverse.missing, ...plan.reverse.blocked].join("; ")} [DATO FALTANTE/BLOQUEO]`
      );
    }
  }
  lines.push(
    `PIPELINE (${planCtx.pipelineSource === "leads" ? "desde leads" : "foto manual"}): ${planCtx.pipeline.replied} con respuesta, ${planCtx.pipeline.booked} agendadas, ${planCtx.pipeline.showed} asistidas/propuesta · follow-ups vencidos: ${planCtx.overdueFollowups} [DATO]`
  );

  const b = planCtx.bottleneck;
  if (b.top) {
    lines.push(`CUELLO DE BOTELLA (7 días): ${BOTTLENECK_LABEL[b.top.kind]}`);
    lines.push(`  OBSERVACIÓN [DATO]: ${b.top.observation}`);
    lines.push(`  HIPÓTESIS [no comprobadas]: ${b.top.hypotheses.join(" | ")}`);
    lines.push(`  ACCIÓN sugerida [REGLA]: ${b.top.action} · MÉTRICA: ${b.top.metric}`);
  } else {
    lines.push("CUELLO DE BOTELLA: sin diagnóstico por falta de muestra.");
  }
  if (b.missingData.length) lines.push(`  Datos faltantes: ${b.missingData.join("; ")}`);
  if (b.volumeDownConversionUp) lines.push("  Nota [REGLA]: el volumen bajó y la conversión subió; no recomendar 'más volumen'.");

  if (planCtx.phases) {
    const active = planCtx.phases.phases.filter((p) => p.status === "active").map((p) => `${p.label} (${p.start}→${p.end})`);
    lines.push(`FASES ACTIVAS DEL PLAN: ${active.join(", ") || "—"}`);
  }

  if (today) {
    lines.push("TOP 3 DE HOY [calculado por el motor de prioridades]:");
    today.ranking.top.forEach((s, i) => lines.push(`  ${i + 1}. ${s.item.title} — ${s.reasons.join(", ")}`));
    if (today.ranking.top.length === 0) lines.push("  (vacío)");
    if (today.missed.length) lines.push(`Tareas de días anteriores sin decidir: ${today.missed.map((m) => m.title).join("; ")} [DATO]`);
    lines.push(
      today.capacity.configured
        ? `CAPACIDAD HOY: profundo ${today.capacity.minutes.deep} min, ligero ${today.capacity.minutes.shallow} min, pasivo ${today.capacity.minutes.passive} min [DATO]`
        : "CAPACIDAD HOY: no configurada [DATO FALTANTE]"
    );
  }

  if (sht) {
    lines.push(
      `SER: cumplimiento de hábitos 7d ${sht.ser.avgCompliance7d ?? "—"}% · energía hoy ${sht.ser.checkin?.energy ?? "sin registrar"} · enfoque ${sht.ser.checkin?.focus ?? "sin registrar"} [DATO]`
    );
    const p = sht.hacer.prospecting;
    lines.push(
      `HACER (semana): ${p.contacts} contactos, ${p.followups} follow-ups, ${p.replies} respuestas, ${p.appointments} citas, ${p.shows} asistidas, ${p.closed} cierres, ${Math.round(
        sht.hacer.salesMinutes / 60
      )} h de ventas registradas [DATO]`
    );
    lines.push(`TENER: facturación acumulada ${cop(sht.tener.revenueCumulative)}, ${sht.tener.activeClients} clientes activos [DATO]`);
  }

  const reasonCounts = new Map<string, number>();
  for (const m of misses ?? []) {
    const r = (m.payload as { reason?: MissReason } | null)?.reason;
    if (r) reasonCounts.set(r, (reasonCounts.get(r) ?? 0) + 1);
  }
  if (reasonCounts.size) {
    lines.push(
      `MOTIVOS DE TAREAS NO COMPLETADAS (últimos ${misses!.length}): ${[...reasonCounts]
        .sort((a, c) => c[1] - a[1])
        .map(([r, n]) => `${MISS_REASON_LABEL[r as MissReason] ?? r}: ${n}`)
        .join("; ")} [DATO]`
    );
  }

  if (hyps?.length) {
    lines.push("HIPÓTESIS ACTIVAS [HIPÓTESIS — no son hechos]:");
    for (const h of hyps) lines.push(`  - (${h.type}, ${h.status}${h.confidence !== null ? `, confianza ${h.confidence}%` : ""}) ${h.statement}`);
  }
  if (exps?.length) {
    lines.push("EXPERIMENTOS EN CURSO:");
    for (const e of exps) lines.push(`  - ${e.name}: ${e.metric_key}, variantes ${e.variants.join("/")}, muestra ${e.sample_target}`);
  }
  if (learnings?.length) {
    lines.push("APRENDIZAJES REGISTRADOS [DECISIÓN pasada]:");
    for (const l of learnings) lines.push(`  - ${l.title}: ${l.description ?? ""}`);
  }

  return lines.join("\n");
}
