-- Fase 3 (ARQUITECTURA_PERSONAL_OS.md §3.3): capacidad real de tiempo.
--
-- Bloques recurrentes por día de la semana (0 = domingo … 6 = sábado).
-- `kind` separa lo comprometido (sueño, universidad, trabajo…) de la
-- capacidad utilizable: deep / shallow / passive (transporte cuenta como
-- pasivo) / recovery. Un bloque que cruza medianoche (end < start) se
-- cuenta en el día en que empieza. valid_from/valid_to permiten cambiar el
-- horario (p. ej. vacaciones) sin borrar el anterior.
create table if not exists public.capacity_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  label text not null,
  kind text not null check (kind in ('sleep','university','transport','meal','exercise','work','deep','shallow','passive','recovery','other')),
  days_of_week smallint[] not null check (array_length(days_of_week, 1) >= 1 and days_of_week <@ array[0,1,2,3,4,5,6]::smallint[]),
  start_time time not null,
  end_time time not null check (end_time <> start_time),
  valid_from date,
  valid_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_capacity_blocks_user on public.capacity_blocks(user_id);

drop trigger if exists set_updated_at on public.capacity_blocks;
create trigger set_updated_at before update on public.capacity_blocks
  for each row execute function public.set_updated_at();

alter table public.capacity_blocks enable row level security;
create policy "capacity_blocks_select_own" on public.capacity_blocks for select using (auth.uid() = user_id);
create policy "capacity_blocks_insert_own" on public.capacity_blocks for insert with check (auth.uid() = user_id);
create policy "capacity_blocks_update_own" on public.capacity_blocks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "capacity_blocks_delete_own" on public.capacity_blocks for delete using (auth.uid() = user_id);

-- Modo adaptativo: los motivos de no-completar se guardan en activity_logs
-- (existe desde 0001 y no tenía escritores). Índice para leerlos por tarea.
create index if not exists idx_activity_logs_entity on public.activity_logs(entity_type, entity_id);
