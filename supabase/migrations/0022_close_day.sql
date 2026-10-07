-- Fase B4 (spec §35, P-3): cerrar el día como snapshot inmutable.
--
-- daily_log_metrics completa P-3 (aprobada): la tabla de métricas del registro
-- diario (objetivo vs real por métrica), que 0017 no creó.
-- close_daily_log: crea/completa el registro del día, guarda sus métricas y lo
-- cierra en una transacción. Un día cerrado no se edita ni se borra (§67: el
-- histórico se preserva); si algo estaba mal, se anota en el día siguiente.

create table if not exists public.daily_log_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  daily_log_id uuid not null references public.daily_logs(id) on delete cascade,
  metric_key text not null check (metric_key ~ '^[a-z][a-z0-9_]*$'),
  target numeric,
  -- null = sin datos ese día (no es cero, §69)
  actual numeric,
  source text not null,
  quality text not null default 'self_reported' check (quality in ('verified','self_reported','estimated','incomplete','missing')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (daily_log_id, metric_key),
  check (actual is not null or quality in ('missing','incomplete'))
);

drop trigger if exists set_updated_at on public.daily_log_metrics;
create trigger set_updated_at before update on public.daily_log_metrics
  for each row execute function public.set_updated_at();

alter table public.daily_log_metrics enable row level security;
create policy "daily_log_metrics_select_own" on public.daily_log_metrics for select using (auth.uid() = user_id);
create policy "daily_log_metrics_insert_own" on public.daily_log_metrics for insert with check (auth.uid() = user_id);
create policy "daily_log_metrics_update_own" on public.daily_log_metrics for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "daily_log_metrics_delete_own" on public.daily_log_metrics for delete using (auth.uid() = user_id);

-- Un día cerrado es historia.
create or replace function public.daily_logs_guard()
returns trigger
language plpgsql
as $$
begin
  if old.closed_at is not null then
    raise exception 'El día % ya está cerrado: es un registro histórico (anota la corrección en el día siguiente)', old.date;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
drop trigger if exists daily_logs_guard on public.daily_logs;
create trigger daily_logs_guard before update or delete on public.daily_logs
  for each row execute function public.daily_logs_guard();

create or replace function public.daily_log_metrics_guard()
returns trigger
language plpgsql
as $$
declare v_closed timestamptz;
begin
  select closed_at into v_closed from public.daily_logs where id = coalesce(new.daily_log_id, old.daily_log_id);
  if v_closed is not null then
    raise exception 'Las métricas de un día cerrado no cambian';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
drop trigger if exists daily_log_metrics_guard on public.daily_log_metrics;
create trigger daily_log_metrics_guard before insert or update or delete on public.daily_log_metrics
  for each row execute function public.daily_log_metrics_guard();

-- Cierre transaccional: registro + métricas + closed_at, o nada.
create or replace function public.close_daily_log(p jsonb)
returns uuid
language plpgsql
set search_path = public
as $$
declare v_id uuid; v_closed timestamptz; m jsonb;
begin
  select id, closed_at into v_id, v_closed from public.daily_logs where date = (p->>'date')::date;
  if v_closed is not null then
    raise exception 'El día % ya está cerrado', p->>'date';
  end if;
  if v_id is null then
    insert into public.daily_logs (date) values ((p->>'date')::date) returning id into v_id;
  end if;
  update public.daily_logs set
    mission = p->>'mission',
    tiers = p->'tiers',
    execution_score = (p->>'execution_score')::numeric,
    minutes_worked = (p->>'minutes_worked')::integer,
    energy = (p->>'energy')::smallint,
    focus = (p->>'focus')::smallint,
    problems = coalesce((select array_agg(x) from jsonb_array_elements_text(p->'problems') x), '{}'),
    blockers = coalesce((select array_agg(x) from jsonb_array_elements_text(p->'blockers') x), '{}'),
    learnings = coalesce((select array_agg(x) from jsonb_array_elements_text(p->'learnings') x), '{}'),
    tomorrow = coalesce((select array_agg(x) from jsonb_array_elements_text(p->'tomorrow') x), '{}'),
    notes = p->>'notes'
  where id = v_id;
  delete from public.daily_log_metrics where daily_log_id = v_id;
  for m in select * from jsonb_array_elements(coalesce(p->'metrics', '[]'::jsonb)) loop
    insert into public.daily_log_metrics (daily_log_id, metric_key, target, actual, source, quality)
    values (v_id, m->>'metric_key', (m->>'target')::numeric, (m->>'actual')::numeric, m->>'source',
            case when m->>'actual' is null then 'missing' else coalesce(m->>'quality', 'self_reported') end);
  end loop;
  update public.daily_logs set closed_at = now() where id = v_id;
  return v_id;
end;
$$;
