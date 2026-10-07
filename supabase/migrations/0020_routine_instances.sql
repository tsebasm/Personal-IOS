-- Fase A4 (P-11, P-12): instancias diarias de rutinas.
--
-- lib/engine/routines.ts calcula qué instancias tocan hoy (cadencia, vigencia,
-- intervenciones de experimentos). Esta función solo las persiste:
--  * idempotente: una instancia por rutina y día (uq_tasks_routine_day, 0017);
--    llamarla dos veces no duplica nada;
--  * la rutina debe pertenecer al usuario (cs_assert_owned, 0019);
--  * el objetivo del día queda fijado en la instancia (snapshot): si después
--    cambia la regla, el historial de ese día no se reescribe;
--  * origin/created_by = 'system': operación automática de bajo riesgo
--    (spec §99 nivel 5) sobre una regla que el usuario ya aprobó.
-- security invoker: corre con la sesión del usuario y RLS activo.

create or replace function public.materialize_routine_instances(p_instances jsonb)
returns integer
language plpgsql
set search_path = public
as $$
declare
  inst jsonb;
  v_inserted integer := 0;
  v_rows integer;
begin
  if jsonb_typeof(p_instances) <> 'array' then
    raise exception 'materialize_routine_instances: se espera un arreglo';
  end if;
  for inst in select * from jsonb_array_elements(p_instances) loop
    perform public.cs_assert_owned('public.routines'::regclass, (inst->>'routine_id')::uuid, 'instancia de rutina');
    insert into public.tasks (
      title, status, plan_state, tier, system_id, routine_id, target_qty, unit, metric_key,
      scheduled_date, execution_mode, estimated_minutes, origin, created_by
    )
    select inst->>'title', 'pending', 'today', inst->>'tier', r.system_id, r.id, (inst->>'target_qty')::numeric,
           inst->>'unit', inst->>'metric_key', (inst->>'scheduled_date')::date, inst->>'execution_mode',
           (inst->>'estimated_minutes')::integer, 'system', 'system'
      from public.routines r
     where r.id = (inst->>'routine_id')::uuid
    on conflict (routine_id, scheduled_date) where routine_id is not null do nothing;
    get diagnostics v_rows = row_count;
    v_inserted := v_inserted + v_rows;
  end loop;
  return v_inserted;
end;
$$;
