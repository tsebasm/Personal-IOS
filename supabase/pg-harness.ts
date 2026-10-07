import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

/**
 * Postgres real (PGlite/WASM) para probar migraciones y RLS sin Supabase.
 * Simula lo mínimo de Supabase que usan las migraciones:
 *  - auth.users + auth.uid() (lee el "sub" del JWT de la sesión simulada);
 *  - rol `authenticated` (no es dueño de las tablas, así que RLS se aplica).
 */

export const MIGRATIONS_DIR = path.join(__dirname, "migrations");

const AUTH_STUB = `
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
`;

const GRANTS = `
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
`;

export function migrationFiles(): string[] {
  return fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
}

/** Crea una base nueva con todas las migraciones aplicadas en orden (o hasta `upTo`, incluida). */
export async function migratedDb(upTo?: string): Promise<PGlite> {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(AUTH_STUB);
  for (const f of migrationFiles()) {
    if (upTo && f > upTo) break;
    try {
      await db.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf8"));
    } catch (e) {
      throw new Error(`Falló ${f}: ${(e as Error).message}`);
    }
  }
  await db.exec(GRANTS);
  return db;
}

/** Aplica las migraciones posteriores a `after` (para probar migraciones de datos sobre filas previas). */
export async function applyMigrationsAfter(db: PGlite, after: string) {
  for (const f of migrationFiles().filter((x) => x > after)) {
    try {
      await db.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf8"));
    } catch (e) {
      throw new Error(`Falló ${f}: ${(e as Error).message}`);
    }
  }
  await db.exec(GRANTS);
}

export async function applySqlFile(db: PGlite, file: string) {
  await db.exec(fs.readFileSync(file, "utf8"));
}

/** Ejecuta `fn` como un usuario autenticado (RLS activo); restaura el superusuario al terminar. */
export async function asUser<T>(db: PGlite, userId: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; reset request.jwt.claim.sub;`);
  }
}

export async function createUser(db: PGlite, id: string) {
  await db.query("insert into auth.users (id) values ($1)", [id]);
}
