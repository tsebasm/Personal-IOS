import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { Sidebar } from "@/components/sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { isoDateInTimezone } from "@/lib/date";
import { getPendingMigrations } from "@/lib/data/schema-status";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const today = isoDateInTimezone(profile.timezone);

  const [{ data: areas }, { data: todayTasks }, pendingMigrations] = await Promise.all([
    supabase.from("areas").select("id, name, color").order("sort_order", { ascending: true }),
    supabase
      .from("tasks")
      .select("id, status")
      .eq("scheduled_date", today)
      .not("status", "in", "(cancelled)"),
    getPendingMigrations(),
  ]);

  const total = todayTasks?.length ?? 0;
  const remaining = todayTasks?.filter((t) => t.status !== "done").length ?? 0;

  return (
    <div className="min-h-screen flex bg-bg">
      <Sidebar
        areas={areas ?? []}
        userEmail={profile.email ?? ""}
        userName={profile.fullName}
        theme={profile.theme}
        mode={profile.mode}
        focus={{ remaining, total }}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileHeader userEmail={profile.email ?? ""} />
        {pendingMigrations.length > 0 && (
          <div className="border-b border-border bg-warn-bg px-4 py-2 text-xs text-warn">
            Migraciones pendientes en Supabase (SQL Editor, en este orden): {pendingMigrations.join(", ")}. Algunas vistas no
            funcionarán hasta ejecutarlas.
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
