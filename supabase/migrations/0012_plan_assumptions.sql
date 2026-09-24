-- Fase 2 (ARQUITECTURA_PERSONAL_OS.md §6): insumos del reverse engineering.
--
-- funnel_assumptions: ESTIMACIONES editables del usuario (tasas en %, ciclo
-- de venta, precio de la oferta, minutos por contacto, días de prospección
-- por semana). Viven como datos, no en el código; el motor las reemplaza por
-- tasas históricas en cuanto hay muestra suficiente.
--
-- pipeline_snapshot: oportunidades abiertas hoy por etapa + fecha de corte.
-- Es un DATO manual hasta que exista la tabla `leads` (Fase 6).
alter table public.agencia_settings
  add column if not exists funnel_assumptions jsonb not null default '{}'::jsonb;
alter table public.agencia_settings
  add column if not exists pipeline_snapshot jsonb not null default '{}'::jsonb;
