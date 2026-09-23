-- RLS para el asistente de IA — mismo patrón que 0002_rls.sql / 0005_agencia_rls.sql.

alter table public.ai_conversations enable row level security;
create policy "ai_conversations_select_own" on public.ai_conversations for select using (auth.uid() = user_id);
create policy "ai_conversations_insert_own" on public.ai_conversations for insert with check (auth.uid() = user_id);
create policy "ai_conversations_update_own" on public.ai_conversations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_conversations_delete_own" on public.ai_conversations for delete using (auth.uid() = user_id);

alter table public.ai_messages enable row level security;
create policy "ai_messages_select_own" on public.ai_messages for select using (auth.uid() = user_id);
create policy "ai_messages_insert_own" on public.ai_messages for insert with check (auth.uid() = user_id);
create policy "ai_messages_update_own" on public.ai_messages for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_messages_delete_own" on public.ai_messages for delete using (auth.uid() = user_id);
