import { createHash } from "node:crypto";

/**
 * Contrato App ↔ Obsidian (spec §7, §73 enmendada P-7, §120–§123; PHASE-A-DESIGN §8.4).
 * Solo contrato y funciones puras: la sincronización real es la Fase D.
 *
 * Reglas:
 *  1. IDs estables: toda nota generada por la app lleva en el frontmatter
 *     pos_id (uuid de Supabase), pos_type, pos_version y pos_hash.
 *  2. App → Obsidian: exportación (la app es la fuente de lo operativo).
 *  3. Obsidian → App: NUNCA escritura directa. Un cambio detectado en una nota
 *     se convierte en documento fuente + change set PROPUESTO (P-10) para tu
 *     aprobación. Las notas curadas sin pos_id se pueden importar como
 *     documentos fuente (kind 'obsidian_note'), no como entidades.
 *  4. Conflictos: prioridad de §123 y ningún hecho histórico se sobrescribe.
 */

// ---------------------------------------------------------------------------
// Carpetas lógicas (P-7) y mapeo físico configurable
// ---------------------------------------------------------------------------

export const LOGICAL_FOLDERS = [
  "META",
  "OBJECTIVES",
  "SYSTEMS",
  "PROJECTS",
  "HYPOTHESES",
  "EXPERIMENTS",
  "METRICS",
  "DAILY_LOGS",
  "WEEKLY_REVIEWS",
  "DECISIONS",
  "SOPS",
  "IDENTITY",
  "REVOLUTION",
  "IDEAS",
] as const;
export type LogicalFolder = (typeof LOGICAL_FOLDERS)[number];

export type VaultLayout = {
  root: string;
  /** Carpeta donde la app escribe cada tipo. */
  folders: Record<LogicalFolder, string>;
  /** Carpetas existentes de la bóveda que se LEEN como esa carpeta lógica (no se mueven ni se escriben). */
  readAliases: Partial<Record<LogicalFolder, string[]>>;
};

export const DEFAULT_LAYOUT: VaultLayout = {
  root: "PERSONAL-OS",
  folders: Object.fromEntries(LOGICAL_FOLDERS.map((f, i) => [f, `${String(i).padStart(2, "0")}_${f}`])) as Record<LogicalFolder, string>,
  // Bóveda real (C:\VANT\VANT_Brain): Core/ (hipótesis versionadas), Experiments/, 01_Fundamentos Revolution/.
  readAliases: { HYPOTHESES: ["Core"], EXPERIMENTS: ["Experiments"], REVOLUTION: ["01_Fundamentos Revolution"] },
};

export function folderPath(layout: VaultLayout, folder: LogicalFolder): string {
  return `${layout.root}/${layout.folders[folder]}`;
}

/** ¿A qué carpeta lógica pertenece una ruta de la bóveda? (escritura propia o alias de lectura). */
export function logicalFolderOf(layout: VaultLayout, path: string): LogicalFolder | null {
  const p = path.replace(/\\/g, "/");
  for (const f of LOGICAL_FOLDERS) {
    if (p.startsWith(`${folderPath(layout, f)}/`)) return f;
    if ((layout.readAliases[f] ?? []).some((a) => p.startsWith(`${a}/`))) return f;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Fuente de verdad por tipo (§121)
// ---------------------------------------------------------------------------

export type Truth = { canonical: "app" | "obsidian"; folder: LogicalFolder | null; direction: "app_to_obsidian" | "obsidian_to_app_proposal" | "both_via_proposal" };

export const SOURCE_OF_TRUTH: Record<string, Truth> = {
  goal: { canonical: "app", folder: "META", direction: "app_to_obsidian" },
  objective: { canonical: "app", folder: "OBJECTIVES", direction: "app_to_obsidian" },
  system: { canonical: "app", folder: "SYSTEMS", direction: "both_via_proposal" },
  project: { canonical: "app", folder: "PROJECTS", direction: "app_to_obsidian" },
  hypothesis: { canonical: "app", folder: "HYPOTHESES", direction: "both_via_proposal" },
  experiment: { canonical: "app", folder: "EXPERIMENTS", direction: "both_via_proposal" },
  metric_definition: { canonical: "app", folder: "METRICS", direction: "app_to_obsidian" },
  daily_log: { canonical: "app", folder: "DAILY_LOGS", direction: "app_to_obsidian" },
  weekly_review: { canonical: "app", folder: "WEEKLY_REVIEWS", direction: "app_to_obsidian" },
  decision: { canonical: "app", folder: "DECISIONS", direction: "app_to_obsidian" },
  sop: { canonical: "obsidian", folder: "SOPS", direction: "both_via_proposal" },
  identity_rule: { canonical: "app", folder: "IDENTITY", direction: "both_via_proposal" },
  idea: { canonical: "app", folder: "IDEAS", direction: "both_via_proposal" },
  task: { canonical: "app", folder: null, direction: "app_to_obsidian" },
  revenue_receipt: { canonical: "app", folder: null, direction: "app_to_obsidian" },
  metric_entry: { canonical: "app", folder: null, direction: "app_to_obsidian" },
};

// ---------------------------------------------------------------------------
// Frontmatter (subconjunto YAML que escribe la app y las plantillas del vault)
// ---------------------------------------------------------------------------

export type Frontmatter = Record<string, string | number | boolean | null | string[]>;

function parseScalar(raw: string): string | number | boolean | null | string[] {
  const v = raw.trim();
  if (v === "" || v === "null" || v === "~") return null;
  if (v === "true" || v === "false") return v === "true";
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v.startsWith("[") && v.endsWith("]")) {
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((x) => String(parseScalar(x)));
  }
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    try {
      return v.startsWith('"') ? JSON.parse(v) : v.slice(1, -1);
    } catch {
      return v.slice(1, -1);
    }
  }
  return v;
}

export function parseNote(markdown: string): { frontmatter: Frontmatter; body: string } {
  const text = markdown.replace(/\r\n/g, "\n");
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { frontmatter: {}, body: text };
  const fm: Frontmatter = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = parseScalar(kv[2]);
  }
  return { frontmatter: fm, body: text.slice(m[0].length) };
}

const yaml = (v: Frontmatter[string]) =>
  v === null ? "" : Array.isArray(v) ? `[${v.map((x) => JSON.stringify(x)).join(", ")}]` : typeof v === "string" ? JSON.stringify(v) : String(v);

export function serializeNote(frontmatter: Frontmatter, body: string): string {
  return `---\n${Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${yaml(v)}`)
    .join("\n")}\n---\n${body}`;
}

/** Hash del cuerpo normalizado: detecta si la nota se editó en Obsidian después de exportarla. */
export function bodyHash(body: string): string {
  return createHash("sha256").update(body.replace(/\r\n/g, "\n").trim()).digest("hex");
}

/** Frontmatter de identidad que la app agrega a toda nota que exporta (regla 1). */
export function identityFrontmatter(entity: { id: string; type: string; version: number }, body: string, exportedAt: string): Frontmatter {
  return { pos_id: entity.id, pos_type: entity.type, pos_version: entity.version, pos_exported_at: exportedAt, pos_hash: bodyHash(body) };
}

// ---------------------------------------------------------------------------
// Detección y resolución de cambios (§122–§123)
// ---------------------------------------------------------------------------

export type NoteState =
  | { kind: "untracked" } // nota curada sin pos_id → candidata a documento fuente
  | { kind: "in_sync" }
  | { kind: "app_newer" } // re-exportar
  | { kind: "obsidian_changed" } // → propuesta (change set), nunca escritura directa
  | { kind: "conflict" }; // ambos cambiaron → propuesta + revisión humana; la app no se pisa

export function classifyNote(note: { frontmatter: Frontmatter; body: string }, app: { id: string; version: number } | null): NoteState {
  const id = note.frontmatter.pos_id;
  if (typeof id !== "string") return { kind: "untracked" };
  const editedInObsidian = note.frontmatter.pos_hash !== bodyHash(note.body);
  const exportedVersion = Number(note.frontmatter.pos_version ?? 0);
  const appChanged = app !== null && app.version > exportedVersion;
  if (editedInObsidian && appChanged) return { kind: "conflict" };
  if (editedInObsidian) return { kind: "obsidian_changed" };
  if (appChanged) return { kind: "app_newer" };
  return { kind: "in_sync" };
}

/** §123: prioridad cuando dos fuentes dicen cosas distintas. */
export const CONFLICT_PRIORITY = ["verified_operational", "historical_record", "user_note", "claude_inference", "external_assumption"] as const;
export type EvidenceKind = (typeof CONFLICT_PRIORITY)[number];

export function resolveConflict(a: EvidenceKind, b: EvidenceKind): EvidenceKind {
  return CONFLICT_PRIORITY.indexOf(a) <= CONFLICT_PRIORITY.indexOf(b) ? a : b;
}

/** Qué hacer con una nota según su estado y la fuente de verdad de su tipo (regla 3: Obsidian nunca escribe directo). */
export function syncAction(state: NoteState, type: string | null): "ignore" | "export" | "propose_change" | "propose_with_conflict" | "offer_as_source_document" {
  switch (state.kind) {
    case "untracked":
      return "offer_as_source_document";
    case "in_sync":
      return "ignore";
    case "app_newer":
      return "export";
    case "obsidian_changed":
      return type && SOURCE_OF_TRUTH[type]?.direction === "app_to_obsidian" ? "propose_with_conflict" : "propose_change";
    case "conflict":
      return "propose_with_conflict";
  }
}
