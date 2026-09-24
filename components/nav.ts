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
  MessageCircle,
  Crosshair,
  Clock,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

/** Menú único para sidebar (escritorio) y header móvil. */
export const NAV: NavItem[] = [
  { href: "/dashboard/today", label: "Hoy", icon: Sun },
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/dashboard/plan", label: "Plan", icon: Crosshair },
  { href: "/dashboard/capacity", label: "Capacidad", icon: Clock },
  { href: "/dashboard/asistente", label: "Asistente", icon: MessageCircle },
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

export function isNavActive(href: string, pathname: string): boolean {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname === href || pathname.startsWith(`${href}/`);
}
