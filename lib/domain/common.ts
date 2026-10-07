import { z } from "zod";

/**
 * Primitivas compartidas del modelo de dominio (PHASE-A-DESIGN.md).
 *
 * Cada entidad se define una sola vez como "shape" parametrizado por el tipo
 * de sus claves foráneas:
 *   - fila real   → FK = uuid
 *   - propuesta   → FK = uuid | temp_ref ("$sys1"), para enlazar objetos que
 *                   todavía no existen dentro de un mismo change set (P-10).
 * Así una propuesta se valida con exactamente las mismas reglas que la fila
 * real (no hay tablas proposed_* que se desincronicen).
 */

export const uuid = z.string().uuid();
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha ISO (YYYY-MM-DD).");
export const timestamp = z.string().datetime({ offset: true });

export const TEMP_REF_RE = /^\$[a-z][a-z0-9_]*$/;
export const tempRef = z.string().regex(TEMP_REF_RE, "Referencia temporal ($nombre).");
/** FK dentro de una propuesta: id real o referencia temporal a otro ítem del mismo change set. */
export const ref = z.union([uuid, tempRef]);
export type FkSchema = typeof uuid | typeof ref;

/** ISO 4217. La meta guarda su moneda; las equivalencias son representación secundaria. */
export const currencyCode = z.string().regex(/^[A-Z]{3}$/, "Código de moneda ISO 4217 (USD, COP…).");
/** Clave de métrica: datos en metric_definitions, no código (P-14). */
export const metricKey = z.string().regex(/^[a-z][a-z0-9_]*$/, "Clave de métrica en snake_case.");

const nonEmpty = z.string().trim().min(1);
export const text = nonEmpty;
export const optText = z.string().trim().min(1).nullable().default(null);
export const textList = z.array(nonEmpty).default([]);

// ---------------------------------------------------------------------------
// Vocabularios de la spec
// ---------------------------------------------------------------------------

/** P-13: de dónde salió la fila. */
export const ORIGINS = ["manual", "import", "claude", "system", "obsidian"] as const;
export const ACTORS = ["user", "claude", "system"] as const;

/** §28: P0 resultado · P1 capacidad · P2 optimización/identidad. */
export const TIERS = ["p0", "p1", "p2"] as const;
export const TIER_LABEL: Record<(typeof TIERS)[number], string> = {
  p0: "P0 — Crítico",
  p1: "P1 — Capacidad",
  p2: "P2 — Secundario",
};

/** §68: fuente de cada dato. */
export const DATA_SOURCES = ["manual", "app", "crm", "calendar", "health", "screen_time", "api", "import", "claude", "obsidian"] as const;
/** §69: calidad del dato. Faltante nunca se convierte en cero. */
export const DATA_QUALITY = ["verified", "self_reported", "estimated", "incomplete", "missing"] as const;
/** §19: confianza por evidencia. */
export const CONFIDENCE_LEVELS = ["low", "medium", "high", "validated", "invalidated"] as const;
/** §18: tipo de supuesto. */
export const ASSUMPTION_TYPES = ["known", "estimated", "assumed", "unknown"] as const;
/** P-4 (§36 enmendada). */
export const METRIC_CATEGORIES = ["input", "process", "output", "outcome"] as const;
export const EXECUTION_MODES = ["deep", "shallow", "passive"] as const;

export const tier = z.enum(TIERS);
export const dataSource = z.enum(DATA_SOURCES);
export const dataQuality = z.enum(DATA_QUALITY);
export const confidenceLevel = z.enum(CONFIDENCE_LEVELS);
export const assumptionType = z.enum(ASSUMPTION_TYPES);
export const actor = z.enum(ACTORS);

// ---------------------------------------------------------------------------
// Columnas comunes de fila
// ---------------------------------------------------------------------------

/** Lo que asigna la base de datos. */
export const baseRowShape = {
  id: uuid,
  user_id: uuid,
  created_at: timestamp,
  updated_at: timestamp,
};

/** P-13: origen + versión + archivado (nada se borra, §67). */
export const provenanceShape = {
  origin: z.enum(ORIGINS),
  origin_change_item_id: uuid.nullable(),
  created_by: actor,
  version: z.number().int().min(1),
  archived_at: timestamp.nullable(),
};

/** Entidades versionables: una versión nueva reemplaza a la anterior sin borrarla (§101). */
export const supersededShape = { superseded_by: uuid.nullable() };

/** Convierte el shape de negocio en el esquema de fila completa. */
export function rowOf<S extends z.ZodRawShape>(fields: z.ZodObject<S>, opts: { versioned?: boolean } = {}) {
  const withBase = fields.extend(baseRowShape).extend(provenanceShape);
  return opts.versioned ? withBase.extend(supersededShape) : withBase;
}
