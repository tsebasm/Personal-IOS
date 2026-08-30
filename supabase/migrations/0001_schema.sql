-- Personal OS — Fase 1: esquema base.
-- Cada tabla de usuario tiene user_id uuid references auth.users(id),
-- protegida por RLS en 0002_rls.sql. `auth.users` la maneja Supabase — no
-- se crea una tabla `users` propia, solo `profiles` la extiende 1:1.

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- PROFILES --------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  timezone text not null default 'America/Bogota',
  weekly_hours_target numeric,
  theme text not null default 'system' check (theme in ('system','light','dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- VISION ------------------------------------------------------------------
create table if not exists public.vision (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  statement text,
  principles jsonb not null default '[]'::jsonb,
  core_values jsonb not null default '[]'::jsonb,
  avoid jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- AREAS -------------------------------------------------------------------
create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  slug text,
  color text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- GOALS (con jerarquía: largo_plazo -> anual -> trimestral -> mensual) -----
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  area_id uuid references public.areas(id) on delete set null,
  parent_goal_id uuid references public.goals(id) on delete set null,
  title text not null,
  description text,
  horizon text not null default 'anual' check (horizon in ('largo_plazo','anual','trimestral','mensual')),
  kind text not null default 'milestone' check (kind in ('metric','milestone','ongoing')),
  unit text,
  target_value numeric,
  current_value numeric,
  start_date date,
  deadline date,
  priority text not null default 'media' check (priority in ('baja','media','alta')),
  status text not null default 'activo' check (status in ('activo','pausado','cumplido','cancelado')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goal_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  description text not null,
  unit text,
  target_value numeric,
  current_value numeric,
  created_at timestamptz not null default now()
);

-- PROJECTS / MILESTONES / TASKS -------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  area_id uuid references public.areas(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'activo' check (status in ('planeado','activo','pausado','completado','cancelado')),
  priority text not null default 'media' check (priority in ('baja','media','alta')),
  deadline date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  deadline date,
  status text not null default 'pendiente' check (status in ('pendiente','completado')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  project_id uuid references public.projects(id) on delete set null,
  milestone_id uuid references public.milestones(id) on delete set null,
  area_id uuid references public.areas(id) on delete set null,
  title text not null,
  description text,
  priority text not null default 'media' check (priority in ('baja','media','alta')),
  energy_required text check (energy_required in ('baja','media','alta')),
  estimated_minutes integer,
  deadline date,
  scheduled_date date,
  recurrence text,
  status text not null default 'inbox' check (status in ('inbox','next','today','in_progress','waiting','done','cancelled')),
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_dependencies (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  depends_on_task_id uuid not null references public.tasks(id) on delete cascade,
  primary key (task_id, depends_on_task_id)
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.task_tags (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (task_id, tag_id)
);

-- HABITS --------------------------------------------------------------------
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  area_id uuid references public.areas(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null,
  title text not null,
  frequency text not null default 'diaria' check (frequency in ('diaria','semanal','custom')),
  target_per_period integer not null default 1,
  days_of_week integer[],
  time_of_day time,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  date date not null,
  done boolean not null default true,
  value numeric,
  note text,
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);

-- INBOX -----------------------------------------------------------------
create table if not exists public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  content text not null,
  status text not null default 'pending' check (status in ('pending','processed','archived')),
  converted_to text check (converted_to in ('task','note','project','goal','reminder')),
  converted_id uuid,
  created_at timestamptz not null default now()
);

-- KNOWLEDGE / SECOND BRAIN ------------------------------------------------
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text,
  body text,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  kind text not null default 'concepto' check (kind in ('concepto','libro','curso','recurso','framework','decision')),
  title text not null,
  description text,
  url text,
  status text,
  created_at timestamptz not null default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  level text,
  notes text,
  created_at timestamptz not null default now()
);

-- Grafo polimórfico: conecta cualquier nota/knowledge_item/skill con
-- cualquier proyecto/meta/tarea/decisión. Es el "second brain" real.
create table if not exists public.knowledge_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  from_type text not null,
  from_id uuid not null,
  to_type text not null,
  to_id uuid not null,
  relation_label text,
  created_at timestamptz not null default now()
);

-- FINANZAS PERSONALES -------------------------------------------------------
create table if not exists public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  type text not null default 'efectivo' check (type in ('efectivo','banco','inversion','deuda')),
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  account_id uuid references public.financial_accounts(id) on delete set null,
  date date not null default current_date,
  type text not null check (type in ('ingreso','gasto','ahorro','inversion')),
  category text,
  amount numeric not null,
  is_fixed boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  principal numeric,
  balance numeric,
  interest_rate numeric,
  due_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  target_amount numeric not null,
  current_amount numeric not null default 0,
  deadline date,
  created_at timestamptz not null default now()
);

-- CALENDARIO (manual hoy; arquitectura lista para Google Calendar) ----------
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  source text not null default 'manual' check (source in ('manual','google_calendar')),
  external_id text,
  task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now()
);

-- REVISIONES ---------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  type text not null check (type in ('diaria','semanal','mensual','trimestral')),
  period_start date not null,
  period_end date not null,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- NOTIFICACIONES + LOG DE ACTIVIDAD ------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  type text not null,
  title text not null,
  body text,
  is_read boolean not null default false,
  entity_type text,
  entity_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- Índices de acceso frecuente (por usuario + por relación) ------------------
create index if not exists idx_goals_user on public.goals(user_id);
create index if not exists idx_goals_area on public.goals(area_id);
create index if not exists idx_projects_user on public.projects(user_id);
create index if not exists idx_tasks_user on public.tasks(user_id);
create index if not exists idx_tasks_project on public.tasks(project_id);
create index if not exists idx_tasks_status on public.tasks(user_id, status);
create index if not exists idx_tasks_scheduled on public.tasks(user_id, scheduled_date);
create index if not exists idx_habit_logs_habit_date on public.habit_logs(habit_id, date);
create index if not exists idx_transactions_user_date on public.transactions(user_id, date);
create index if not exists idx_knowledge_links_from on public.knowledge_links(from_type, from_id);
create index if not exists idx_knowledge_links_to on public.knowledge_links(to_type, to_id);
create index if not exists idx_activity_logs_user_created on public.activity_logs(user_id, created_at desc);
