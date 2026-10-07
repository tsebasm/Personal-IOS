import type { Decision, Hypothesis, Idea, IdentityRule, Objective, Project, Sop, System } from "@/lib/domain/strategy";
import { classifyNote, DEFAULT_LAYOUT, logicalFolderOf, parseNote, syncAction, type VaultLayout } from "./contract";

/**
 * Interfaces de la integración (PHASE-A-DESIGN §8.4). La Capa 1 (estrategia)
 * puede leerse de la app o, en la Fase D, también de Obsidian; la Capa 2 se
 * exporta a Obsidian. Ningún "source" escribe entidades: lo que llega de
 * Obsidian se convierte en propuesta (P-10).
 */
export interface StrategySource {
  getObjectives(): Promise<Objective[]>;
  getSystems(): Promise<System[]>;
  getProjects(): Promise<Project[]>;
  getHypotheses(): Promise<Hypothesis[]>;
  getDecisions(): Promise<Decision[]>;
  getSops(): Promise<Sop[]>;
  getIdentityRules(): Promise<IdentityRule[]>;
  getIdeas(): Promise<Idea[]>;
}

export interface ExecutionSink {
  writeNote(path: string, markdown: string): Promise<void>;
}

export type SyncPlanItem = {
  path: string;
  folder: string | null;
  posId: string | null;
  posType: string | null;
  action: ReturnType<typeof syncAction>;
};

/**
 * Plan de sincronización (puro): dado el contenido de la bóveda y las versiones
 * actuales en la app, decide qué hacer con cada nota. La Fase D lo ejecuta
 * (exportar, o crear documento fuente + change set propuesto).
 */
export function planObsidianSync(
  files: Record<string, string>,
  appVersions: Map<string, { id: string; version: number }>,
  layout: VaultLayout = DEFAULT_LAYOUT
): SyncPlanItem[] {
  return Object.entries(files)
    .filter(([path]) => path.endsWith(".md") && logicalFolderOf(layout, path) !== null)
    .map(([path, md]) => {
      const note = parseNote(md);
      const posId = typeof note.frontmatter.pos_id === "string" ? note.frontmatter.pos_id : null;
      const posType = typeof note.frontmatter.pos_type === "string" ? note.frontmatter.pos_type : null;
      const state = classifyNote(note, posId ? (appVersions.get(posId) ?? null) : null);
      return { path, folder: logicalFolderOf(layout, path), posId, posType, action: syncAction(state, posType) };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}
