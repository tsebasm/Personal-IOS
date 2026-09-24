-- Fase 6 (ARQUITECTURA_PERSONAL_OS.md §3.3): VANT Growth Engine.
--
-- EXPERIMENTS: hipótesis → experimento → dato → aprendizaje. Los resultados
-- se calculan de las sesiones atribuidas (prospecting_sessions.experiment_id
-- + message_variant), no se escriben a mano.
create table if not exists public.experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  hypothesis_id uuid references public.hypotheses(id) on delete set null,
  name text not null,
  metric_key text not null default 'reply_rate' check (metric_key in ('reply_rate','booking_rate','show_rate','close_rate')),
  variants text[] not null default array['A','B'],
  sample_target integer not null default 100 check (sample_target > 0),
  started_on date not null default current_date,
  ended_on date,
  status text not null default 'running' check (status in ('running','finished')),
  decision text check (decision is null or decision in ('keep','change','inconclusive')),
  learning text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_experiments_user on public.experiments(user_id, status);

drop trigger if exists set_updated_at on public.experiments;
create trigger set_updated_at before update on public.experiments
  for each row execute function public.set_updated_at();

alter table public.experiments enable row level security;
create policy "experiments_select_own" on public.experiments for select using (auth.uid() = user_id);
create policy "experiments_insert_own" on public.experiments for insert with check (auth.uid() = user_id);
create policy "experiments_update_own" on public.experiments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "experiments_delete_own" on public.experiments for delete using (auth.uid() = user_id);

alter table public.prospecting_sessions
  add column if not exists experiment_id uuid references public.experiments(id) on delete set null;
create index if not exists idx_prospecting_sessions_experiment on public.prospecting_sessions(experiment_id);

-- LEADS: pipeline por oportunidad. Sin esto no se puede medir follow-up
-- pendiente ni el pipeline abierto real (antes era una foto manual).
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  company text,
  channel text,
  hypothesis_id uuid references public.hypotheses(id) on delete set null,
  stage text not null default 'contacted' check (stage in ('contacted','replied','booked','showed','proposal','won','lost')),
  stage_changed_at timestamptz not null default now(),
  next_followup_on date,
  followups_done integer not null default 0 check (followups_done >= 0),
  est_value numeric check (est_value is null or est_value >= 0),
  lost_reason text,
  notes text,
  vant_client_id uuid references public.vant_clients(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_leads_user_stage on public.leads(user_id, stage);
create index if not exists idx_leads_user_followup on public.leads(user_id, next_followup_on);

drop trigger if exists set_updated_at on public.leads;
create trigger set_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

alter table public.leads enable row level security;
create policy "leads_select_own" on public.leads for select using (auth.uid() = user_id);
create policy "leads_insert_own" on public.leads for insert with check (auth.uid() = user_id);
create policy "leads_update_own" on public.leads for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "leads_delete_own" on public.leads for delete using (auth.uid() = user_id);
