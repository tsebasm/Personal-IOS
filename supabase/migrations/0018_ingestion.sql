-- Fase A2 (PHASE-A-DESIGN.md P-10, spec §130 C-3): Capa 3 — ingesta.
--
-- source_documents → plan_imports → change_sets → change_items → aprobación
-- humana → entidades reales. Esta capa solo escribe en sus propias tablas.
-- Las entidades reales las crea applyChangeSet (A3) con la sesión del usuario.
--
-- C-3: change_sets es la ÚNICA autoridad de aprobación/aplicación. La base de
-- datos garantiza aquí lo que no depende de la lógica de aplicación:
--  * aprobar/aplicar exige approved_by = 'user' (Claude nunca se aprueba a sí mismo);
--  * 'applied' exige applied_at; un set aplicado ya no cambia de estado;
--  * el contrato completo de transiciones está en PHASE-A-DESIGN.md §9 y se
--    implementa (función transaccional + pruebas) en A3.

-- SOURCE DOCUMENTS: la entrada humana tal cual, inmutable -----------------------
create table if not exists public.source_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  kind text not null check (kind in ('chat_text','upload','obsidian_note','url')),
  title text not null,
  content text not null check (length(content) > 0),
  storage_path text,
  obsidian_path text,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  created_by text not null check (created_by in ('user','claude','system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, content_hash)
);

-- Inmutabilidad del contenido: corregir el título está permitido; cambiar el
-- texto no (sería otra fuente, con otro hash).
create or replace function public.source_documents_immutable()
returns trigger
language plpgsql
as $$
begin
  if new.content is distinct from old.content or new.content_hash is distinct from old.content_hash or new.kind is distinct from old.kind then
    raise exception 'source_documents es inmutable: crea un documento nuevo en lugar de editar su contenido';
  end if;
  return new;
end;
$$;
drop trigger if exists source_documents_immutable on public.source_documents;
create trigger source_documents_immutable before update on public.source_documents
  for each row execute function public.source_documents_immutable();

-- PLAN IMPORTS: una ejecución de interpretación ----------------------------------
create table if not exists public.plan_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  source_document_id uuid not null references public.source_documents(id) on delete cascade,
  interpreter text not null check (interpreter in ('claude','template','manual')),
  interpreter_version text not null,
  status text not null default 'pending' check (status in ('pending','interpreted','needs_input','proposed','applied','rejected','failed')),
  detected jsonb not null default '{}'::jsonb,
  inconsistencies jsonb not null default '[]'::jsonb check (jsonb_typeof(inconsistencies) = 'array'),
  questions jsonb not null default '[]'::jsonb check (jsonb_typeof(questions) = 'array'),
  context_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_plan_imports_source on public.plan_imports(source_document_id);

-- CHANGE SETS: paquete de cambios aprobable (autoridad única, C-3) ----------------
create table if not exists public.change_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  plan_import_id uuid references public.plan_imports(id) on delete set null,
  title text not null,
  rationale text,
  proposed_by text not null check (proposed_by in ('user','claude','system')),
  status text not null default 'draft' check (status in ('draft','proposed','approved','partially_approved','rejected','applied','failed')),
  approved_by text check (approved_by is null or approved_by = 'user'),
  approved_at timestamptz,
  decision_id uuid references public.decisions(id) on delete set null,
  applied_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Aprobación humana registrada en todo set aprobado o aplicado.
  check (status not in ('approved','partially_approved','applied') or (approved_by = 'user' and approved_at is not null)),
  check (status <> 'applied' or applied_at is not null),
  check (status <> 'failed' or failure_reason is not null)
);
create index if not exists idx_change_sets_user_status on public.change_sets(user_id, status);

-- Un set aplicado o rechazado es historia: su estado ya no cambia.
create or replace function public.change_sets_terminal()
returns trigger
language plpgsql
as $$
begin
  if old.status in ('applied','rejected') and new.status is distinct from old.status then
    raise exception 'change_set % ya está % y no puede pasar a %', old.id, old.status, new.status;
  end if;
  return new;
end;
$$;
drop trigger if exists change_sets_terminal on public.change_sets;
create trigger change_sets_terminal before update on public.change_sets
  for each row execute function public.change_sets_terminal();

-- CHANGE ITEMS: cada objeto propuesto ----------------------------------------------
create table if not exists public.change_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  change_set_id uuid not null references public.change_sets(id) on delete cascade,
  seq integer not null check (seq >= 1),
  op text not null check (op in ('create','update','archive')),
  entity_type text not null check (entity_type ~ '^[a-z][a-z0-9_]*$'),
  entity_id uuid,
  temp_ref text check (temp_ref is null or temp_ref ~ '^\$[a-z][a-z0-9_]*$'),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  before jsonb,
  depends_on text[] not null default '{}',
  status text not null default 'proposed' check (status in ('proposed','approved','rejected','modified','applied')),
  sensitivity text not null check (sensitivity in ('normal','strategic','locked')),
  confidence text check (confidence is null or confidence in ('low','medium','high','validated','invalidated')),
  assumption_type text check (assumption_type is null or assumption_type in ('known','estimated','assumed','unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (change_set_id, seq),
  check ((op = 'create') = (entity_id is null)),
  check (op = 'create' or temp_ref is null)
);
create unique index if not exists uq_change_items_temp_ref on public.change_items(change_set_id, temp_ref) where temp_ref is not null;

-- decisions.change_set_id: la decisión humana enlazada al paquete (C-3).
alter table public.decisions add column if not exists change_set_id uuid references public.change_sets(id) on delete set null;

-- Trazabilidad (P-13): entidad → change_item → change_set → plan_import → source_document.
do $$
declare t text;
begin
  foreach t in array array[
    'goals','objectives','systems','objective_systems','metric_definitions','funnels','hypotheses',
    'roadmap_phases','projects','project_dependencies','milestones','experiments','decisions','sops',
    'identity_rules','ideas','routines','tasks','habits','evidence','metric_entries','daily_logs','fx_rates'
  ] loop
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_origin_change_item_fk');
    execute format('alter table public.%I add constraint %I foreign key (origin_change_item_id)
                      references public.change_items(id) on delete set null', t, t || '_origin_change_item_fk');
  end loop;
end $$;

-- updated_at + RLS ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['source_documents','plan_imports','change_sets','change_items'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

alter table public.source_documents enable row level security;
create policy "source_documents_select_own" on public.source_documents for select using (auth.uid() = user_id);
create policy "source_documents_insert_own" on public.source_documents for insert with check (auth.uid() = user_id);
create policy "source_documents_update_own" on public.source_documents for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "source_documents_delete_own" on public.source_documents for delete using (auth.uid() = user_id);

alter table public.plan_imports enable row level security;
create policy "plan_imports_select_own" on public.plan_imports for select using (auth.uid() = user_id);
create policy "plan_imports_insert_own" on public.plan_imports for insert with check (auth.uid() = user_id);
create policy "plan_imports_update_own" on public.plan_imports for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "plan_imports_delete_own" on public.plan_imports for delete using (auth.uid() = user_id);

alter table public.change_sets enable row level security;
create policy "change_sets_select_own" on public.change_sets for select using (auth.uid() = user_id);
create policy "change_sets_insert_own" on public.change_sets for insert with check (auth.uid() = user_id);
create policy "change_sets_update_own" on public.change_sets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "change_sets_delete_own" on public.change_sets for delete using (auth.uid() = user_id);

alter table public.change_items enable row level security;
create policy "change_items_select_own" on public.change_items for select using (auth.uid() = user_id);
create policy "change_items_insert_own" on public.change_items for insert with check (auth.uid() = user_id);
create policy "change_items_update_own" on public.change_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "change_items_delete_own" on public.change_items for delete using (auth.uid() = user_id);
