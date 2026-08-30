"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function MobileHeader({ userEmail }: { userEmail: string }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
      <div className="text-sm font-medium text-ink">Personal OS</div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-ink-dim truncate max-w-[120px]">{userEmail}</span>
        <button
          type="button"
          onClick={handleSignOut}
          className="text-xs text-ink-dim underline"
        >
          Salir
        </button>
      </div>
    </div>
  );
}
