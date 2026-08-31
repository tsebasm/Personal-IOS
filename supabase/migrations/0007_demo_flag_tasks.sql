-- Fase 3b: el seed ahora también puebla tareas, proyectos y agenda del
-- Dashboard (antes solo áreas/metas/hábitos) — misma marca is_demo que
-- 0006_demo_flag.sql, aplicada a las tablas que le faltaban.

alter table public.tasks add column if not exists is_demo boolean not null default false;
alter table public.projects add column if not exists is_demo boolean not null default false;
alter table public.calendar_events add column if not exists is_demo boolean not null default false;

create index if not exists idx_tasks_user_demo on public.tasks(user_id, is_demo);
create index if not exists idx_projects_user_demo on public.projects(user_id, is_demo);
create index if not exists idx_calendar_events_user_demo on public.calendar_events(user_id, is_demo);
