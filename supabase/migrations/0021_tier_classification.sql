-- Fase B2 (spec §28, §130 B-1): clasificación P0/P1/P2 sugerida por datos,
-- con override del usuario trazable y reversible.
--
-- P0 = no ejecutarlo compromete directamente el resultado actual.
-- P1 = sostiene o mejora el resultado, no es el cuello de botella inmediato.
-- P2 = útil, no crítico para el resultado actual.
--
-- Fuentes de la sugerencia (lib/engine/tiers.ts, en orden):
--   routine → priority_rules (datos editables) → estructura (aporta a la meta
--   actual → P1) → default (sin vínculo → P2). P0 solo sale de datos
--   explícitos (rutina o regla), nunca de una heurística sobre el título.

-- PRIORITY RULES: configuración como datos (no lógica de VANT) -------------------
create table if not exists public.priority_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  system_id uuid references public.systems(id) on delete cascade,
  lever text check (lever is null or lever ~ '^[a-z][a-z0-9_]*$'),
  tier text not null check (tier in ('p0','p1','p2')),
  note text,
  origin text not null default 'manual' check (origin in ('manual','import','claude','system','obsidian')),
  origin_change_item_id uuid references public.change_items(id) on delete set null,
  created_by text not null default 'user' check (created_by in ('user','claude','system')),
  version integer not null default 1 check (version >= 1),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (system_id is not null or lever is not null)
);
-- Una regla vigente por (sistema, palanca). coalesce: NULL = "cualquiera".
create unique index if not exists uq_priority_rules_scope on public.priority_rules
  (user_id, coalesce(system_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(lever, '*'))
  where archived_at is null;

drop trigger if exists set_updated_at on public.priority_rules;
create trigger set_updated_at before update on public.priority_rules
  for each row execute function public.set_updated_at();

alter table public.priority_rules enable row level security;
create policy "priority_rules_select_own" on public.priority_rules for select using (auth.uid() = user_id);
create policy "priority_rules_insert_own" on public.priority_rules for insert with check (auth.uid() = user_id);
create policy "priority_rules_update_own" on public.priority_rules for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "priority_rules_delete_own" on public.priority_rules for delete using (auth.uid() = user_id);

-- Registro del motor de change sets: las reglas son configuración estratégica.
create or replace function public.cs_entity_table(p_type text) returns regclass
language sql immutable as $$
  select case p_type
    when 'goal' then 'public.goals' when 'objective' then 'public.objectives' when 'system' then 'public.systems'
    when 'objective_system' then 'public.objective_systems' when 'metric_definition' then 'public.metric_definitions'
    when 'funnel' then 'public.funnels' when 'hypothesis' then 'public.hypotheses' when 'roadmap_phase' then 'public.roadmap_phases'
    when 'project' then 'public.projects' when 'project_dependency' then 'public.project_dependencies'
    when 'milestone' then 'public.milestones' when 'experiment' then 'public.experiments' when 'decision' then 'public.decisions'
    when 'sop' then 'public.sops' when 'identity_rule' then 'public.identity_rules' when 'idea' then 'public.ideas'
    when 'routine' then 'public.routines' when 'task' then 'public.tasks' when 'habit' then 'public.habits'
    when 'evidence' then 'public.evidence' when 'metric_entry' then 'public.metric_entries' when 'daily_log' then 'public.daily_logs'
    when 'fx_rate' then 'public.fx_rates' when 'revenue_receipt' then 'public.revenue_receipts'
    when 'priority_rule' then 'public.priority_rules'
  end::regclass
$$;

create or replace function public.cs_required_sensitivity(p_type text, p_op text) returns int
language sql immutable as $$
  select case
    when p_type in ('goal','identity_rule','decision') and p_op <> 'create' then 2
    when p_type in ('evidence','metric_entry','daily_log','fx_rate','revenue_receipt') and p_op <> 'create' then 2
    when p_type in ('goal','objective','system','funnel','hypothesis','roadmap_phase','experiment','decision','sop','identity_rule','priority_rule') then 1
    when p_type in ('objective_system','project') and p_op = 'archive' then 1
    when p_type in ('metric_definition','routine') and p_op <> 'create' then 1
    else 0
  end
$$;

-- TASKS: sugerencia conservada + override trazable ---------------------------------
alter table public.tasks add column if not exists tier_suggested text check (tier_suggested is null or tier_suggested in ('p0','p1','p2'));
alter table public.tasks add column if not exists tier_suggested_source text
  check (tier_suggested_source is null or tier_suggested_source in ('routine','rule','structure','default','plan'));
alter table public.tasks add column if not exists tier_suggested_reason text;
alter table public.tasks add column if not exists tier_source text
  check (tier_source is null or tier_source in ('routine','rule','structure','default','plan','user'));
alter table public.tasks add column if not exists tier_overridden_at timestamptz;
alter table public.tasks add column if not exists tier_overridden_by text check (tier_overridden_by is null or tier_overridden_by = 'user');
alter table public.tasks add column if not exists tier_override_reason text;
alter table public.tasks drop constraint if exists tasks_tier_override_consistent;
alter table public.tasks add constraint tasks_tier_override_consistent
  check ((tier_source = 'user') = (tier_overridden_at is not null) and (tier_overridden_at is null or tier_overridden_by = 'user'));

-- Las instancias de rutinas ya traen su nivel: quedan como sugerencia 'routine'.
update public.tasks set tier_suggested = tier, tier_suggested_source = 'routine', tier_source = 'routine',
       tier_suggested_reason = 'Nivel de la rutina'
 where routine_id is not null and tier is not null and tier_suggested is null;

-- Aplica sugerencias calculadas por el motor. Nunca pisa un override del usuario:
-- en ese caso solo actualiza la sugerencia guardada (la original se conserva).
create or replace function public.apply_tier_suggestions(p_items jsonb)
returns integer
language plpgsql
set search_path = public
as $$
declare it jsonb; v_n integer := 0; v_rows integer;
begin
  for it in select * from jsonb_array_elements(p_items) loop
    update public.tasks t
       set tier_suggested = it->>'tier',
           tier_suggested_source = it->>'source',
           tier_suggested_reason = it->>'reason',
           tier = case when t.tier_overridden_at is null then it->>'tier' else t.tier end,
           tier_source = case when t.tier_overridden_at is null then it->>'source' else 'user' end
     where t.id = (it->>'id')::uuid
       and (t.tier_suggested, t.tier_suggested_source, t.tier_suggested_reason) is distinct from (it->>'tier', it->>'source', it->>'reason');
    get diagnostics v_rows = row_count;
    v_n := v_n + v_rows;
  end loop;
  return v_n;
end;
$$;

-- Override del usuario: conserva la sugerencia, registra quién/cuándo/por qué.
create or replace function public.set_tier_override(p_task uuid, p_tier text, p_reason text default null)
returns void
language plpgsql
set search_path = public
as $$
declare t public.tasks%rowtype;
begin
  if p_tier not in ('p0','p1','p2') then raise exception 'set_tier_override: nivel inválido %', p_tier; end if;
  select * into t from public.tasks where id = p_task for update;
  if not found then raise exception 'set_tier_override: tarea inexistente o ajena'; end if;
  update public.tasks
     set tier = p_tier, tier_source = 'user', tier_overridden_at = now(), tier_overridden_by = 'user',
         tier_override_reason = nullif(trim(coalesce(p_reason, '')), '')
   where id = p_task;
  insert into public.activity_logs (user_id, entity_type, entity_id, action, payload)
  values (t.user_id, 'task', p_task, 'tier_override_set',
          jsonb_build_object('from', t.tier, 'to', p_tier, 'suggested', t.tier_suggested,
                             'suggested_source', t.tier_suggested_source, 'reason', nullif(trim(coalesce(p_reason, '')), '')));
end;
$$;

-- Revertir el override: vuelve a la sugerencia automática (registrado).
create or replace function public.clear_tier_override(p_task uuid)
returns void
language plpgsql
set search_path = public
as $$
declare t public.tasks%rowtype;
begin
  select * into t from public.tasks where id = p_task for update;
  if not found then raise exception 'clear_tier_override: tarea inexistente o ajena'; end if;
  if t.tier_overridden_at is null then return; end if;
  update public.tasks
     set tier = t.tier_suggested, tier_source = t.tier_suggested_source,
         tier_overridden_at = null, tier_overridden_by = null, tier_override_reason = null
   where id = p_task;
  insert into public.activity_logs (user_id, entity_type, entity_id, action, payload)
  values (t.user_id, 'task', p_task, 'tier_override_cleared',
          jsonb_build_object('from', t.tier, 'to', t.tier_suggested, 'previous_reason', t.tier_override_reason));
end;
$$;
