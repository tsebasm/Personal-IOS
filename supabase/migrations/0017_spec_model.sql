-- Fase A2 (PHASE-A-DESIGN.md, spec §65 + §130): modelo estructural completo.
-- Capa 1 (estrategia) y Capa 2 (ejecución). La Capa 3 (ingesta) va en 0018.
--
-- Principios:
--  * Aditiva sobre lo existente: no se borra ninguna tabla, columna ni fila.
--  * Vocabularios existentes de tasks.status y goals.status NO se reescriben
--    aquí (el código actual los lee); se amplían y se agregan las columnas
--    nuevas. La reescritura física va con el código en la Fase B.
--    Mientras tanto, lib/domain/legacy.ts traduce al dominio.
--  * Única transformación de datos: experiments.decision 'change' → 'modify'
--    (C-4), auditada en activity_logs y reversible
--    (supabase/rollback/0017_experiment_decision_down.sql).
--  * Toda tabla nueva: RLS + 4 políticas por usuario + updated_at automático.
--  * origin_change_item_id recibe su FK en 0018 (cuando existe change_items).

-- =============================================================================
-- CAPA 1 — ESTRATEGIA
-- =============================================================================

-- GOALS (META L0, §10–11, §56) -------------------------------------------------
alter table public.goals add column if not exists currency text check (currency is null or currency ~ '^[A-Z]{3}$');
alter table public.goals add column if not exists kpi_metric_key text;
alter table public.goals add column if not exists formula text;
alter table public.goals add column if not exists locked_at timestamptz;
alter table public.goals add column if not exists success_criteria text;
alter table public.goals add column if not exists failure_criteria text;
-- §56 "BLOQUEADA (no activable)" ≠ §11 bloqueo (locked_at). Ver spec §130 C-2.
alter table public.goals add column if not exists activation_state text;
update public.goals
   set activation_state = case status when 'activo' then 'active' when 'pausado' then 'queued'
                                      when 'cumplido' then 'completed' when 'cancelado' then 'archived' else 'queued' end
 where activation_state is null;
alter table public.goals alter column activation_state set default 'queued';
alter table public.goals alter column activation_state set not null;
alter table public.goals drop constraint if exists goals_activation_state_check;
alter table public.goals add constraint goals_activation_state_check
  check (activation_state in ('blocked','queued','active','completed','archived'));
alter table public.goals add column if not exists superseded_by uuid references public.goals(id) on delete set null;

-- OBJECTIVES (L1, P-1) ----------------------------------------------------------
create table if not exists public.objectives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  title text not null,
  description text,
  metric_key text,
  unit text not null,
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  target_value numeric not null,
  current_value numeric,
  deadline date,
  formula text,
  status text not null default 'active' check (status in ('active','paused','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_objectives_user_goal on public.objectives(user_id, goal_id);

-- SYSTEMS (L2, §23) -------------------------------------------------------------
create table if not exists public.systems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  type text not null check (type in ('acquisition','sales','fulfillment','learning','health','finance','university','review','other')),
  purpose text,
  status text not null default 'designing' check (status in ('designing','active','paused','retired')),
  owner text,
  superseded_by uuid references public.systems(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_systems_user on public.systems(user_id, status);

-- OBJECTIVE ⇄ SYSTEM (P-15) ------------------------------------------------------
create table if not exists public.objective_systems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  objective_id uuid not null references public.objectives(id) on delete cascade,
  system_id uuid not null references public.systems(id) on delete cascade,
  contribution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (objective_id, system_id)
);
create index if not exists idx_objective_systems_system on public.objective_systems(system_id);

-- METRIC DEFINITIONS (P-4, P-14): métricas como datos ----------------------------
create table if not exists public.metric_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  key text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  label text not null,
  description text,
  category text not null check (category in ('input','process','output','outcome')),
  unit text not null,
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  aggregation text not null default 'sum' check (aggregation in ('sum','last','avg','max')),
  system_id uuid references public.systems(id) on delete set null,
  min_sample integer check (min_sample is null or min_sample > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

-- FUNNELS (§13–14, P-14) ------------------------------------------------------------
create table if not exists public.funnels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  system_id uuid not null references public.systems(id) on delete cascade,
  name text not null,
  channel text not null check (channel in ('cold_calling','cold_email','social_outbound','meta_ads','google_ads','referrals','other')),
  stages jsonb not null check (jsonb_typeof(stages) = 'array' and jsonb_array_length(stages) >= 2),
  superseded_by uuid references public.funnels(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_funnels_system on public.funnels(system_id);

-- HYPOTHESES (§15–19): extensión de 0011 ----------------------------------------------
alter table public.hypotheses add column if not exists goal_id uuid references public.goals(id) on delete set null;
alter table public.hypotheses add column if not exists objective_id uuid references public.objectives(id) on delete set null;
alter table public.hypotheses add column if not exists system_id uuid references public.systems(id) on delete set null;
alter table public.hypotheses add column if not exists offer text;
alter table public.hypotheses add column if not exists mechanism text;
alter table public.hypotheses add column if not exists scenarios jsonb not null default '{}'::jsonb;
alter table public.hypotheses add column if not exists expected_revenue numeric;
alter table public.hypotheses add column if not exists timeline text;
alter table public.hypotheses add column if not exists assumptions jsonb not null default '[]'::jsonb;
alter table public.hypotheses add column if not exists risks jsonb not null default '[]'::jsonb;
-- §19 categórica. NO se deriva de `confidence` (0–100, legado): convertir un
-- número en BAJA/MEDIA/ALTA sería inventar un criterio. Queda null hasta que
-- el usuario la asigne.
alter table public.hypotheses add column if not exists confidence_level text
  check (confidence_level is null or confidence_level in ('low','medium','high','validated','invalidated'));
alter table public.hypotheses add column if not exists validation_criteria text;
alter table public.hypotheses add column if not exists failure_criteria text;

-- ROADMAP PHASES (§20–22, P-5) ----------------------------------------------------------
create table if not exists public.roadmap_phases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  hypothesis_id uuid references public.hypotheses(id) on delete set null,
  roadmap_version integer not null default 1 check (roadmap_version >= 1),
  seq integer not null check (seq >= 1),
  name text not null,
  objective text,
  start_date date not null,
  expected_end date not null,
  entry_criteria text[] not null default '{}',
  exit_criteria text[] not null default '{}',
  kpi_metric_keys text[] not null default '{}',
  dependencies text[] not null default '{}',
  risks text[] not null default '{}',
  status text not null default 'planned' check (status in ('planned','active','completed','skipped')),
  superseded_by uuid references public.roadmap_phases(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expected_end >= start_date),
  unique (goal_id, roadmap_version, seq)
);

-- PROJECTS (L3, §24) ------------------------------------------------------------------------
alter table public.projects add column if not exists purpose text;
alter table public.projects add column if not exists objective_id uuid references public.objectives(id) on delete set null;
alter table public.projects add column if not exists system_id uuid references public.systems(id) on delete set null;
alter table public.projects add column if not exists start_date date;
alter table public.projects add column if not exists owner text;
alter table public.projects add column if not exists success_criteria text[] not null default '{}';
create index if not exists idx_projects_system on public.projects(system_id);

create table if not exists public.project_dependencies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  depends_on_project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (project_id <> depends_on_project_id),
  unique (project_id, depends_on_project_id)
);

-- SOPs (§75–76) -------------------------------------------------------------------------------
create table if not exists public.sops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  system_id uuid references public.systems(id) on delete set null,
  name text not null,
  purpose text,
  when_to_use text,
  inputs text[] not null default '{}',
  steps text[] not null check (cardinality(steps) >= 1),
  expected_output text,
  kpi_metric_keys text[] not null default '{}',
  common_errors text[] not null default '{}',
  source_experiment_id uuid references public.experiments(id) on delete set null,
  obsidian_path text,
  superseded_by uuid references public.sops(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- DECISIONS (§43–44) --------------------------------------------------------------------------
-- La autoridad de aprobación de los paquetes de cambios es change_sets (C-3,
-- 0018); la decisión es el registro humano del porqué y refleja ese ciclo.
-- EVALUADA es exclusivo de la decisión.
create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  number integer not null,
  date date not null default current_date,
  title text not null,
  problem text not null,
  evidence text,
  diagnosis text,
  hypothesis_id uuid references public.hypotheses(id) on delete set null,
  experiment_id uuid references public.experiments(id) on delete set null,
  change text not null,
  reason text not null,
  expected_result text,
  actual_result text,
  conclusion text,
  follow_up text,
  status text not null default 'proposed' check (status in ('proposed','approved','rejected','modified','implemented','evaluated')),
  proposed_by text not null check (proposed_by in ('user','claude','system')),
  approved_at timestamptz,
  implemented_at timestamptz,
  entity_type text,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, number),
  -- Una decisión aprobada/implementada/evaluada siempre tiene fecha de aprobación humana.
  check (status in ('proposed','rejected') or approved_at is not null),
  check (status not in ('implemented','evaluated') or implemented_at is not null)
);

-- Número correlativo por usuario (#001, #002…). Corre con RLS (invoker): solo ve
-- las decisiones del propio usuario. unique(user_id, number) protege de carreras.
create or replace function public.assign_decision_number()
returns trigger
language plpgsql
as $$
begin
  if new.number is null then
    select coalesce(max(d.number), 0) + 1 into new.number from public.decisions d where d.user_id = new.user_id;
  end if;
  return new;
end;
$$;
drop trigger if exists assign_decision_number on public.decisions;
create trigger assign_decision_number before insert on public.decisions
  for each row execute function public.assign_decision_number();

-- IDENTITY RULES (L-1, §9) --------------------------------------------------------------------
create table if not exists public.identity_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  statement text not null,
  metric_key text,
  status text not null default 'active' check (status in ('active','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- IDEAS (§59, P-6). inbox_items queda dormida, sin cambios. --------------------------------------
create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  description text,
  contribution text,
  status text not null default 'parked' check (status in ('parked','rejected','postponed','project','experiment','task','goal_candidate')),
  converted_entity_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- EXPERIMENTS (§40–42, P-12, C-4): extensión de 0015 --------------------------------------------
alter table public.experiments add column if not exists system_id uuid references public.systems(id) on delete set null;
alter table public.experiments add column if not exists problem text;
alter table public.experiments add column if not exists observation text;
alter table public.experiments add column if not exists variable text;
alter table public.experiments add column if not exists baseline_value numeric;
alter table public.experiments add column if not exists target_value numeric;
alter table public.experiments add column if not exists observation_window_days integer check (observation_window_days is null or observation_window_days > 0);
alter table public.experiments add column if not exists success_threshold numeric;
alter table public.experiments add column if not exists failure_threshold numeric;
alter table public.experiments add column if not exists interventions jsonb not null default '[]'::jsonb;
alter table public.experiments add column if not exists result jsonb;
alter table public.experiments add column if not exists conclusion text;
alter table public.experiments add column if not exists decision_id uuid references public.decisions(id) on delete set null;
alter table public.experiments add column if not exists sop_id uuid references public.sops(id) on delete set null;
alter table public.experiments drop constraint if exists experiments_interventions_check;
alter table public.experiments add constraint experiments_interventions_check check (jsonb_typeof(interventions) = 'array');
-- Un experimento diseñado todavía no empezó: started_on deja de ser obligatorio.
alter table public.experiments alter column started_on drop not null;
-- Métricas como datos (P-14): la clave ya no se limita a las 4 tasas de VANT.
alter table public.experiments drop constraint if exists experiments_metric_key_check;
alter table public.experiments add constraint experiments_metric_key_check check (metric_key ~ '^[a-z][a-z0-9_]*$');
alter table public.experiments drop constraint if exists experiments_status_check;
alter table public.experiments add constraint experiments_status_check check (status in ('designed','running','finished','evaluated'));

-- C-4: 'change' → 'modify'. Se audita cada fila en activity_logs ANTES de
-- cambiarla: así la reversión solo toca lo que esta migración tocó.
alter table public.experiments drop constraint if exists experiments_decision_check;
insert into public.activity_logs (user_id, entity_type, entity_id, action, payload)
select user_id, 'experiment', id, 'migration_0017_decision_renamed',
       jsonb_build_object('field', 'decision', 'from', 'change', 'to', 'modify', 'migration', '0017_spec_model')
  from public.experiments
 where decision = 'change';
update public.experiments set decision = 'modify' where decision = 'change';
alter table public.experiments add constraint experiments_decision_check
  check (decision is null or decision in ('keep','revert','modify','inconclusive'));
alter table public.experiments drop constraint if exists experiments_evaluated_needs_decision;
alter table public.experiments add constraint experiments_evaluated_needs_decision
  check (status <> 'evaluated' or decision is not null);

-- =============================================================================
-- CAPA 2 — EJECUCIÓN
-- =============================================================================

-- ROUTINES (P-11): regla recurrente de un sistema → instancias de tarea ------------
create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  system_id uuid not null references public.systems(id) on delete cascade,
  title text not null,
  metric_key text not null check (metric_key ~ '^[a-z][a-z0-9_]*$'),
  target_per_occurrence numeric not null check (target_per_occurrence > 0),
  unit text not null,
  cadence text not null check (cadence in ('daily','weekdays','weekly','custom')),
  days_of_week smallint[] not null default '{}' check (days_of_week <@ array[0,1,2,3,4,5,6]::smallint[]),
  tier text not null check (tier in ('p0','p1','p2')),
  execution_mode text check (execution_mode is null or execution_mode in ('deep','shallow','passive')),
  estimated_minutes_per_unit numeric check (estimated_minutes_per_unit is null or estimated_minutes_per_unit > 0),
  valid_from date not null,
  valid_to date,
  status text not null default 'active' check (status in ('active','paused','archived')),
  superseded_by uuid references public.routines(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not (cadence in ('custom','weekly') and cardinality(days_of_week) = 0)),
  check (valid_to is null or valid_to >= valid_from)
);
create index if not exists idx_routines_system on public.routines(system_id, status);

-- TASKS (L4, §25–27, P-2) --------------------------------------------------------------
alter table public.tasks add column if not exists tier text check (tier is null or tier in ('p0','p1','p2'));
alter table public.tasks add column if not exists plan_state text check (plan_state is null or plan_state in ('inbox','next','today'));
alter table public.tasks add column if not exists objective_id uuid references public.objectives(id) on delete set null;
alter table public.tasks add column if not exists system_id uuid references public.systems(id) on delete set null;
alter table public.tasks add column if not exists routine_id uuid references public.routines(id) on delete set null;
alter table public.tasks add column if not exists target_qty numeric check (target_qty is null or target_qty > 0);
alter table public.tasks add column if not exists actual_qty numeric check (actual_qty is null or actual_qty >= 0);
alter table public.tasks add column if not exists unit text;
alter table public.tasks add column if not exists metric_key text;
alter table public.tasks add column if not exists executed_on date;
alter table public.tasks add column if not exists verified_at timestamptz;
alter table public.tasks add column if not exists evidence_required boolean not null default false;
alter table public.tasks add column if not exists done_criteria text;
alter table public.tasks drop constraint if exists tasks_qty_needs_unit;
alter table public.tasks add constraint tasks_qty_needs_unit check (target_qty is null or unit is not null);
-- Estados (§26): se agregan los nuevos SIN quitar los existentes (transición, ver encabezado).
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks add constraint tasks_status_check check (status in (
  'inbox','next','today','in_progress','waiting','done','cancelled',          -- vocabulario existente
  'pending','partially_completed','completed','blocked'                        -- §26
));
-- El estado de planificación se separa desde ya (P-2), sin tocar status.
update public.tasks set plan_state = status where plan_state is null and status in ('inbox','next','today');
-- Una instancia por rutina y fecha (materialización idempotente, A4).
create unique index if not exists uq_tasks_routine_day on public.tasks(routine_id, scheduled_date) where routine_id is not null;
create index if not exists idx_tasks_system on public.tasks(system_id);

-- HABITS (§52–53): entidad distinta de las rutinas ---------------------------------------
alter table public.habits add column if not exists tier text check (tier is null or tier in ('p0','p1','p2'));
alter table public.habits add column if not exists system_id uuid references public.systems(id) on delete set null;
alter table public.habits add column if not exists source text not null default 'manual'
  check (source in ('manual','app','crm','calendar','health','screen_time','api','import','claude','obsidian'));

-- EVIDENCE (§27) -----------------------------------------------------------------------------
create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  entity_type text not null check (entity_type in ('task','metric_entry','daily_log','experiment')),
  entity_id uuid not null,
  target numeric,
  actual numeric,
  source text not null check (source in ('manual','app','crm','calendar','health','screen_time','api','import','claude','obsidian')),
  verified boolean not null default false,
  note text,
  url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_evidence_entity on public.evidence(entity_type, entity_id);

-- METRIC ENTRIES (§68–69, P-14): un faltante nunca es cero -------------------------------------
create table if not exists public.metric_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  metric_key text not null check (metric_key ~ '^[a-z][a-z0-9_]*$'),
  date date not null,
  value numeric,
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  source text not null check (source in ('manual','app','crm','calendar','health','screen_time','api','import','claude','obsidian')),
  quality text not null check (quality in ('verified','self_reported','estimated','incomplete','missing')),
  system_id uuid references public.systems(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (value is not null or quality in ('missing','incomplete'))
);
create index if not exists idx_metric_entries_user_key_date on public.metric_entries(user_id, metric_key, date);

-- DAILY LOGS (§35, P-3). Los check-ins existentes (reviews 'diaria') se conservan. ------
create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  date date not null,
  mission text,
  tiers jsonb,
  execution_score numeric check (execution_score is null or (execution_score >= 0 and execution_score <= 100)),
  minutes_worked integer check (minutes_worked is null or minutes_worked >= 0),
  energy smallint check (energy is null or energy between 1 and 5),
  focus smallint check (focus is null or focus between 1 and 5),
  problems text[] not null default '{}',
  blockers text[] not null default '{}',
  learnings text[] not null default '{}',
  tomorrow text[] not null default '{}',
  notes text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

-- FX RATES (C-1): COP operativo, meta en USD. Ninguna tasa en el código. ------------------
create table if not exists public.fx_rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  base_currency text not null check (base_currency ~ '^[A-Z]{3}$'),
  quote_currency text not null check (quote_currency ~ '^[A-Z]{3}$'),
  rate numeric not null check (rate > 0),
  rate_date date not null,
  source text not null check (length(trim(source)) > 0),
  source_reference text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (base_currency <> quote_currency),
  unique (user_id, base_currency, quote_currency, rate_date)
);

-- =============================================================================
-- PROVENANCE (P-13) en todas las entidades de las capas 1 y 2
-- =============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'goals','objectives','systems','objective_systems','metric_definitions','funnels','hypotheses',
    'roadmap_phases','projects','project_dependencies','milestones','experiments','decisions','sops',
    'identity_rules','ideas','routines','tasks','habits','evidence','metric_entries','daily_logs','fx_rates'
  ] loop
    execute format('alter table public.%I add column if not exists origin text not null default ''manual''
                      check (origin in (''manual'',''import'',''claude'',''system'',''obsidian''))', t);
    execute format('alter table public.%I add column if not exists origin_change_item_id uuid', t);
    execute format('alter table public.%I add column if not exists created_by text not null default ''user''
                      check (created_by in (''user'',''claude'',''system''))', t);
    execute format('alter table public.%I add column if not exists version integer not null default 1 check (version >= 1)', t);
    execute format('alter table public.%I add column if not exists archived_at timestamptz', t);
  end loop;
end $$;

-- milestones no tenía updated_at (0001); el dominio lo exige en toda fila.
alter table public.milestones add column if not exists updated_at timestamptz not null default now();

-- =============================================================================
-- updated_at automático + RLS para las tablas nuevas
-- =============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'objectives','systems','objective_systems','metric_definitions','funnels','roadmap_phases',
    'project_dependencies','sops','decisions','identity_rules','ideas','routines','evidence',
    'metric_entries','daily_logs','fx_rates','milestones'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

alter table public.objectives enable row level security;
create policy "objectives_select_own" on public.objectives for select using (auth.uid() = user_id);
create policy "objectives_insert_own" on public.objectives for insert with check (auth.uid() = user_id);
create policy "objectives_update_own" on public.objectives for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "objectives_delete_own" on public.objectives for delete using (auth.uid() = user_id);

alter table public.systems enable row level security;
create policy "systems_select_own" on public.systems for select using (auth.uid() = user_id);
create policy "systems_insert_own" on public.systems for insert with check (auth.uid() = user_id);
create policy "systems_update_own" on public.systems for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "systems_delete_own" on public.systems for delete using (auth.uid() = user_id);

alter table public.objective_systems enable row level security;
create policy "objective_systems_select_own" on public.objective_systems for select using (auth.uid() = user_id);
create policy "objective_systems_insert_own" on public.objective_systems for insert with check (auth.uid() = user_id);
create policy "objective_systems_update_own" on public.objective_systems for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "objective_systems_delete_own" on public.objective_systems for delete using (auth.uid() = user_id);

alter table public.metric_definitions enable row level security;
create policy "metric_definitions_select_own" on public.metric_definitions for select using (auth.uid() = user_id);
create policy "metric_definitions_insert_own" on public.metric_definitions for insert with check (auth.uid() = user_id);
create policy "metric_definitions_update_own" on public.metric_definitions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "metric_definitions_delete_own" on public.metric_definitions for delete using (auth.uid() = user_id);

alter table public.funnels enable row level security;
create policy "funnels_select_own" on public.funnels for select using (auth.uid() = user_id);
create policy "funnels_insert_own" on public.funnels for insert with check (auth.uid() = user_id);
create policy "funnels_update_own" on public.funnels for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "funnels_delete_own" on public.funnels for delete using (auth.uid() = user_id);

alter table public.roadmap_phases enable row level security;
create policy "roadmap_phases_select_own" on public.roadmap_phases for select using (auth.uid() = user_id);
create policy "roadmap_phases_insert_own" on public.roadmap_phases for insert with check (auth.uid() = user_id);
create policy "roadmap_phases_update_own" on public.roadmap_phases for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "roadmap_phases_delete_own" on public.roadmap_phases for delete using (auth.uid() = user_id);

alter table public.project_dependencies enable row level security;
create policy "project_dependencies_select_own" on public.project_dependencies for select using (auth.uid() = user_id);
create policy "project_dependencies_insert_own" on public.project_dependencies for insert with check (auth.uid() = user_id);
create policy "project_dependencies_update_own" on public.project_dependencies for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "project_dependencies_delete_own" on public.project_dependencies for delete using (auth.uid() = user_id);

alter table public.sops enable row level security;
create policy "sops_select_own" on public.sops for select using (auth.uid() = user_id);
create policy "sops_insert_own" on public.sops for insert with check (auth.uid() = user_id);
create policy "sops_update_own" on public.sops for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sops_delete_own" on public.sops for delete using (auth.uid() = user_id);

alter table public.decisions enable row level security;
create policy "decisions_select_own" on public.decisions for select using (auth.uid() = user_id);
create policy "decisions_insert_own" on public.decisions for insert with check (auth.uid() = user_id);
create policy "decisions_update_own" on public.decisions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "decisions_delete_own" on public.decisions for delete using (auth.uid() = user_id);

alter table public.identity_rules enable row level security;
create policy "identity_rules_select_own" on public.identity_rules for select using (auth.uid() = user_id);
create policy "identity_rules_insert_own" on public.identity_rules for insert with check (auth.uid() = user_id);
create policy "identity_rules_update_own" on public.identity_rules for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "identity_rules_delete_own" on public.identity_rules for delete using (auth.uid() = user_id);

alter table public.ideas enable row level security;
create policy "ideas_select_own" on public.ideas for select using (auth.uid() = user_id);
create policy "ideas_insert_own" on public.ideas for insert with check (auth.uid() = user_id);
create policy "ideas_update_own" on public.ideas for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ideas_delete_own" on public.ideas for delete using (auth.uid() = user_id);

alter table public.routines enable row level security;
create policy "routines_select_own" on public.routines for select using (auth.uid() = user_id);
create policy "routines_insert_own" on public.routines for insert with check (auth.uid() = user_id);
create policy "routines_update_own" on public.routines for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "routines_delete_own" on public.routines for delete using (auth.uid() = user_id);

alter table public.evidence enable row level security;
create policy "evidence_select_own" on public.evidence for select using (auth.uid() = user_id);
create policy "evidence_insert_own" on public.evidence for insert with check (auth.uid() = user_id);
create policy "evidence_update_own" on public.evidence for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "evidence_delete_own" on public.evidence for delete using (auth.uid() = user_id);

alter table public.metric_entries enable row level security;
create policy "metric_entries_select_own" on public.metric_entries for select using (auth.uid() = user_id);
create policy "metric_entries_insert_own" on public.metric_entries for insert with check (auth.uid() = user_id);
create policy "metric_entries_update_own" on public.metric_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "metric_entries_delete_own" on public.metric_entries for delete using (auth.uid() = user_id);

alter table public.daily_logs enable row level security;
create policy "daily_logs_select_own" on public.daily_logs for select using (auth.uid() = user_id);
create policy "daily_logs_insert_own" on public.daily_logs for insert with check (auth.uid() = user_id);
create policy "daily_logs_update_own" on public.daily_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "daily_logs_delete_own" on public.daily_logs for delete using (auth.uid() = user_id);

alter table public.fx_rates enable row level security;
create policy "fx_rates_select_own" on public.fx_rates for select using (auth.uid() = user_id);
create policy "fx_rates_insert_own" on public.fx_rates for insert with check (auth.uid() = user_id);
create policy "fx_rates_update_own" on public.fx_rates for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "fx_rates_delete_own" on public.fx_rates for delete using (auth.uid() = user_id);
