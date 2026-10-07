import { describe, expect, it } from "vitest";
import { STARTER_RULES, suggestTier, type TierContext, type TierTask } from "./tiers";

const SYS = "sys-adq";
const OBJ = "obj-5clientes";
const base: TierTask = { id: "t", tier: null, tier_suggested_source: null, origin: "manual", routine_id: null, lever: null, system_id: null, project_id: null, objective_id: null, goal_id: null };
const ctx = (over: Partial<TierContext> = {}): TierContext => ({
  rules: [],
  projects: new Map([["prj", { system_id: SYS, objective_id: OBJ, goal_id: null }]]),
  currentObjectiveIds: new Set([OBJ]),
  currentGoalIds: new Set(["goal"]),
  ...over,
});

describe("P0/P1/P2 sugerido (B-1)", () => {
  it("sin datos: P2; aportando a la meta actual: P1 (P0 nunca sale solo de la estructura)", () => {
    expect(suggestTier(base, ctx())).toMatchObject({ tier: "p2", source: "default" });
    expect(suggestTier({ ...base, project_id: "prj" }, ctx())).toMatchObject({ tier: "p1", source: "structure" });
    expect(suggestTier({ ...base, goal_id: "goal" }, ctx())).toMatchObject({ tier: "p1", source: "structure" });
  });

  it("las reglas son datos: la más específica gana (sistema + palanca > palanca > sistema)", () => {
    const rules = [
      { id: "r1", system_id: null, lever: "outbound", tier: "p0" as const },
      { id: "r2", system_id: SYS, lever: "outbound", tier: "p1" as const, note: "en este sistema ya hay volumen" },
      { id: "r3", system_id: SYS, lever: null, tier: "p2" as const },
    ];
    expect(suggestTier({ ...base, lever: "outbound" }, ctx({ rules }))).toMatchObject({ tier: "p0", source: "rule" });
    const specific = suggestTier({ ...base, lever: "outbound", project_id: "prj" }, ctx({ rules }));
    expect(specific).toMatchObject({ tier: "p1", source: "rule" });
    expect(specific.reason).toContain("palanca outbound): en este sistema ya hay volumen");
    expect(suggestTier({ ...base, lever: "admin", system_id: SYS }, ctx({ rules }))).toMatchObject({ tier: "p2", source: "rule" });
  });

  it("el título nunca decide: misma tarea con otro título, mismo nivel", () => {
    const rules = [{ id: "r1", system_id: null, lever: "follow_up", tier: "p0" as const }];
    const a = suggestTier({ ...base, lever: "follow_up" }, ctx({ rules }));
    expect(a.tier).toBe("p0");
    expect(suggestTier({ ...base, lever: null }, ctx({ rules })).tier).toBe("p2");
  });

  it("rutinas y planes aprobados mandan sobre las reglas", () => {
    const rules = [{ id: "r1", system_id: null, lever: "outbound", tier: "p2" as const }];
    expect(suggestTier({ ...base, lever: "outbound", routine_id: "rt", routine_tier: "p0" }, ctx({ rules }))).toMatchObject({ tier: "p0", source: "routine" });
    expect(suggestTier({ ...base, lever: "outbound", tier: "p1", origin: "import" }, ctx({ rules }))).toMatchObject({ tier: "p1", source: "plan" });
  });

  it("las reglas sugeridas son genéricas por palanca (no de un negocio) y cubren todas las palancas", async () => {
    const { TASK_LEVERS } = await import("@/lib/tasks");
    expect(STARTER_RULES.map((r) => r.lever).sort()).toEqual([...TASK_LEVERS].sort());
  });
});
