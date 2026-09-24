import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const dir = path.join(__dirname, "migrations");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const sql = files.map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");

describe("migraciones", () => {
  it("numeradas sin huecos ni duplicados", () => {
    const nums = files.map((f) => Number(f.slice(0, 4)));
    nums.forEach((n, i) => expect(n).toBe(i + 1));
  });

  it("toda tabla creada tiene RLS y las 4 políticas por usuario", () => {
    const tables = [...sql.matchAll(/create table if not exists public\.(\w+)/g)].map((m) => m[1]);
    // goal_metrics se eliminó en 0011.
    for (const t of tables.filter((x) => x !== "goal_metrics")) {
      expect(sql, `RLS en ${t}`).toMatch(new RegExp(`alter table public\\.${t} enable row level security`));
      // profiles no tiene delete a propósito: se borra en cascada con auth.users.
      const ops = t === "profiles" ? ["select", "insert", "update"] : ["select", "insert", "update", "delete"];
      for (const op of ops) {
        expect(sql, `política ${op} en ${t}`).toMatch(new RegExp(`create policy "${t}_${op}_own"`));
      }
    }
  });

  it("el banner de migraciones pendientes conoce cada migración desde la 0008 que agrega tablas/columnas", () => {
    const status = fs.readFileSync(path.join(__dirname, "..", "lib", "data", "schema-status.ts"), "utf8");
    const probed = new Set([...status.matchAll(/file: "(\d{4})_/g)].map((m) => m[1]));
    // 0009 es RLS de 0008 (se reportan juntas);
    // 0016 solo cambia un CHECK: no se puede sondear con un select y tiene fallback en el código.
    const exempt = new Set(["0009", "0016"]);
    for (const f of files.filter((x) => Number(x.slice(0, 4)) >= 8)) {
      const n = f.slice(0, 4);
      if (!exempt.has(n)) expect(probed.has(n), `${f} sin sonda en schema-status.ts`).toBe(true);
    }
  });
});
