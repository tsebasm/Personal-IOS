import { z } from "zod";
import { actor, assumptionType, confidenceLevel, optText, tempRef, text, timestamp, uuid } from "./common";

/**
 * CAPA 3 — INTELIGENCIA / INGESTA (P-10).
 * source_documents → plan_imports → change_sets → change_items → aprobación → entidades reales.
 * Esta capa solo escribe en sus propias tablas; las entidades reales las crea
 * applyChangeSet (A3) con la sesión del usuario tras su aprobación.
 */

export const SOURCE_DOCUMENT_KINDS = ["chat_text", "upload", "obsidian_note", "url"] as const;

export const sourceDocumentShape = z.object({
  kind: z.enum(SOURCE_DOCUMENT_KINDS),
  title: text,
  /** La entrada humana tal cual. Inmutable: si cambia, es otro documento (otro hash). */
  content: text,
  storage_path: optText,
  obsidian_path: optText,
  content_hash: z.string().regex(/^[a-f0-9]{64}$/, "SHA-256 en hexadecimal."),
  created_by: actor,
});

export const INTERPRETERS = ["claude", "template", "manual"] as const;
export const PLAN_IMPORT_STATUSES = ["pending", "interpreted", "needs_input", "proposed", "applied", "rejected", "failed"] as const;

export const inconsistencyShape = z.object({
  code: z.string().regex(/^[a-z][a-z0-9_]*$/),
  message: text,
  refs: z.array(z.string()).default([]),
});
export const questionShape = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]*$/),
  question: text,
  options: z.array(text).default([]),
  answer: optText,
});

export const planImportShape = z.object({
  source_document_id: uuid,
  interpreter: z.enum(INTERPRETERS),
  /** Modelo + versión de prompt/plantilla: la misma fuente puede reinterpretarse. */
  interpreter_version: text,
  status: z.enum(PLAN_IMPORT_STATUSES).default("pending"),
  detected: z.record(z.unknown()).default({}),
  inconsistencies: z.array(inconsistencyShape).default([]),
  questions: z.array(questionShape).default([]),
  /** Meta activa y sistemas existentes al momento de interpretar. */
  context_snapshot: z.record(z.unknown()).default({}),
});

export const CHANGE_SET_STATUSES = ["draft", "proposed", "approved", "partially_approved", "rejected", "applied", "failed"] as const;

export const changeSetShape = z.object({
  /** null cuando la propuesta no viene de un documento (p. ej. Claude tras una revisión semanal). */
  plan_import_id: uuid.nullable().default(null),
  title: text,
  rationale: optText,
  proposed_by: actor,
  status: z.enum(CHANGE_SET_STATUSES).default("draft"),
  decision_id: uuid.nullable().default(null),
  applied_at: timestamp.nullable().default(null),
});

export const CHANGE_OPS = ["create", "update", "archive"] as const;
export const CHANGE_ITEM_STATUSES = ["proposed", "approved", "rejected", "modified", "applied"] as const;
/** normal: basta la aprobación · strategic: exige una decisión con razón · locked: no se puede proponer directamente. */
export const SENSITIVITIES = ["normal", "strategic", "locked"] as const;
export type Sensitivity = (typeof SENSITIVITIES)[number];

export const changeItemShape = z.object({
  change_set_id: uuid,
  seq: z.number().int().min(1),
  op: z.enum(CHANGE_OPS),
  entity_type: z.string(),
  entity_id: uuid.nullable().default(null),
  temp_ref: tempRef.nullable().default(null),
  payload: z.record(z.unknown()).default({}),
  before: z.record(z.unknown()).nullable().default(null),
  depends_on: z.array(tempRef).default([]),
  status: z.enum(CHANGE_ITEM_STATUSES).default("proposed"),
  sensitivity: z.enum(SENSITIVITIES),
  confidence: confidenceLevel.nullable().default(null),
  assumption_type: assumptionType.nullable().default(null),
});

const intelligenceRow = <S extends z.ZodRawShape>(o: z.ZodObject<S>) =>
  o.extend({ id: uuid, user_id: uuid, created_at: timestamp, updated_at: timestamp });

export const SourceDocument = sourceDocumentShape.extend({ id: uuid, user_id: uuid, created_at: timestamp });
export const PlanImport = intelligenceRow(planImportShape);
export const ChangeSet = intelligenceRow(changeSetShape);
export const ChangeItem = intelligenceRow(changeItemShape);

export type SourceDocument = z.infer<typeof SourceDocument>;
export type PlanImport = z.infer<typeof PlanImport>;
export type ChangeSet = z.infer<typeof ChangeSet>;
export type ChangeItem = z.infer<typeof ChangeItem>;
export type Inconsistency = z.infer<typeof inconsistencyShape>;
export type Question = z.infer<typeof questionShape>;
