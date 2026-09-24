import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Qué migraciones faltan en la base conectada. Las migraciones se aplican a
 * mano (SQL Editor), así que el código puede llegar a producción antes que
 * el esquema: en vez de romper, el layout muestra cuáles ejecutar.
 * Cada prueba lee una columna/tabla que introduce esa migración (limit 0).
 */
const PROBES: { file: string; table: string; column: string }[] = [
  { file: "0011_foundation.sql", table: "hypotheses", column: "id" },
  { file: "0012_plan_assumptions.sql", table: "agencia_settings", column: "funnel_assumptions" },
  { file: "0013_capacity_blocks.sql", table: "capacity_blocks", column: "id" },
  { file: "0014_time_entries.sql", table: "time_entries", column: "id" },
  { file: "0015_growth_engine.sql", table: "leads", column: "id" },
];

/** Códigos de Postgres/PostgREST para "no existe": tabla o columna. */
const MISSING_CODES = new Set(["42P01", "42703", "PGRST204", "PGRST205"]);

export const getPendingMigrations = cache(async (): Promise<string[]> => {
  const supabase = await createClient();
  const results = await Promise.all(
    PROBES.map(async (p) => {
      const { error } = await supabase.from(p.table).select(p.column).limit(0);
      return error && MISSING_CODES.has(error.code) ? p.file : null;
    })
  );
  return results.filter((f): f is string => f !== null);
});
