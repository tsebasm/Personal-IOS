-- Fase 2: modo normal/configuración + módulo Agencia (VANT).

-- MODO DEL SISTEMA -----------------------------------------------------
-- 'normal' protege elementos estructurales de edición/eliminación accidental;
-- 'config' los desbloquea. Vive en profiles junto a theme (mismo patrón).
-- Se llama `system_mode` (no `mode`) porque `mode` colisiona con la función
-- agregada `mode() WITHIN GROUP` de Postgres: PostgREST no logra resolver un
-- `select=mode` contra esa columna y devuelve 42809 en vez de los datos.
alter table public.profiles add column if not exists system_mode text not null default 'normal' check (system_mode in ('normal','config'));

-- AGENCIA / VANT ---------------------------------------------------------
-- Config estructural: qué meta representa la facturación de VANT. Una fila
-- por usuario; el dashboard la consulta en vez de duplicar target/current.
create table if not exists public.agencia_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade default auth.uid(),
  vant_goal_id uuid references public.goals(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Campañas de adquisición pagada.
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  start_date date not null default current_date,
  end_date date,
  status text not null default 'activa' check (status in ('activa','pausada','finalizada')),
  spend numeric not null default 0 check (spend >= 0),
  leads integer not null default 0 check (leads >= 0),
  qualified_leads integer not null default 0 check (qualified_leads >= 0),
  forms_completed integer not null default 0 check (forms_completed >= 0),
  calls_scheduled integer not null default 0 check (calls_scheduled >= 0),
  calls_attended integer not null default 0 check (calls_attended >= 0),
  calls_total_accumulated integer not null default 0 check (calls_total_accumulated >= 0),
  calls_goal integer check (calls_goal is null or calls_goal >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Prospección en frío (outbound).
create table if not exists public.prospecting_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  date date not null default current_date,
  channel text not null,
  contacts_count integer not null default 0 check (contacts_count >= 0),
  replies_count integer not null default 0 check (replies_count >= 0),
  appointments_count integer not null default 0 check (appointments_count >= 0),
  clients_closed integer not null default 0 check (clients_closed >= 0),
  offer text,
  notes text,
  created_at timestamptz not null default now()
);

-- Clientes de VANT + modelo de cobro (distinto por cliente).
create table if not exists public.vant_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  start_date date not null default current_date,
  status text not null default 'activo' check (status in ('activo','pausado','cancelado')),
  setup_fee numeric not null default 0 check (setup_fee >= 0),
  commission_type text not null default 'porcentaje' check (commission_type in ('porcentaje','fijo')),
  commission_value numeric not null default 0 check (commission_value >= 0),
  monthly_fee numeric not null default 0 check (monthly_fee >= 0),
  additional_commission numeric not null default 0 check (additional_commission >= 0),
  ad_spend numeric not null default 500000 check (ad_spend >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_campaigns_user on public.campaigns(user_id);
create index if not exists idx_prospecting_sessions_user_date on public.prospecting_sessions(user_id, date);
create index if not exists idx_vant_clients_user on public.vant_clients(user_id);

drop trigger if exists set_updated_at on public.agencia_settings;
create trigger set_updated_at before update on public.agencia_settings
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.campaigns;
create trigger set_updated_at before update on public.campaigns
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.vant_clients;
create trigger set_updated_at before update on public.vant_clients
  for each row execute function public.set_updated_at();
