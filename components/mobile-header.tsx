"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NAV, isNavActive } from "@/components/nav";

/** Header móvil con menú: el sistema se usa desde el celular (p. ej. en transporte). */
export function MobileHeader({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="md:hidden border-b border-border bg-surface">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          className="flex items-center gap-2 text-sm font-semibold text-ink"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
          Personal OS
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-dim truncate max-w-[120px]">{userEmail}</span>
          <button type="button" onClick={handleSignOut} className="text-xs text-ink-dim hover:text-bad">
            Salir
          </button>
        </div>
      </div>
      {open && (
        <nav className="grid grid-cols-2 gap-1 px-3 pb-3">
          {NAV.map((item) => {
            const active = isNavActive(item.href, pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-sm ${
                  active ? "bg-ink text-bg font-medium" : "text-ink hover:bg-surface-2"
                }`}
              >
                <Icon size={15} className={active ? "text-bg" : "text-ink-dim"} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
