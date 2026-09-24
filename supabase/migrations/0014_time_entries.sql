-- Fase 4 (ARQUITECTURA_PERSONAL_OS.md §3.3): registro de tiempo.
--
-- Mide asignación de recursos (en qué se fue el tiempo), no productividad
-- moral: 'perdido' es una categoría más, sin juicio. Se compara contra la
-- asignación que el plan requiere (execution gap).
create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  date date not null default current_date,
  minutes integer not null check (minutes > 0 and minutes <= 1440),
  category text not null check (category in ('ventas','construccion','estudio','admin','personal','recuperacion','perdido')),
  execution_mode text check (execution_mode is null or execution_mode in ('deep','shallow','passive')),
  task_id uuid references public.tasks(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_time_entries_user_date on public.time_entries(user_id, date);

alter table public.time_entries enable row level security;
create policy "time_entries_select_own" on public.time_entries for select using (auth.uid() = user_id);
create policy "time_entries_insert_own" on public.time_entries for insert with check (auth.uid() = user_id);
create policy "time_entries_update_own" on public.time_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "time_entries_delete_own" on public.time_entries for delete using (auth.uid() = user_id);
