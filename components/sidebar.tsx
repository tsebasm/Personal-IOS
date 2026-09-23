"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  Sun,
  CheckSquare,
  FolderKanban,
  Target,
  Repeat,
  BookOpen,
  Wallet,
  RefreshCw,
  Sparkles,
  Building2,
  Plus,
  MessageCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ModeToggle } from "@/components/mode-toggle";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/dashboard/asistente", label: "Asistente", icon: MessageCircle },
  { href: "/dashboard/today", label: "Hoy", icon: Sun },
  { href: "/dashboard/tasks", label: "Tareas", icon: CheckSquare },
  { href: "/dashboard/projects", label: "Proyectos", icon: FolderKanban },
  { href: "/dashboard/goals", label: "Metas", icon: Target },
  { href: "/dashboard/habits", label: "Hábitos", icon: Repeat },
  { href: "/dashboard/knowledge", label: "Conocimiento", icon: BookOpen },
  { href: "/dashboard/agencia", label: "Agencia", icon: Building2 },
  { href: "/dashboard/finances", label: "Finanzas", icon: Wallet },
  { href: "/dashboard/reviews", label: "Revisiones", icon: RefreshCw },
  { href: "/dashboard/insights", label: "Insights", icon: Sparkles },
];

export function Sidebar({
  areas,
  userEmail,
  userName,
  theme,
  mode,
  focus,
}: {
  areas: { id: string; name: string; color: string | null }[];
  userEmail: string;
  userName: string | null;
  theme: "system" | "light" | "dark";
  mode: "normal" | "config";
  focus: { remaining: number; total: number };
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const displayName = userName || "Sebastián";
  const initials = displayName.slice(0, 1).toUpperCase();
  const pct = focus.total > 0 ? Math.round(((focus.total - focus.remaining) / focus.total) * 100) : 0;

  return (
    <aside className="hidden md:flex md:w-64 md:flex-none md:flex-col border-r border-border bg-surface px-4 py-5">
      <div className="flex items-center gap-3 px-2 pb-5 mb-4 border-b border-border">
        <div className="h-9 w-9 rounded-full bg-ink text-bg flex items-center justify-center font-semibold text-sm">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink truncate">{displayName}</div>
          <div className="text-xs text-ink-dim truncate">Enfoque • Disciplina • Ejecución</div>
        </div>
      </div>

      <div className="text-[0.68rem] uppercase tracking-[0.08em] text-ink-dim px-2 mb-2">
        Menú
      </div>
      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
                active ? "bg-ink text-bg font-medium" : "text-ink hover:bg-surface-2"
              }`}
            >
              <Icon size={16} className={active ? "text-bg" : "text-ink-dim"} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between px-2 mt-6 mb-2">
        <span className="text-[0.68rem] uppercase tracking-[0.08em] text-ink-dim">Áreas</span>
        <Link href="/dashboard/areas" className="text-ink-dim hover:text-ink" title="Añadir área">
          <Plus size={13} />
        </Link>
      </div>
      <div className="flex flex-col gap-0.5">
        {areas.length === 0 ? (
          <Link
            href="/dashboard/areas"
            className="px-2.5 py-2 text-xs text-ink-dim hover:text-ink"
          >
            Sin áreas todavía · + Añadir área
          </Link>
        ) : (
          areas.map((a) => (
            <Link
              key={a.id}
              href={`/dashboard/areas/${a.id}`}
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm text-ink-dim hover:bg-surface-2 hover:text-ink"
            >
              <span
                className="h-1.5 w-1.5 rounded-full flex-none"
                style={{ backgroundColor: a.color || "var(--ink-dim)" }}
              />
              <span className="truncate">{a.name}</span>
            </Link>
          ))
        )}
      </div>

      <div className="mt-auto pt-5">
        <div className="rounded-card border border-border bg-surface-2 px-3 py-3">
          <div className="text-xs font-semibold text-ink mb-2">Enfoque del día</div>
          {focus.total === 0 ? (
            <p className="text-[0.7rem] text-ink-dim">Sin bloques programados hoy</p>
          ) : (
            <>
              <p className="text-[0.7rem] text-ink-dim mb-2">
                {focus.remaining} {focus.remaining === 1 ? "bloque restante" : "bloques restantes"}
              </p>
              <ProgressBar value={pct} />
            </>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-0.5">
          <ModeToggle mode={mode} />
          <ThemeToggle theme={theme} />
          <button
            type="button"
            onClick={handleSignOut}
            className="text-left text-sm text-ink-dim hover:text-bad px-2.5 py-1.5"
          >
            Cerrar sesión
          </button>
        </div>
        <div className="px-2.5 mt-1 text-[0.68rem] text-ink-dim truncate">{userEmail}</div>
      </div>
    </aside>
  );
}
