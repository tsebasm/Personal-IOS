-- Fase 1 (ARQUITECTURA_PERSONAL_OS.md): base de datos para el Personal
-- Executive OS. Solo extiende tablas existentes + crea `hypotheses`, que se
-- necesita desde el primer día de prospección para que cada sesión quede
-- atribuida a un nicho/oferta/mensaje (si no, esos datos no se recuperan).

-- VANT CLIENTS: facturación correcta de pausados/cancelados ----------------
-- La facturación recurrente se detiene en paused_at/cancelled_at; sin estas
-- fechas un cliente cancelado seguía sumando meses indefinidamente.
alter table public.vant_clients add column if not exists paused_at date;
alter table public.vant_clients add column if not exists cancelled_at date;
-- Backfill de filas existentes: la mejor aproximación disponible de cuándo
-- cambió el estado es el último updated_at. Imperfecta, pero mucho más
-- cercana que "sigue facturando hasta hoy".
update public.vant_clients set paused_at = updated_at::date where status = 'pausado' and paused_at is null;
update public.vant_clients set cancelled_at = updated_at::date where status = 'cancelado' and cancelled_at is null;
-- 500.000 COP era un supuesto de negocio metido en el esquema, no un dato.
alter table public.vant_clients alter column ad_spend set default 0;

-- GOALS: Punto A + jerarquía indexada -------------------------------------
-- baseline_value = valor al fijar la meta (Punto A). Sin él, "progreso" no
-- distingue lo logrado desde que existe la meta de lo que ya había antes.
alter table public.goals add column if not exists baseline_value numeric;
create index if not exists idx_goals_parent on public.goals(parent_goal_id);

-- PROFILES: meta principal intercambiable sin tocar código ------------------
alter table public.profiles
  add column if not exists north_star_goal_id uuid references public.goals(id) on delete set null;

-- TASKS: Goal -> Lever -> Action ------------------------------------------
alter table public.tasks add column if not exists goal_id uuid references public.goals(id) on delete set null;
alter table public.tasks add column if not exists lever text;
alter table public.tasks add column if not exists impact_score smallint check (impact_score is null or impact_score between 1 and 5);
alter table public.tasks add column if not exists effort smallint check (effort is null or effort between 1 and 5);
alter table public.tasks add column if not exists execution_mode text check (execution_mode is null or execution_mode in ('deep','shallow','passive'));
alter table public.tasks add column if not exists device_required text check (device_required is null or device_required in ('any','desktop','phone'));
create index if not exists idx_tasks_goal on public.tasks(goal_id);

-- HYPOTHESES: nicho / mercado / oferta / mensaje / canal ---------------------
-- Una hipótesis nunca se sobrescribe para "cambiarla": se rechaza y se crea
-- otra con superseded_by, así el histórico sobrevive (regla 19).
create table if not exists public.hypotheses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  type text not null default 'niche' check (type in ('niche','market','offer','message','channel','volume','other')),
  statement text not null,
  market text,
  icp text,
  problem text,
  channel text,
  urgency smallint check (urgency is null or urgency between 1 and 5),
  ability_to_pay smallint check (ability_to_pay is null or ability_to_pay between 1 and 5),
  competition smallint check (competition is null or competition between 1 and 5),
  offer_potential smallint check (offer_potential is null or offer_potential between 1 and 5),
  confidence smallint check (confidence is null or confidence between 0 and 100),
  evidence text,
  source text,
  status text not null default 'untested' check (status in ('untested','testing','validated','rejected')),
  superseded_by uuid references public.hypotheses(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_hypotheses_user_status on public.hypotheses(user_id, status);

drop trigger if exists set_updated_at on public.hypotheses;
create trigger set_updated_at before update on public.hypotheses
  for each row execute function public.set_updated_at();

alter table public.hypotheses enable row level security;
create policy "hypotheses_select_own" on public.hypotheses for select using (auth.uid() = user_id);
create policy "hypotheses_insert_own" on public.hypotheses for insert with check (auth.uid() = user_id);
create policy "hypotheses_update_own" on public.hypotheses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "hypotheses_delete_own" on public.hypotheses for delete using (auth.uid() = user_id);

-- PROSPECTING SESSIONS: embudo completo + atribución -------------------------
-- contacto -> respuesta -> cita -> asistencia -> propuesta -> cierre.
-- Sin shows_count no se puede separar "no agendan" de "no asisten".
alter table public.prospecting_sessions add column if not exists shows_count integer not null default 0 check (shows_count >= 0);
alter table public.prospecting_sessions add column if not exists proposals_count integer not null default 0 check (proposals_count >= 0);
alter table public.prospecting_sessions add column if not exists followups_count integer not null default 0 check (followups_count >= 0);
alter table public.prospecting_sessions add column if not exists minutes_spent integer check (minutes_spent is null or minutes_spent >= 0);
alter table public.prospecting_sessions add column if not exists hypothesis_id uuid references public.hypotheses(id) on delete set null;
alter table public.prospecting_sessions add column if not exists message_variant text;
create index if not exists idx_prospecting_sessions_hypothesis on public.prospecting_sessions(hypothesis_id);

-- GOAL_METRICS: esquema muerto desde 0001 (ningún lector/escritor). Las
-- sub-métricas de una meta son sub-metas (goals.parent_goal_id, kind='metric').
drop table if exists public.goal_metrics;
