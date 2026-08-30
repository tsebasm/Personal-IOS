import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { MobileHeader } from "@/components/mobile-header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: areas } = await supabase
    .from("areas")
    .select("id, name")
    .order("sort_order", { ascending: true });

  return (
    <div className="min-h-screen flex bg-bg">
      <Sidebar
        areas={areas ?? []}
        userEmail={user.email ?? ""}
        userName={profile?.full_name ?? null}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileHeader userEmail={user.email ?? ""} />
        {children}
      </div>
    </div>
  );
}
