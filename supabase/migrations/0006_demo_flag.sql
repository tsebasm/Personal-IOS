-- Fase 3: datos de demostración (seed) reversibles.
-- `is_demo` marca filas creadas por `npm run seed` para poder borrarlas sin
-- tocar datos reales. Solo en las tablas raíz que el seed crea directamente
-- (areas, goals, habits); habit_logs no la necesita porque cuelga de habits
-- con `on delete cascade` — al borrar un hábito demo sus registros se van solos.

alter table public.areas add column if not exists is_demo boolean not null default false;
alter table public.goals add column if not exists is_demo boolean not null default false;
alter table public.habits add column if not exists is_demo boolean not null default false;

create index if not exists idx_areas_user_demo on public.areas(user_id, is_demo);
create index if not exists idx_goals_user_demo on public.goals(user_id, is_demo);
create index if not exists idx_habits_user_demo on public.habits(user_id, is_demo);
