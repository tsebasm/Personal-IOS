import { afterEach, describe, expect, it, vi } from "vitest";
import { MissingSupabaseEnvError, readSupabaseEnv } from "./env";

afterEach(() => vi.unstubAllEnvs());

const clear = () => {
  for (const k of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
  ])
    vi.stubEnv(k, "");
};

describe("readSupabaseEnv", () => {
  it("usa los nombres NEXT_PUBLIC_* del proyecto", () => {
    clear();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    expect(readSupabaseEnv()).toEqual({ url: "https://x.supabase.co", key: "anon" });
  });

  it("acepta los nombres de la integración Vercel ↔ Supabase", () => {
    clear();
    vi.stubEnv("SUPABASE_URL", "https://y.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "pub");
    expect(readSupabaseEnv()).toEqual({ url: "https://y.supabase.co", key: "pub" });
  });

  it("dice exactamente qué variable falta (sin exponer valores)", () => {
    clear();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    expect(() => readSupabaseEnv()).toThrow(MissingSupabaseEnvError);
    expect(() => readSupabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });
});
