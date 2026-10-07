/**
 * Modelo de dominio del Personal Execution OS (PHASE-A-DESIGN.md, spec §65 + §130).
 * Capa 1 estrategia · Capa 2 ejecución · Capa 3 inteligencia/ingesta.
 * La UI y los motores consumen estos tipos; lib/data/* mapea filas ↔ dominio.
 */
export * from "./common";
export * from "./strategy";
export * from "./execution";
export * from "./intelligence";
export * from "./registry";
export * from "./finance";
export * from "./legacy";
