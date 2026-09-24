"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard/agencia", label: "Dashboard" },
  { href: "/dashboard/agencia/campaigns", label: "Campañas" },
  { href: "/dashboard/agencia/prospecting", label: "Prospección" },
  { href: "/dashboard/agencia/leads", label: "Leads" },
  { href: "/dashboard/agencia/hypotheses", label: "Hipótesis" },
  { href: "/dashboard/agencia/experiments", label: "Experimentos" },
  { href: "/dashboard/agencia/clients", label: "Clientes" },
];

export function AgenciaTabs() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 border-b border-border mb-6 -mt-2 overflow-x-auto">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`whitespace-nowrap px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
              active ? "border-ink text-ink font-medium" : "border-transparent text-ink-dim hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
