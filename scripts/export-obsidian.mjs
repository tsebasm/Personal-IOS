// Exporta datos de Personal OS (Supabase) a la bóveda de Obsidian / VANT Brain.
// Unidireccional: Supabase es la fuente de verdad. Solo escribe dentro de
// "<VANT_BRAIN_PATH>/Personal OS (sync)/" — nunca toca las notas curadas.
//
// Uso: npm run export:obsidian
// Requiere en .env.local: VANT_BRAIN_PATH (p. ej. C:\VANT\VANT_Brain) y las
// credenciales de SEED_USER_* (inicia sesión como tú; pasa por RLS).

import fs from "node:fs";
import path from "node:path";
import { getSeedClient } from "./lib/supabase-client.mjs";
import {
  EXPORT_ROOT,
  experimentNote,
  hypothesisNote,
  indexNote,
  learningsNote,
  reviewNote,
} from "./lib/obsidian-md.mjs";

const sum = (rows, key) => rows.reduce((s, r) => s + (r[key] ?? 0), 0);
const totals = (rows) => ({
  contacts: sum(rows, "contacts_count"),
  replies: sum(rows, "replies_count"),
  appointments: sum(rows, "appointments_count"),
  shows: sum(rows, "shows_count"),
  closed: sum(rows, "clients_closed"),
});
const METRIC = {
  reply_rate: (t) => [t.replies, t.contacts],
  booking_rate: (t) => [t.appointments, t.replies],
  show_rate: (t) => [t.shows, t.appointments],
  close_rate: (t) => [t.closed, t.shows],
};

async function main() {
  const vault = process.env.VANT_BRAIN_PATH;
  if (!vault) throw new Error("Falta VANT_BRAIN_PATH en .env.local (ruta de la bóveda, p. ej. C:\\VANT\\VANT_Brain).");
  if (!fs.existsSync(path.join(vault, ".obsidian"))) {
    throw new Error(`${vault} no parece una bóveda de Obsidian (no tiene .obsidian/).`);
  }

  console.log("Iniciando sesión…");
  const { supabase } = await getSeedClient();
  const exportedAt = new Date().toISOString();

  const [hyps, exps, sessions, reviews, learnings] = await Promise.all([
    supabase.from("hypotheses").select("*"),
    supabase.from("experiments").select("*"),
    supabase
      .from("prospecting_sessions")
      .select("hypothesis_id, experiment_id, message_variant, contacts_count, replies_count, appointments_count, shows_count, clients_closed"),
    supabase.from("reviews").select("type, period_start, period_end, content").in("type", ["semanal", "mensual"]),
    supabase.from("knowledge_items").select("title, description, created_at").eq("kind", "decision").order("created_at", { ascending: false }),
  ]);
  for (const r of [hyps, exps, sessions, reviews, learnings]) if (r.error) throw new Error(r.error.message);

  const notes = [];
  for (const h of hyps.data) {
    notes.push(hypothesisNote(h, totals(sessions.data.filter((s) => s.hypothesis_id === h.id)), exportedAt));
  }
  for (const e of exps.data) {
    const own = sessions.data.filter((s) => s.experiment_id === e.id);
    const results = e.variants.map((v) => {
      const [num, den] = (METRIC[e.metric_key] ?? METRIC.reply_rate)(totals(own.filter((s) => (s.message_variant ?? "").trim() === v)));
      return { variant: v, n: den, rate: den > 0 ? num / den : null };
    });
    notes.push(experimentNote(e, results, exportedAt));
  }
  for (const r of reviews.data) notes.push(reviewNote(r, exportedAt));
  notes.push(learningsNote(learnings.data, exportedAt));
  notes.push(
    indexNote(
      { hypotheses: hyps.data.length, experiments: exps.data.length, reviews: reviews.data.length, learnings: learnings.data.length },
      exportedAt
    )
  );

  // Reemplazo completo de la carpeta generada (y solo de ella): lo borrado en Supabase desaparece aquí también.
  const root = path.join(vault, EXPORT_ROOT);
  fs.rmSync(root, { recursive: true, force: true });
  for (const n of notes) {
    const target = path.join(vault, n.path);
    if (!target.startsWith(root)) throw new Error(`Ruta fuera de la carpeta de exportación: ${n.path}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, n.content, "utf8");
  }
  console.log(`Listo: ${notes.length} notas en ${root}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
