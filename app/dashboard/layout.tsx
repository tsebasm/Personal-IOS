import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { Sidebar } from "@/components/sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { isoDateInTimezone } from "@/lib/date";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const today = isoDateInTimezone(profile.timezone);

  const [{ data: areas }, { data: todayTasks }] = await Promise.all([
    supabase.from("areas").select("id, name, color").order("sort_order", { ascending: true }),
    supabase
      .from("tasks")
      .select("id, status")
      .eq("scheduled_date", today)
      .not("status", "in", "(cancelled)"),
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
        {children}
      </div>
    </div>
  );
}
