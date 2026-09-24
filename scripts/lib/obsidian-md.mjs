// Constructores de Markdown para la exportación Supabase → Obsidian (VANT Brain).
// Funciones puras: reciben filas y devuelven { path, content }. El script
// principal decide dónde escribir. Formato: frontmatter YAML + cuerpo, igual
// que las plantillas existentes del vault (Templates/Template_Experiment).

export const EXPORT_ROOT = "Personal OS (sync)";

const yamlValue = (v) => {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return `[${v.map((x) => JSON.stringify(String(x))).join(", ")}]`;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(String(v));
};

export function frontmatter(fields) {
  const lines = Object.entries(fields).map(([k, v]) => `${k}: ${yamlValue(v)}`);
  return `---\n${lines.join("\n")}\n---\n`;
}

/** Nombre de archivo seguro para Windows/macOS y estable entre exportaciones. */
export function safeName(text, id) {
  const base = String(text)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[<>:"/\\|?*#^[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return `${base || "sin-titulo"} (${String(id).slice(0, 8)})`;
}

const pct = (num, den) => (den > 0 ? `${((num / den) * 100).toFixed(1)}%` : "—");

export function hypothesisNote(h, attributed, exportedAt) {
  const body = [
    `# ${h.statement}`,
    "",
    "> Generado por Personal OS. Es una HIPÓTESIS con su estado actual, no una verdad operativa.",
    "",
    `- **Tipo:** ${h.type}`,
    `- **Estado:** ${h.status}`,
    h.market ? `- **Mercado:** ${h.market}` : null,
    h.icp ? `- **ICP:** ${h.icp}` : null,
    h.problem ? `- **Problema:** ${h.problem}` : null,
    h.channel ? `- **Canal:** ${h.channel}` : null,
    "",
    "## Evidencia medida (sesiones atribuidas)",
    `- Contactos: ${attributed.contacts} · Respuestas: ${attributed.replies} (${pct(attributed.replies, attributed.contacts)})`,
    `- Citas: ${attributed.appointments} · Cierres: ${attributed.closed}`,
    "",
    "## Evidencia declarada",
    h.evidence || "_Sin evidencia registrada._",
    h.source ? `\nFuente: ${h.source}` : "",
  ].filter((l) => l !== null);
  return {
    path: `${EXPORT_ROOT}/Hipotesis/${safeName(h.statement, h.id)}.md`,
    content:
      frontmatter({
        database: "hypotheses",
        source: "personal-os",
        hypothesis_id: h.id,
        type: h.type,
        status: h.status,
        confidence: h.confidence,
        exported_at: exportedAt,
      }) + body.join("\n") + "\n",
  };
}

export function experimentNote(e, variantResults, exportedAt) {
  const rows = variantResults.map(
    (v) => `| ${v.variant} | ${v.n} / ${e.sample_target} | ${v.rate === null ? "—" : `${(v.rate * 100).toFixed(1)}%`} |`
  );
  const body = [
    `# Experiment Log: ${e.name}`,
    "",
    "## 1. Ficha técnica",
    `- **Métrica:** ${e.metric_key}`,
    `- **Inicio:** ${e.started_on}${e.ended_on ? ` · **Fin:** ${e.ended_on}` : ""}`,
    `- **Estado:** ${e.status}`,
    "",
    "## 2. Resultados por variante (calculados de las sesiones)",
    "| Variante | Muestra | Tasa |",
    "|---|---|---|",
    ...rows,
    "",
    "## 3. Conclusiones y reglas para el algoritmo",
    `- **Veredicto:** ${e.decision ?? "pendiente"}`,
    e.learning ? `- **Aprendizaje:** ${e.learning}` : "- **Aprendizaje:** _pendiente_",
  ];
  return {
    path: `${EXPORT_ROOT}/Experimentos/${safeName(e.name, e.id)}.md`,
    content:
      frontmatter({
        database: "experiments",
        source: "personal-os",
        experiment_id: e.id,
        metric: e.metric_key,
        variants: e.variants,
        status: e.status,
        decision: e.decision,
        exported_at: exportedAt,
      }) + body.join("\n") + "\n",
  };
}

export function reviewNote(r, exportedAt) {
  const c = r.content && typeof r.content === "object" ? r.content : {};
  const body = [`# Revisión ${r.type} ${r.period_start} → ${r.period_end}`, ""];
  if (c.snapshot) body.push("## Snapshot (datos)", "```json", JSON.stringify(c.snapshot, null, 2), "```", "");
  if (c.analysis) body.push("## Análisis", c.analysis, "");
  if (c.adjustments) body.push("## Ajustes decididos", c.adjustments, "");
  if (c.note) body.push("## Nota", c.note, "");
  if (c.energy || c.focus || c.progress) body.push(`Energía ${c.energy ?? "—"} · Enfoque ${c.focus ?? "—"} · ¿Progreso? ${c.progress ?? "—"}`);
  return {
    path: `${EXPORT_ROOT}/Revisiones/${r.type}-${r.period_start}.md`,
    content: frontmatter({ database: "reviews", source: "personal-os", type: r.type, period_start: r.period_start, period_end: r.period_end, exported_at: exportedAt }) + body.join("\n") + "\n",
  };
}

export function learningsNote(items, exportedAt) {
  const body = ["# Aprendizajes y decisiones (Personal OS)", ""];
  for (const i of items) body.push(`## ${i.title}`, `_${String(i.created_at).slice(0, 10)}_`, "", i.description ?? "", "");
  if (items.length === 0) body.push("_Todavía no hay decisiones registradas._");
  return {
    path: `${EXPORT_ROOT}/Aprendizajes.md`,
    content: frontmatter({ database: "learnings", source: "personal-os", exported_at: exportedAt }) + body.join("\n") + "\n",
  };
}

export function indexNote(counts, exportedAt) {
  return {
    path: `${EXPORT_ROOT}/00 - Índice.md`,
    content:
      frontmatter({ tipo: "moc", source: "personal-os", exported_at: exportedAt }) +
      [
        "# Personal OS → VANT Brain",
        "",
        "Carpeta generada automáticamente (`npm run export:obsidian`). **No editar a mano**: se sobrescribe en cada exportación.",
        "La fuente de verdad de estos datos es Supabase; la doctrina y las notas curadas siguen en `Core/` y el resto del vault.",
        "",
        `- Hipótesis: ${counts.hypotheses}`,
        `- Experimentos: ${counts.experiments}`,
        `- Revisiones: ${counts.reviews}`,
        `- Aprendizajes: ${counts.learnings}`,
        "",
        "Cuando una hipótesis quede **validada** con datos, promuévela a mano a `Core/` o `Master Playbooks/` siguiendo el Mapa del Sistema.",
      ].join("\n") +
      "\n",
  };
}
