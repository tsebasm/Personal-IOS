"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  phase: number; // roadmap phase that builds this section
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "▦", phase: 1 },
  { href: "/today", label: "Hoy", icon: "☉", phase: 3 },
  { href: "/inbox", label: "Inbox", icon: "▾", phase: 5 },
  { href: "/goals", label: "Metas", icon: "◎", phase: 2 },
  { href: "/projects", label: "Proyectos", icon: "▤", phase: 2 },
  { href: "/tasks", label: "Tareas", icon: "☑", phase: 3 },
  { href: "/habits", label: "Hábitos", icon: "↻", phase: 6 },
  { href: "/knowledge", label: "Conocimiento", icon: "✦", phase: 7 },
  { href: "/finances", label: "Finanzas", icon: "◆", phase: 8 },
  { href: "/calendar", label: "Calendario", icon: "▦", phase: 9 },
  { href: "/reviews", label: "Revisiones", icon: "↺", phase: 10 },
  { href: "/insights", label: "Insights", icon: "◈", phase: 11 },
];

const CURRENT_PHASE = 1;

export function Sidebar({
  areas,
  userEmail,
  userName,
}: {
  areas: { id: string; name: string }[];
  userEmail: string;
  userName: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = (userName || userEmail).slice(0, 1).toUpperCase();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-none md:flex-col border-r border-border bg-surface px-4 py-5">
      <div className="flex items-center gap-3 px-2 pb-5 mb-4 border-b border-border">
        <div className="h-9 w-9 rounded-full bg-navy text-navy-ink flex items-center justify-center font-display font-semibold text-sm">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-ink truncate">
            {userName || "Sebastián"}
          </div>
          <div className="text-xs text-ink-dim truncate">{userEmail}</div>
        </div>
      </div>

      <div className="text-[0.68rem] uppercase tracking-[0.08em] text-ink-dim px-2 mb-2">
        Menú
      </div>
      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const built = item.phase <= CURRENT_PHASE;
          if (!built) {
            return (
              <div
                key={item.href}
                className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-sm text-ink-dim/60 cursor-not-allowed select-none"
                title={`Se construye en la Fase ${item.phase}`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="w-4 text-center">{item.icon}</span>
                  {item.label}
                </span>
                <span className="text-[0.62rem] font-mono border border-border rounded px-1 py-0.5 text-ink-dim/70">
                  F{item.phase}
                </span>
              </div>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm ${
                active
                  ? "bg-navy text-navy-ink font-medium"
                  : "text-ink hover:bg-surface-2"
              }`}
            >
              <span className="w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="text-[0.68rem] uppercase tracking-[0.08em] text-ink-dim px-2 mt-6 mb-2">
        Áreas
      </div>
      <div className="flex flex-col gap-0.5">
        {areas.length === 0 ? (
          <div className="px-2.5 py-2 text-xs text-ink-dim">
            Se crean en la Fase 2.
          </div>
        ) : (
          areas.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm text-ink-dim"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {a.name}
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        className="mt-auto pt-4 text-left text-sm text-ink-dim hover:text-bad px-2.5"
      >
        Cerrar sesión
      </button>
    </aside>
  );
}
