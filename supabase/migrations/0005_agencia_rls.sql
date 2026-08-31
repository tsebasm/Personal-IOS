-- RLS para las tablas del módulo Agencia — mismo patrón que 0002_rls.sql.

alter table public.agencia_settings enable row level security;
create policy "agencia_settings_select_own" on public.agencia_settings for select using (auth.uid() = user_id);
create policy "agencia_settings_insert_own" on public.agencia_settings for insert with check (auth.uid() = user_id);
create policy "agencia_settings_update_own" on public.agencia_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "agencia_settings_delete_own" on public.agencia_settings for delete using (auth.uid() = user_id);

alter table public.campaigns enable row level security;
create policy "campaigns_select_own" on public.campaigns for select using (auth.uid() = user_id);
create policy "campaigns_insert_own" on public.campaigns for insert with check (auth.uid() = user_id);
create policy "campaigns_update_own" on public.campaigns for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "campaigns_delete_own" on public.campaigns for delete using (auth.uid() = user_id);

alter table public.prospecting_sessions enable row level security;
create policy "prospecting_sessions_select_own" on public.prospecting_sessions for select using (auth.uid() = user_id);
create policy "prospecting_sessions_insert_own" on public.prospecting_sessions for insert with check (auth.uid() = user_id);
create policy "prospecting_sessions_update_own" on public.prospecting_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "prospecting_sessions_delete_own" on public.prospecting_sessions for delete using (auth.uid() = user_id);

alter table public.vant_clients enable row level security;
create policy "vant_clients_select_own" on public.vant_clients for select using (auth.uid() = user_id);
create policy "vant_clients_insert_own" on public.vant_clients for insert with check (auth.uid() = user_id);
create policy "vant_clients_update_own" on public.vant_clients for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vant_clients_delete_own" on public.vant_clients for delete using (auth.uid() = user_id);
