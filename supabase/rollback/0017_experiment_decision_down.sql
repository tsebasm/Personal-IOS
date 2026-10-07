-- Reversión de la única transformación de datos de 0017 (C-4):
-- experiments.decision 'modify' → 'change', SOLO en las filas que la migración
-- cambió (auditadas en activity_logs con action 'migration_0017_decision_renamed').
-- Si hay experimentos creados después con 'modify'/'revert', el CHECK anterior
-- no puede restaurarse sin perder información: la reversión aborta sin cambios.
--
-- Uso: SQL Editor de Supabase. No forma parte de la secuencia de migraciones.

begin;

alter table public.experiments drop constraint if exists experiments_evaluated_needs_decision;
alter table public.experiments drop constraint if exists experiments_decision_check;

update public.experiments e
   set decision = 'change'
  from public.activity_logs l
 where l.entity_type = 'experiment'
   and l.entity_id = e.id
   and l.action = 'migration_0017_decision_renamed'
   and e.decision = 'modify';

do $$
begin
  if exists (select 1 from public.experiments where decision in ('modify','revert')) then
    raise exception 'Hay experimentos con decisiones nuevas (modify/revert) no creadas por 0017: no se puede restaurar el CHECK anterior sin perder información.';
  end if;
end $$;

alter table public.experiments add constraint experiments_decision_check
  check (decision is null or decision in ('keep','change','inconclusive'));

-- El historial no se borra: se registra la reversión.
insert into public.activity_logs (user_id, entity_type, entity_id, action, payload)
select user_id, 'experiment', entity_id, 'migration_0017_decision_reverted',
       jsonb_build_object('field', 'decision', 'from', 'modify', 'to', 'change')
  from public.activity_logs
 where action = 'migration_0017_decision_renamed';

commit;
