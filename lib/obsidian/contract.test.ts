import { describe, expect, it } from "vitest";
import { ENTITY_REGISTRY } from "@/lib/domain/registry";
import {
  bodyHash,
  classifyNote,
  DEFAULT_LAYOUT,
  folderPath,
  identityFrontmatter,
  LOGICAL_FOLDERS,
  logicalFolderOf,
  parseNote,
  resolveConflict,
  serializeNote,
  SOURCE_OF_TRUTH,
  syncAction,
} from "./contract";

const ID = "11111111-1111-4111-8111-111111111111";

describe("contrato Obsidian (A7)", () => {
  it("estructura P-7: 14 carpetas lógicas numeradas bajo PERSONAL-OS, con alias a la bóveda existente sin moverla", () => {
    expect(LOGICAL_FOLDERS).toHaveLength(14);
    expect(folderPath(DEFAULT_LAYOUT, "META")).toBe("PERSONAL-OS/00_META");
    expect(folderPath(DEFAULT_LAYOUT, "HYPOTHESES")).toBe("PERSONAL-OS/04_HYPOTHESES");
    expect(folderPath(DEFAULT_LAYOUT, "IDEAS")).toBe("PERSONAL-OS/13_IDEAS");
    expect(logicalFolderOf(DEFAULT_LAYOUT, "Core/Hipótesis v1.md")).toBe("HYPOTHESES");
    expect(logicalFolderOf(DEFAULT_LAYOUT, "01_Fundamentos Revolution/Oferta.md")).toBe("REVOLUTION");
    expect(logicalFolderOf(DEFAULT_LAYOUT, "PERSONAL-OS/09_DECISIONS/Decision 001.md")).toBe("DECISIONS");
    expect(logicalFolderOf(DEFAULT_LAYOUT, "Creativos/x.md")).toBeNull();
  });

  it("toda entidad del registro tiene fuente de verdad declarada (o es solo de la app)", () => {
    for (const t of Object.keys(SOURCE_OF_TRUTH)) {
      expect(t === "weekly_review" || t in ENTITY_REGISTRY, t).toBe(true);
    }
    expect(SOURCE_OF_TRUTH.goal).toMatchObject({ canonical: "app", direction: "app_to_obsidian" }); // la meta nunca entra desde Obsidian
    expect(SOURCE_OF_TRUTH.sop.canonical).toBe("obsidian");
  });

  it("frontmatter: lee las plantillas del vault y conserva tipos al ida y vuelta", () => {
    const md = `---\ndatabase: experiments\nstatus: "running"\nsample: 600\nactive: true\ntags: ["outbound", "volumen"]\nempty:\n---\n# Cuerpo\n`;
    const { frontmatter, body } = parseNote(md);
    expect(frontmatter).toEqual({ database: "experiments", status: "running", sample: 600, active: true, tags: ["outbound", "volumen"], empty: null });
    expect(parseNote(serializeNote(frontmatter, body))).toEqual({ frontmatter, body });
  });

  it("identidad estable: pos_id/pos_type/pos_version/pos_hash", () => {
    const body = "# Decisión 001\n";
    const fm = identityFrontmatter({ id: ID, type: "decision", version: 1 }, body, "2026-10-06T00:00:00Z");
    expect(fm).toMatchObject({ pos_id: ID, pos_type: "decision", pos_version: 1, pos_hash: bodyHash(body) });
  });

  describe("detección de cambios y acción (nunca escritura directa desde Obsidian)", () => {
    const body = "# Hipótesis\nTexto exportado\n";
    const exported = { frontmatter: identityFrontmatter({ id: ID, type: "hypothesis", version: 2 }, body, "2026-10-06T00:00:00Z"), body };
    it("sin cambios → nada; app más nueva → re-exportar", () => {
      expect(classifyNote(exported, { id: ID, version: 2 })).toEqual({ kind: "in_sync" });
      expect(syncAction(classifyNote(exported, { id: ID, version: 3 }), "hypothesis")).toBe("export");
    });
    it("editada en Obsidian → propuesta (change set), no escritura", () => {
      const edited = { ...exported, body: body + "\nNueva evidencia de la llamada.\n" };
      expect(classifyNote(edited, { id: ID, version: 2 })).toEqual({ kind: "obsidian_changed" });
      expect(syncAction({ kind: "obsidian_changed" }, "hypothesis")).toBe("propose_change");
    });
    it("cambió en ambos lados → conflicto con revisión humana; la app no se pisa", () => {
      const edited = { ...exported, body: body + "otro cambio" };
      expect(classifyNote(edited, { id: ID, version: 3 })).toEqual({ kind: "conflict" });
      expect(syncAction({ kind: "conflict" }, "hypothesis")).toBe("propose_with_conflict");
    });
    it("editar en Obsidian algo cuya verdad es solo de la app (p. ej. la meta) se trata como conflicto", () => {
      expect(syncAction({ kind: "obsidian_changed" }, "goal")).toBe("propose_with_conflict");
    });
    it("nota curada sin pos_id → se ofrece como documento fuente (ingesta P-10), nunca como entidad", () => {
      expect(syncAction(classifyNote(parseNote("# Doctrina de Revolution\n"), null), null)).toBe("offer_as_source_document");
    });
  });

  it("§123: dato operativo verificado > registro histórico > nota del usuario > inferencia de Claude > supuesto externo", () => {
    expect(resolveConflict("claude_inference", "verified_operational")).toBe("verified_operational");
    expect(resolveConflict("user_note", "claude_inference")).toBe("user_note");
    expect(resolveConflict("external_assumption", "historical_record")).toBe("historical_record");
  });
});

describe("plan de sincronización (núcleo de la Fase D)", () => {
  it("clasifica cada nota de la bóveda sin escribir nada; ignora carpetas fuera del contrato", async () => {
    const { planObsidianSync } = await import("./sources");
    const body = "# Sistema de adquisición\n";
    const tracked = serializeNote(identityFrontmatter({ id: ID, type: "system", version: 1 }, body, "2026-10-06T00:00:00Z"), body);
    const plan = planObsidianSync(
      {
        "PERSONAL-OS/02_SYSTEMS/Adquisicion.md": tracked,
        "PERSONAL-OS/02_SYSTEMS/Editada.md": tracked.replace("adquisición", "adquisición (editada)"),
        "Core/Hipotesis abogados v1.md": "# Hipótesis curada\n",
        "Creativos/anuncio.md": "# fuera del contrato\n",
      },
      new Map([[ID, { id: ID, version: 1 }]])
    );
    expect(plan.map((p) => [p.path, p.action])).toEqual([
      ["Core/Hipotesis abogados v1.md", "offer_as_source_document"],
      ["PERSONAL-OS/02_SYSTEMS/Adquisicion.md", "ignore"],
      ["PERSONAL-OS/02_SYSTEMS/Editada.md", "propose_change"],
    ]);
  });
});
