-- Fase A3 (PHASE-A-DESIGN.md §9, spec §130 C-1/C-3): motor de change sets,
-- ingreso reconocido y bloqueo de la meta.
--
--  1. revenue_receipts: única fuente del acumulado de la meta (dinero recibido).
--  2. change_sets.kind: 'standard' | 'goal_change' (flujo propio de §11).
--  3. cs_propose / cs_review / cs_apply: ÚNICA vía para mover estados de
--     change_sets y de las decisiones vinculadas (triggers bloquean lo demás).
--     security invoker: corren con la sesión del usuario y RLS activo.
--  4. Ownership: cs_apply verifica que toda entidad tocada y toda referencia
--     (FK del catálogo + columnas polimórficas listadas) pertenezca a auth.uid().
--  5. Meta bloqueada: sus campos definitorios solo cambian vía goal_change.
--
-- Límite honesto: la base no distingue "usuario" de "Claude" (ambos usan la
-- sesión del usuario). Que Claude no apruebe ni aplique se garantiza en la capa
-- de servidor (lib/intelligence/permissions.ts); aquí se garantiza que nadie se
-- salte el ciclo ni toque datos ajenos.

-- =============================================================================
-- 1. REVENUE RECEIPTS — dinero efectivamente recibido (C-1, regla definitiva)
-- =============================================================================
create table if not exists public.revenue_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  vant_client_id uuid references public.vant_clients(id) on delete set null,
  counterparty text,
  received_at timestamptz not null,
  amount numeric not null check (amount > 0),
  currency text not null default 'COP' check (currency ~ '^[A-Z]{3}$'),
  concept text not null check (concept in ('setup','monthly_fee','commission','additional_commission','other')),
  status text not null default 'received' check (status in ('received','reversed')),
  reversed_at timestamptz,
  reversal_reason text,
  reference text,
  idempotency_key text,
  note text,
  origin text not null default 'manual' check (origin in ('manual','import','claude','system','obsidian')),
  origin_change_item_id uuid references public.change_items(id) on delete set null,
  created_by text not null default 'user' check (created_by in ('user','claude','system')),
  version integer not null default 1 check (version >= 1),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (vant_client_id is not null or counterparty is not null),
  check ((status = 'reversed') = (reversed_at is not null)),
  check (status <> 'reversed' or length(trim(coalesce(reversal_reason, ''))) > 0)
);
create unique index if not exists uq_revenue_receipts_idempotency
  on public.revenue_receipts(user_id, idempotency_key) where idempotency_key is not null;
create index if not exists idx_revenue_receipts_user_received on public.revenue_receipts(user_id, received_at);

-- Un recibo es historia: monto, moneda, fecha y concepto no cambian; solo puede
-- pasar de received a reversed (con motivo), nunca volver ni borrarse en silencio.
create or replace function public.revenue_receipts_guard()
returns trigger
language plpgsql
as $$
begin
  if new.amount is distinct from old.amount or new.currency is distinct from old.currency
     or new.received_at is distinct from old.received_at or new.concept is distinct from old.concept then
    raise exception 'revenue_receipts: monto, moneda, fecha y concepto son inmutables (registra una reversión y un recibo nuevo)';
  end if;
  if old.status = 'reversed' and new.status <> 'reversed' then
    raise exception 'revenue_receipts: un recibo revertido no vuelve a contar';
  end if;
  return new;
end;
$$;
drop trigger if exists revenue_receipts_guard on public.revenue_receipts;
create trigger revenue_receipts_guard before update on public.revenue_receipts
  for each row execute function public.revenue_receipts_guard();
drop trigger if exists set_updated_at on public.revenue_receipts;
create trigger set_updated_at before update on public.revenue_receipts
  for each row execute function public.set_updated_at();

alter table public.revenue_receipts enable row level security;
create policy "revenue_receipts_select_own" on public.revenue_receipts for select using (auth.uid() = user_id);
create policy "revenue_receipts_insert_own" on public.revenue_receipts for insert with check (auth.uid() = user_id);
create policy "revenue_receipts_update_own" on public.revenue_receipts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "revenue_receipts_delete_own" on public.revenue_receipts for delete using (auth.uid() = user_id);

-- =============================================================================
-- 2. CHANGE SETS: tipo + inmutabilidad del contenido aprobado
-- =============================================================================
alter table public.change_sets add column if not exists kind text not null default 'standard'
  check (kind in ('standard','goal_change'));
-- §11 / §99: un cambio de meta solo lo inicia el usuario.
alter table public.change_sets drop constraint if exists change_sets_goal_change_by_user;
alter table public.change_sets add constraint change_sets_goal_change_by_user check (kind <> 'goal_change' or proposed_by = 'user');

-- Bandera de transacción que solo levantan las funciones cs_*: cualquier cambio de
-- estado fuera de ellas (update directo vía API) se rechaza.
create or replace function public.cs_in_engine() returns boolean language sql stable as $$
  select coalesce(current_setting('pos.cs_engine', true), '') = 'on'
$$;

create or replace function public.change_sets_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'change_sets: un paquete nace en draft (estado recibido: %)', new.status;
    end if;
    return new;
  end if;
  if new.kind is distinct from old.kind or new.proposed_by is distinct from old.proposed_by
     or new.plan_import_id is distinct from old.plan_import_id then
    raise exception 'change_sets: kind, proposed_by y plan_import_id son inmutables';
  end if;
  if (new.status, new.approved_by, new.approved_at, new.applied_at, new.decision_id, new.failure_reason)
     is distinct from (old.status, old.approved_by, old.approved_at, old.applied_at, old.decision_id, old.failure_reason)
     and not public.cs_in_engine() then
    raise exception 'change_sets: el estado solo cambia mediante cs_propose / cs_review / cs_apply';
  end if;
  if old.status in ('applied','rejected') and new.status is distinct from old.status then
    raise exception 'change_set % ya está % y no puede pasar a %', old.id, old.status, new.status;
  end if;
  return new;
end;
$$;
drop trigger if exists change_sets_terminal on public.change_sets;
drop trigger if exists change_sets_guard on public.change_sets;
create trigger change_sets_guard before insert or update on public.change_sets
  for each row execute function public.change_sets_guard();

-- Lo aprobado es lo que se aplica: los ítems solo se editan mientras el paquete está en draft.
create or replace function public.change_items_guard()
returns trigger
language plpgsql
as $$
declare v_status text;
begin
  select status into v_status from public.change_sets where id = coalesce(new.change_set_id, old.change_set_id);
  if tg_op = 'INSERT' then
    if v_status not in ('draft') then raise exception 'change_items: solo se agregan ítems a un paquete en draft'; end if;
    if new.status <> 'proposed' then raise exception 'change_items: un ítem nace en proposed'; end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    if v_status not in ('draft') then raise exception 'change_items: solo se borran ítems de un paquete en draft'; end if;
    return old;
  end if;
  if (new.change_set_id, new.seq, new.op, new.entity_type, new.entity_id, new.temp_ref, new.payload, new.depends_on, new.sensitivity)
     is distinct from (old.change_set_id, old.seq, old.op, old.entity_type, old.entity_id, old.temp_ref, old.payload, old.depends_on, old.sensitivity)
     and v_status <> 'draft' then
    raise exception 'change_items: el contenido de un ítem no cambia después de proponer el paquete';
  end if;
  if (new.status, new.before) is distinct from (old.status, old.before) and not public.cs_in_engine() then
    raise exception 'change_items: el estado solo cambia mediante cs_review / cs_apply';
  end if;
  return new;
end;
$$;
drop trigger if exists change_items_guard on public.change_items;
create trigger change_items_guard before insert or update or delete on public.change_items
  for each row execute function public.change_items_guard();

-- Decisiones vinculadas a un paquete: su ciclo de aprobación lo sincroniza el
-- motor. Fuera de él, solo se permite implemented → evaluated (decisión del usuario).
create or replace function public.decisions_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.change_set_id is not null and not public.cs_in_engine() then
      raise exception 'decisions: una decisión de un paquete la crea cs_propose';
    end if;
    return new;
  end if;
  if old.change_set_id is not null and not public.cs_in_engine() then
    if new.change_set_id is distinct from old.change_set_id then
      raise exception 'decisions: el vínculo con el paquete es inmutable';
    end if;
    if new.status is distinct from old.status and not (old.status = 'implemented' and new.status = 'evaluated') then
      raise exception 'decisions: % → % solo ocurre a través del paquete de cambios', old.status, new.status;
    end if;
    if (new.approved_at, new.implemented_at, new.before, new.after) is distinct from (old.approved_at, old.implemented_at, old.before, old.after) then
      raise exception 'decisions: aprobación, implementación y snapshots los registra el motor';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists decisions_guard on public.decisions;
create trigger decisions_guard before insert or update on public.decisions
  for each row execute function public.decisions_guard();

-- =============================================================================
-- 3. META BLOQUEADA (§11): campos definitorios solo cambian vía goal_change
-- =============================================================================
create or replace function public.goals_lock_guard()
returns trigger
language plpgsql
as $$
begin
  if old.locked_at is not null and coalesce(current_setting('pos.goal_change', true), '') <> 'on' then
    if (new.title, new.unit, new.currency, new.baseline_value, new.target_value, new.start_date, new.deadline,
        new.kpi_metric_key, new.formula, new.success_criteria, new.failure_criteria, new.locked_at, new.activation_state)
       is distinct from
       (old.title, old.unit, old.currency, old.baseline_value, old.target_value, old.start_date, old.deadline,
        old.kpi_metric_key, old.formula, old.success_criteria, old.failure_criteria, old.locked_at, old.activation_state) then
      raise exception 'goals: la meta está bloqueada (§11); cámbiala con un paquete goal_change';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists goals_lock_guard on public.goals;
create trigger goals_lock_guard before update on public.goals
  for each row execute function public.goals_lock_guard();

-- =============================================================================
-- 4. REGISTRO SQL (espejo de lib/domain/registry.ts; paridad probada en tests)
-- =============================================================================
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
  end::regclass
$$;

-- Sensibilidad mínima por entidad y operación (0 normal, 1 strategic, 2 locked).
create or replace function public.cs_required_sensitivity(p_type text, p_op text) returns int
language sql immutable as $$
  select case
    when p_type in ('goal','identity_rule','decision') and p_op <> 'create' then 2
    when p_type in ('evidence','metric_entry','daily_log','fx_rate','revenue_receipt') and p_op <> 'create' then 2
    when p_type in ('goal','objective','system','funnel','hypothesis','roadmap_phase','experiment','decision','sop','identity_rule') then 1
    when p_type in ('objective_system','project') and p_op = 'archive' then 1
    when p_type in ('metric_definition','routine') and p_op <> 'create' then 1
    else 0
  end
$$;

-- §6: datos observados que Claude nunca propone.
create or replace function public.cs_claude_may_propose(p_type text) returns boolean
language sql immutable as $$
  select p_type not in ('evidence','metric_entry','daily_log','fx_rate','revenue_receipt')
$$;

create or replace function public.cs_sensitivity_rank(p text) returns int language sql immutable as $$
  select case p when 'normal' then 0 when 'strategic' then 1 when 'locked' then 2 end
$$;

-- Columnas uuid polimórficas (sin FK): cómo saber a qué tabla apuntan.
-- Toda columna uuid de una tabla del registro es id/user_id/origin_change_item_id,
-- una FK del catálogo o una de estas (test de completitud en migrations.pg.test.ts).
create or replace function public.cs_polymorphic_target(p_table regclass, p_col text, p_row jsonb) returns regclass
language plpgsql stable as $$
begin
  if p_table = 'public.evidence'::regclass and p_col = 'entity_id' then
    return case p_row->>'entity_type' when 'task' then 'public.tasks' when 'metric_entry' then 'public.metric_entries'
      when 'daily_log' then 'public.daily_logs' when 'experiment' then 'public.experiments' end::regclass;
  elsif p_table = 'public.decisions'::regclass and p_col = 'entity_id' then
    return public.cs_entity_table(p_row->>'entity_type');
  elsif p_table = 'public.ideas'::regclass and p_col = 'converted_entity_id' then
    return case p_row->>'status' when 'project' then 'public.projects' when 'experiment' then 'public.experiments'
      when 'task' then 'public.tasks' when 'goal_candidate' then 'public.goals' end::regclass;
  end if;
  raise exception 'cs: columna polimórfica no registrada %.%', p_table, p_col;
end;
$$;

create or replace function public.cs_is_polymorphic(p_table regclass, p_col text) returns boolean language sql immutable as $$
  select (p_table, p_col) in (('public.evidence'::regclass, 'entity_id'), ('public.decisions'::regclass, 'entity_id'),
                              ('public.ideas'::regclass, 'converted_entity_id'))
$$;

-- Verifica que `p_id` en `p_target` exista y pertenezca a auth.uid(). Falla cerrado.
create or replace function public.cs_assert_owned(p_target regclass, p_id uuid, p_context text)
returns void
language plpgsql
as $$
declare v_owner uuid;
begin
  if p_target is null then
    raise exception 'ownership: % no tiene tabla destino conocida', p_context;
  end if;
  if not exists (select 1 from pg_attribute where attrelid = p_target and attname = 'user_id' and not attisdropped) then
    raise exception 'ownership: % apunta a % (sin user_id)', p_context, p_target;
  end if;
  execute format('select user_id from %s where id = $1', p_target) into v_owner using p_id;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'ownership: % (%) no pertenece al usuario', p_context, p_id;
  end if;
end;
$$;

-- Revisa toda referencia de una fila (ya resuelta) antes de escribirla.
create or replace function public.cs_check_references(p_table regclass, p_row jsonb, p_context text)
returns void
language plpgsql
as $$
declare
  k text; v jsonb; v_target regclass; v_iv jsonb;
begin
  for k, v in select * from jsonb_each(p_row) loop
    if jsonb_typeof(v) <> 'string' or k in ('id','user_id','origin_change_item_id') then continue; end if;
    select c.confrelid::regclass into v_target
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
     where c.conrelid = p_table and c.contype = 'f' and cardinality(c.conkey) = 1 and a.attname = k
     limit 1;
    if v_target is not null then
      perform public.cs_assert_owned(v_target, (v #>> '{}')::uuid, format('%s.%s', p_context, k));
    elsif public.cs_is_polymorphic(p_table, k) then
      perform public.cs_assert_owned(public.cs_polymorphic_target(p_table, k, p_row), (v #>> '{}')::uuid, format('%s.%s', p_context, k));
    end if;
  end loop;
  -- Referencias dentro de jsonb: intervenciones de experimentos → rutinas (P-12).
  if p_table = 'public.experiments'::regclass and jsonb_typeof(p_row->'interventions') = 'array' then
    for v_iv in select * from jsonb_array_elements(p_row->'interventions') loop
      perform public.cs_assert_owned('public.routines'::regclass, (v_iv->>'target_id')::uuid, format('%s.interventions.target_id', p_context));
    end loop;
  end if;
end;
$$;

-- =============================================================================
-- 5. cs_propose: draft|failed → proposed (+ decisión si hay cambios estratégicos)
-- =============================================================================
create or replace function public.cs_propose(p_set uuid, p_decision jsonb default null)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  s public.change_sets%rowtype;
  it public.change_items%rowtype;
  v_needs_decision boolean := false;
  v_decision uuid;
  v_n int;
begin
  select * into s from public.change_sets where id = p_set for update;
  if not found then raise exception 'cs_propose: paquete inexistente o ajeno'; end if;
  if s.status not in ('draft','failed') then
    raise exception 'cs_propose: solo se propone desde draft o failed (estado: %)', s.status;
  end if;
  select count(*) into v_n from public.change_items where change_set_id = p_set;
  if v_n = 0 then raise exception 'cs_propose: el paquete no tiene ítems'; end if;

  for it in select * from public.change_items where change_set_id = p_set order by seq loop
    if public.cs_entity_table(it.entity_type) is null then
      raise exception 'cs_propose: entidad desconocida % (ítem %)', it.entity_type, it.seq;
    end if;
    if public.cs_sensitivity_rank(it.sensitivity) < public.cs_required_sensitivity(it.entity_type, it.op) then
      raise exception 'cs_propose: ítem % (%.%) declara sensibilidad % menor a la requerida', it.seq, it.entity_type, it.op, it.sensitivity;
    end if;
    if s.proposed_by = 'claude' and not public.cs_claude_may_propose(it.entity_type) then
      raise exception 'cs_propose: Claude no puede proponer % (datos observados, §6)', it.entity_type;
    end if;
    if s.kind = 'standard' and (it.sensitivity = 'locked' or public.cs_required_sensitivity(it.entity_type, it.op) = 2) then
      raise exception 'cs_propose: ítem % (%.%) es un cambio bloqueado; requiere su flujo propio', it.seq, it.entity_type, it.op;
    end if;
    if it.sensitivity in ('strategic','locked') then v_needs_decision := true; end if;
  end loop;

  if s.kind = 'goal_change' then
    if v_n <> 1 or not exists (select 1 from public.change_items where change_set_id = p_set and op = 'update' and entity_type = 'goal') then
      raise exception 'cs_propose: un goal_change contiene exactamente un ítem update sobre goal';
    end if;
    select * into it from public.change_items where change_set_id = p_set;
    perform public.cs_assert_owned('public.goals'::regclass, it.entity_id, 'goal_change');
    v_needs_decision := true;
  end if;

  perform set_config('pos.cs_engine', 'on', true);
  if v_needs_decision then
    if s.decision_id is null then
      if p_decision is null or coalesce(trim(p_decision->>'title'), '') = '' or coalesce(trim(p_decision->>'problem'), '') = ''
         or coalesce(trim(p_decision->>'change'), '') = '' or coalesce(trim(p_decision->>'reason'), '') = '' then
        raise exception 'cs_propose: un cambio estratégico exige decisión con título, problema, cambio y razón';
      end if;
      insert into public.decisions (title, problem, evidence, diagnosis, change, reason, expected_result, status, proposed_by,
                                    change_set_id, entity_type, entity_id, origin, created_by)
      values (p_decision->>'title', p_decision->>'problem', p_decision->>'evidence', p_decision->>'diagnosis',
              p_decision->>'change', p_decision->>'reason', p_decision->>'expected_result', 'proposed', s.proposed_by,
              p_set, case when s.kind = 'goal_change' then 'goal' end, case when s.kind = 'goal_change' then it.entity_id end,
              case s.proposed_by when 'claude' then 'claude' when 'system' then 'system' else 'manual' end, s.proposed_by)
      returning id into v_decision;
    else
      v_decision := s.decision_id;
      update public.decisions set status = 'proposed', approved_at = null where id = v_decision;
    end if;
  end if;

  update public.change_items set status = 'proposed' where change_set_id = p_set;
  update public.change_sets
     set status = 'proposed', decision_id = v_decision, approved_by = null, approved_at = null, failure_reason = null
   where id = p_set;
  perform set_config('pos.cs_engine', '', true);
  return v_decision;
end;
$$;

-- =============================================================================
-- 6. cs_review: proposed → approved | partially_approved | rejected (solo el usuario)
-- =============================================================================
create or replace function public.cs_review(p_set uuid, p_approved int[], p_rejected int[])
returns text
language plpgsql
set search_path = public
as $$
declare
  s public.change_sets%rowtype;
  it public.change_items%rowtype;
  v_all int[]; v_rejected_refs text[]; v_ref text;
  v_status text; v_n_ok int; v_n_no int;
begin
  select * into s from public.change_sets where id = p_set for update;
  if not found then raise exception 'cs_review: paquete inexistente o ajeno'; end if;
  if s.status <> 'proposed' then raise exception 'cs_review: solo se revisa un paquete proposed (estado: %)', s.status; end if;
  p_approved := coalesce(p_approved, '{}'); p_rejected := coalesce(p_rejected, '{}');
  if p_approved && p_rejected then raise exception 'cs_review: un ítem no puede aprobarse y rechazarse a la vez'; end if;
  select array_agg(seq order by seq) into v_all from public.change_items where change_set_id = p_set;
  if not (v_all <@ (p_approved || p_rejected) and (p_approved || p_rejected) <@ v_all) then
    raise exception 'cs_review: la revisión debe decidir exactamente todos los ítems %', v_all;
  end if;

  -- Un ítem aprobado no puede depender de uno rechazado.
  select coalesce(array_agg(temp_ref), '{}') into v_rejected_refs
    from public.change_items where change_set_id = p_set and seq = any(p_rejected) and temp_ref is not null;
  for it in select * from public.change_items where change_set_id = p_set and seq = any(p_approved) loop
    foreach v_ref in array v_rejected_refs loop
      if v_ref = any(it.depends_on) or position(('"' || v_ref || '"') in it.payload::text) > 0 then
        raise exception 'cs_review: el ítem % depende de % que fue rechazado', it.seq, v_ref;
      end if;
    end loop;
  end loop;

  v_n_ok := cardinality(p_approved); v_n_no := cardinality(p_rejected);
  v_status := case when v_n_no = 0 then 'approved' when v_n_ok = 0 then 'rejected' else 'partially_approved' end;
  if s.kind = 'goal_change' and v_status = 'partially_approved' then raise exception 'cs_review: goal_change no admite aprobación parcial'; end if;

  perform set_config('pos.cs_engine', 'on', true);
  update public.change_items set status = 'approved' where change_set_id = p_set and seq = any(p_approved);
  update public.change_items set status = 'rejected' where change_set_id = p_set and seq = any(p_rejected);
  if v_status = 'rejected' then
    update public.change_sets set status = 'rejected' where id = p_set;
    if s.decision_id is not null then update public.decisions set status = 'rejected' where id = s.decision_id; end if;
  else
    update public.change_sets set status = v_status, approved_by = 'user', approved_at = now() where id = p_set;
    if s.decision_id is not null then
      update public.decisions
         set status = case v_status when 'approved' then 'approved' else 'modified' end, approved_at = now()
       where id = s.decision_id;
    end if;
  end if;
  perform set_config('pos.cs_engine', '', true);
  return v_status;
end;
$$;

-- =============================================================================
-- 7. cs_apply: approved|partially_approved → applied (atómico) | failed (rollback)
-- =============================================================================
create or replace function public.cs_apply_item(s public.change_sets, it public.change_items, p_refs jsonb)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_table regclass := public.cs_entity_table(it.entity_type);
  v_payload jsonb; v_text text; k text; v_cols text; v_id uuid; v_before jsonb; v_merged jsonb; v_locked timestamptz;
  v_origin text := case when s.plan_import_id is not null then 'import' when s.proposed_by = 'claude' then 'claude'
                        when s.proposed_by = 'system' then 'system' else 'manual' end;
begin
  -- Resolver referencias temporales ($ref → uuid creado en este mismo paquete).
  v_text := it.payload::text;
  for k in select jsonb_object_keys(p_refs) loop
    v_text := replace(v_text, '"' || k || '"', '"' || (p_refs->>k) || '"');
  end loop;
  if v_text ~ '"\$[a-z][a-z0-9_]*"' then
    raise exception 'cs_apply: ítem % tiene referencias sin resolver', it.seq;
  end if;
  v_payload := v_text::jsonb;

  -- Columnas reservadas: las asigna el motor, nunca el payload.
  for k in select jsonb_object_keys(v_payload) loop
    if k in ('id','user_id','origin','origin_change_item_id','created_by','version','archived_at','superseded_by','created_at','updated_at','locked_at') then
      raise exception 'cs_apply: ítem % intenta escribir la columna reservada %', it.seq, k;
    end if;
    if not exists (select 1 from pg_attribute where attrelid = v_table and attname = k and attnum > 0 and not attisdropped) then
      raise exception 'cs_apply: ítem % usa la columna desconocida %.%', it.seq, v_table, k;
    end if;
  end loop;

  if it.op = 'create' then
    perform public.cs_check_references(v_table, v_payload, format('ítem %s', it.seq));
    select string_agg(quote_ident(key), ', ') into v_cols from jsonb_object_keys(v_payload) as key;
    if v_cols is null then raise exception 'cs_apply: ítem % sin datos', it.seq; end if;
    execute format(
      'insert into %s (%s, origin, origin_change_item_id, created_by) select %s, $2, $3, $4 from jsonb_populate_record(null::%s, $1) returning id',
      v_table, v_cols, v_cols, v_table)
      into v_id using v_payload, v_origin, it.id, s.proposed_by;
  else
    perform public.cs_assert_owned(v_table, it.entity_id, format('ítem %s (%s)', it.seq, it.entity_type));
    execute format('select to_jsonb(t) from %s t where id = $1', v_table) into v_before using it.entity_id;
    v_merged := v_before || v_payload;
    perform public.cs_check_references(v_table, v_merged, format('ítem %s', it.seq));
    if v_table = 'public.goals'::regclass then
      v_locked := (v_before->>'locked_at')::timestamptz;
      if s.kind <> 'goal_change' then
        raise exception 'cs_apply: la meta solo se modifica con un paquete goal_change (§11)';
      end if;
      perform set_config('pos.goal_change', 'on', true);
    end if;
    if it.op = 'update' then
      select string_agg(quote_ident(key), ', ') into v_cols from jsonb_object_keys(v_payload) as key;
      if v_cols is null then raise exception 'cs_apply: ítem % sin cambios', it.seq; end if;
      execute format('update %s set (%s) = (select %s from jsonb_populate_record(null::%s, $1)), version = version + 1 where id = $2',
                     v_table, v_cols, v_cols, v_table)
        using v_payload, it.entity_id;
      if s.kind = 'goal_change' then
        -- §11: tras el cambio, la meta vuelve a quedar bloqueada.
        update public.goals set locked_at = now() where id = it.entity_id;
      end if;
    else
      execute format('update %s set archived_at = now(), version = version + 1 where id = $1', v_table) using it.entity_id;
    end if;
    perform set_config('pos.goal_change', '', true);
    update public.change_items set before = v_before where id = it.id;
    v_id := it.entity_id;
  end if;
  update public.change_items set status = 'applied' where id = it.id;
  return v_id;
end;
$$;

create or replace function public.cs_apply(p_set uuid)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  s public.change_sets%rowtype;
  it public.change_items%rowtype;
  v_refs jsonb := '{}'::jsonb; v_done int[] := '{}'; v_progress boolean; v_ready boolean; v_ref text;
  v_id uuid; v_result jsonb := '{"created":{},"updated":[],"archived":[]}'::jsonb; v_err text; v_dstatus text;
  v_after jsonb;
begin
  select * into s from public.change_sets where id = p_set for update;
  if not found then raise exception 'cs_apply: paquete inexistente o ajeno'; end if;
  if s.status = 'applied' then raise exception 'cs_apply: el paquete ya fue aplicado (%)', s.applied_at; end if;
  if s.status not in ('approved','partially_approved') then
    raise exception 'cs_apply: solo se aplica un paquete aprobado por el usuario (estado: %)', s.status;
  end if;
  if s.approved_by is distinct from 'user' or s.approved_at is null then
    raise exception 'cs_apply: falta la aprobación humana registrada';
  end if;
  if exists (select 1 from public.change_items where change_set_id = p_set and status = 'approved' and sensitivity in ('strategic','locked'))
     or s.kind = 'goal_change' then
    select status into v_dstatus from public.decisions where id = s.decision_id;
    if v_dstatus is null or v_dstatus not in ('approved','modified') then
      raise exception 'cs_apply: el paquete tiene cambios estratégicos sin decisión aprobada';
    end if;
  end if;

  perform set_config('pos.cs_engine', 'on', true);
  begin
    loop
      v_progress := false;
      for it in select * from public.change_items
                 where change_set_id = p_set and status = 'approved' and not (seq = any(v_done)) order by seq loop
        v_ready := true;
        for v_ref in
          select unnest(it.depends_on)
          union
          select (regexp_matches(it.payload::text, '"(\$[a-z][a-z0-9_]*)"', 'g'))[1]
        loop
          if not (v_refs ? v_ref) then v_ready := false; end if;
        end loop;
        if v_ready then
          v_id := public.cs_apply_item(s, it, v_refs);
          v_done := v_done || it.seq;
          v_progress := true;
          if it.op = 'create' then
            if it.temp_ref is not null then v_refs := v_refs || jsonb_build_object(it.temp_ref, v_id); end if;
            v_result := jsonb_set(v_result, '{created}', (v_result->'created') || jsonb_build_object(coalesce(it.temp_ref, 'seq_' || it.seq), v_id));
          elsif it.op = 'update' then
            v_result := jsonb_set(v_result, '{updated}', (v_result->'updated') || to_jsonb(v_id));
          else
            v_result := jsonb_set(v_result, '{archived}', (v_result->'archived') || to_jsonb(v_id));
          end if;
        end if;
      end loop;
      exit when not exists (select 1 from public.change_items where change_set_id = p_set and status = 'approved' and not (seq = any(v_done)));
      if not v_progress then raise exception 'cs_apply: dependencias sin resolver o cíclicas'; end if;
    end loop;

    update public.change_sets set status = 'applied', applied_at = now() where id = p_set;
    if s.decision_id is not null then
      if s.kind = 'goal_change' then
        select to_jsonb(g) into v_after from public.goals g
         where id = (select entity_id from public.change_items where change_set_id = p_set limit 1);
        update public.decisions d
           set status = 'implemented', implemented_at = now(), after = v_after,
               before = (select before from public.change_items where change_set_id = p_set limit 1)
         where id = s.decision_id;
      else
        update public.decisions set status = 'implemented', implemented_at = now(), after = v_result where id = s.decision_id;
      end if;
    end if;
    if s.plan_import_id is not null then
      update public.plan_imports set status = 'applied' where id = s.plan_import_id;
    end if;
  exception when others then
    -- Todo lo escrito dentro del bloque se revierte (atomicidad).
    get stacked diagnostics v_err = message_text;
    update public.change_sets set status = 'failed', failure_reason = v_err where id = p_set;
    perform set_config('pos.cs_engine', '', true);
    perform set_config('pos.goal_change', '', true);
    return jsonb_build_object('status', 'failed', 'reason', v_err);
  end;
  perform set_config('pos.cs_engine', '', true);
  return jsonb_build_object('status', 'applied') || v_result;
end;
$$;
