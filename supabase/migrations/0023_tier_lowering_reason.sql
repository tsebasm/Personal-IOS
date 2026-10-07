-- B-1 (decisión cerrada 2026-10-06): razón OBLIGATORIA solo al bajar una tarea
-- desde P0 (P0 → P1/P2). Subir, moverse entre P1/P2 o volver a Automático no la
-- exige. Protección contra autosabotaje sin burocracia. El resto del override
-- (sugerencia conservada, usuario, fecha, razón, activity_logs) no cambia.

create or replace function public.set_tier_override(p_task uuid, p_tier text, p_reason text default null)
returns void
language plpgsql
set search_path = public
as $$
declare
  t public.tasks%rowtype;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if p_tier not in ('p0','p1','p2') then raise exception 'set_tier_override: nivel inválido %', p_tier; end if;
  select * into t from public.tasks where id = p_task for update;
  if not found then raise exception 'set_tier_override: tarea inexistente o ajena'; end if;
  if t.tier = 'p0' and p_tier in ('p1','p2') and v_reason is null then
    raise exception 'Bajar una tarea desde P0 exige una razón';
  end if;
  update public.tasks
     set tier = p_tier, tier_source = 'user', tier_overridden_at = now(), tier_overridden_by = 'user',
         tier_override_reason = v_reason
   where id = p_task;
  insert into public.activity_logs (user_id, entity_type, entity_id, action, payload)
  values (t.user_id, 'task', p_task, 'tier_override_set',
          jsonb_build_object('from', t.tier, 'to', p_tier, 'suggested', t.tier_suggested,
                             'suggested_source', t.tier_suggested_source, 'reason', v_reason));
end;
$$;
