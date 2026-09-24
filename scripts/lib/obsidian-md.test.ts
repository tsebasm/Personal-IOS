import { describe, expect, it } from "vitest";
import { EXPORT_ROOT, experimentNote, frontmatter, hypothesisNote, safeName } from "./obsidian-md.mjs";

describe("export a Obsidian", () => {
  it("nombres de archivo seguros y estables", () => {
    expect(safeName('Abogados: "familia" / Bogotá?', "1234567890")).toBe("Abogados familia Bogota (12345678)");
  });

  it("frontmatter YAML con arrays y nulos", () => {
    expect(frontmatter({ a: "x", b: null, c: ["A", "B"], d: 3 })).toBe('---\na: "x"\nb: \nc: ["A", "B"]\nd: 3\n---\n');
  });

  it("todas las notas viven en la carpeta de exportación", () => {
    const h = hypothesisNote(
      { id: "h1", statement: "Nicho X", type: "niche", status: "testing", confidence: 40, evidence: null, source: null },
      { contacts: 100, replies: 8, appointments: 2, closed: 0 },
      "2026-09-24"
    );
    expect(h.path.startsWith(`${EXPORT_ROOT}/Hipotesis/`)).toBe(true);
    expect(h.content).toContain("Respuestas: 8 (8.0%)");
    expect(h.content).toContain("HIPÓTESIS");

    const e = experimentNote(
      { id: "e1", name: "Mensaje A/B", metric_key: "reply_rate", variants: ["A", "B"], sample_target: 100, started_on: "2026-09-24", ended_on: null, status: "running", decision: null, learning: null },
      [{ variant: "A", n: 50, rate: 0.1 }, { variant: "B", n: 20, rate: null }],
      "2026-09-24"
    );
    expect(e.path.startsWith(`${EXPORT_ROOT}/Experimentos/`)).toBe(true);
    expect(e.content).toContain("| A | 50 / 100 | 10.0% |");
  });
});
