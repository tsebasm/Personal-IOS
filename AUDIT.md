# AUDIT — Personal Execution OS vs `PERSONAL-OS-SPEC.md`

> **Actualización 2026-10-06:** la fuente de control de implementación es **[SPEC-MATRIX.md](SPEC-MATRIX.md)**. Ahí están la matriz completa y las Fases A–D, y reemplaza el plan de §5 y §9 de este documento. Todo criterio del tipo "no hace falta porque ninguna pantalla lo necesita" queda revocado.

Fecha: 2026-10-06 · Rama: `dev` @ `39a574a` · Spec leída: `PERSONAL-OS-SPEC.md.md` v0.1 (130 secciones, completa).
Complementa (no reemplaza) `ARQUITECTURA_PERSONAL_OS.md` (2026-09-23) y `AUDITORIA_SISTEMA.md` (2026-09-22).

> **Hallazgo principal:** el repo **no es un punto de partida vacío**. Las fases 1–10 de `ARQUITECTURA_PERSONAL_OS.md` están implementadas: motores puros con 109 tests, plan inverso, capacidad, prioridad, tracking, cuello de botella, experimentos, asistente IA de solo lectura, export a Obsidian y CI.
> El problema **no es que falte backend**. Lo que falla es que **la interfaz no cumple la spec**: HOY está saturada, no existe P0/P1/P2, la meta no está bloqueada y las tareas no son cuantificables. Esta fase es sobre todo **un rediseño de HOY más unas pocas extensiones de esquema**, no una reconstrucción.

---

## 0. Stack verificado

| Ítem | Valor |
|---|---|
| Framework | Next.js **16.3.3** App Router (`proxy.ts` = antiguo middleware), React 19.2 |
| Lenguaje | TypeScript 5.5 estricto |
| Estilos | Tailwind 3.4 + variables CSS (tema claro/oscuro), tipografías Fraunces / Public Sans / IBM Plex Mono |
| UI | **Kit propio** `components/ui/*` (Button, Card, Modal, ProgressBar, Badge, Field…). **No hay shadcn/ui.** |
| Backend | Server Actions (`lib/actions/*`, patrón: auth → zod → guard → DB → `revalidatePath`). Sin API REST. |
| DB | Supabase Postgres, 16 migraciones, RLS en todas las tablas, sin service role |
| Auth | Supabase Auth email/contraseña; `proxy.ts` gatea `/dashboard/**` |
| IA | `@anthropic-ai/sdk`, asistente en `/dashboard/asistente`. **Solo escribe en `ai_messages`** (no modifica datos). |
| Motores | `lib/engine/*` puros: gap, rates, reverse, plan, plan30, capacity, priority, allocation, habits, bottleneck, experiments, rollup, metrics-registry |
| Datos | `lib/data/*` (today, plan, analytics, ser-hacer-tener, profile, schema-status) |
| Obsidian | `npm run export:obsidian` (unidireccional) → `C:\VANT\VANT_Brain\Personal OS (sync)\` |
| Seed | `npm run seed` / `seed:reset`, con flag `is_demo` en areas, goals, habits, tasks, projects y calendar_events |
| Tests / CI | Vitest (109 tests), GitHub Actions: typecheck + lint + test + build |

Rutas: `/login`, `/auth/callback`, `/dashboard` (general, 596 líneas), `/dashboard/{today, plan, capacity, time, asistente, tasks, projects, goals, habits, knowledge, agencia/*, finances, reviews, insights, areas}`. `/` redirige a **`/dashboard`** (no a HOY).

---

## 1. EXISTENTE

| Concepto de la spec | Dónde vive hoy |
|---|---|
| META (L0) | `goals` + `profiles.north_star_goal_id` (baseline, target, current, unit, deadline, start_date) |
| OBJETIVOS (L1) | `goals` hijos vía `parent_goal_id` (`kind='metric'`) |
| PROYECTOS (L3) | `projects` (goal_id, status, deadline) + `milestones` (sin uso) |
| TAREAS (L4) | `tasks` (goal_id, lever, impact, effort, execution_mode, estimated_minutes, deadline, scheduled_date, completed_at) + `task_dependencies` |
| Ritmo requerido / real | `lib/engine/gap.ts` → `requiredPerDay`, `actualPerDay`, `projectedAtDeadline`, `onTrack` (booleano) |
| Matemática de la meta / funnel | `reverse.ts` + `plan.ts` (contactos → respuestas → citas → asistencias → cierres, con probabilidad Poisson y sensibilidad) |
| Escenarios / supuestos | `agencia_settings.funnel_assumptions`; `rates.ts` etiqueta `historical / estimate / historical_low_n / missing` |
| Today Engine | `/dashboard/today` + `lib/data/today.ts` + `priority.ts` (Top 3 con "por qué", cuota de prospección calculada y follow-ups vencidos como acciones) |
| Modo adaptativo | Tareas vencidas de días anteriores → decisión con motivo → `activity_logs` |
| Registro diario | `reviews(type='diaria')`: energía, enfoque, progreso sí/parcial/no, nota |
| Revisión semanal | `rollup.ts` + snapshot inmutable en `reviews(type='semanal')` |
| Métricas | `metrics-registry.ts` (definición única) + `prospecting_sessions` (contactos, follow-ups, respuestas, citas, asistencias, propuestas, cierres) + `leads` |
| Cuello de botella | `bottleneck.ts` (distingue observación de hipótesis, exige muestra mínima) |
| Hipótesis | `hypotheses` (status untested/testing/validated/rejected, `superseded_by`) |
| Experimentos | `experiments` (metric_key, variantes, sample_target, decision, learning) |
| Decisiones | `knowledge_items(kind='decision')` + `knowledge_links` (sin campos estructurados) |
| Identidad (L-1) | `vision` (statement, principles, avoid) |
| Hábitos | `habits` + `habit_logs` + `habits.ts` (cumplimiento según frecuencia) |
| Tiempo | `capacity_blocks`, `time_entries`, `allocation.ts` |
| Claude | Asistente con contexto formado por las conclusiones de los motores, formato OBS/HIP/ACC/MET/DEC, `message_type`, caching, rate limit |

## 2. REUTILIZABLE (sin reescribir)

- **Todos los motores de `lib/engine/*`** y sus tests. Son el núcleo del "Execution Engine" que pide la spec.
- `lib/data/today.ts` (carga de contexto) y `priority.ts` (orden **dentro** de cada nivel P).
- Kit `components/ui/*`, tema y tipografías. Ya es sobrio y no tiene gradientes ni gamificación.
- Patrón de Server Actions, RLS, `is_demo`, `schema-status` (banner de migraciones pendientes).
- `QuickTimeLog`, `TaskDoneToggle`, `ResolveMissedButton`, `CheckinForm`.
- Export a Obsidian (`scripts/lib/obsidian-md.mjs`) como base del adapter de escritura.
- Asistente IA (ya cumple "Claude no escribe datos").

## 3. INCOMPLETO

| # | Brecha | Spec |
|---|---|---|
| I-1 | **No existe P0/P1/P2.** `tasks.priority` es alta/media/baja; los hábitos no tienen nivel. | §28, §52 |
| I-2 | **Tareas no cuantificables:** faltan `target_qty`, `actual_qty` y `unit`. Solo la cuota de prospección (pseudo-tarea `plan:outreach`) es cuantificable. | §25, §27; prompt §13 |
| I-3 | **Estados de tarea incompletos:** faltan `partially_completed`, `verified` y `blocked` (existe `waiting`); `overdue` no se modela (bien: debe ser derivado). | §26 |
| I-4 | **Evidencia:** no hay campo de evidencia ni de verificación. | §27 |
| I-5 | **Registro diario pobre:** no guarda el snapshot P0/P1/P2, el score de ejecución, los minutos trabajados, las métricas del día, problemas, bloqueos, aprendizajes, evidencia ni "mañana". | §35 |
| I-6 | **Estado de ritmo:** solo `onTrack: boolean`; la spec pide 6 niveles (muy adelantado → críticamente atrasado). | §48 |
| I-7 | **Score de ejecución** (completadas ÷ planificadas) no existe como métrica separada del progreso de la meta. | §50 |
| I-8 | **Registro de decisiones** sin estructura (problema, evidencia, cambio, razón, aprobado por, resultado esperado/real, estado PROPUESTA→EVALUADA). | §43, §44 |
| I-9 | **Categorías de métricas** input / proceso / output / outcome no están explícitas en `metrics-registry`. | §36; prompt §15 |
| I-10 | **SISTEMAS (L2):** no existen como entidad. | §23 |
| I-11 | **Contrato con Obsidian:** solo se exporta; no hay tipos ni adapter de lectura. | §7, §73, §121 |
| I-12 | **Datos demo:** el seed es genérico (salud, peso, finanzas…), no un escenario de ejecución de VANT. | prompt §25 |

## 4. CONFLICTO CON SPEC

| # | Conflicto | Evidencia | Propuesta |
|---|---|---|---|
| C-1 | **HOY está saturada:** 10 tarjetas (meta, "qué cambió", capacidad, pendientes, Top 3, secundarias, completadas, registrar tiempo, SER/HACER/TENER, agenda). | `app/dashboard/today/page.tsx` | Reestructurar (ver §H). Lo secundario queda colapsado tras el P0. |
| C-2 | **La meta no está bloqueada:** el checkbox "North Star" y la edición de target/deadline están en el formulario normal de metas. | `goal-form.tsx:169`, `lib/actions/goals.ts` | Bloqueo de meta: edición solo mediante un flujo deliberado con motivo, snapshot y registro de decisión. |
| C-3 | **La entrada es `/dashboard`, no HOY.** | `app/page.tsx` | `/` → `/dashboard/today`. |
| C-4 | **Navegación de 15 ítems** al mismo nivel. | `components/nav.ts` | 6 primarios + "Más" colapsado. **No se borra ninguna ruta.** |
| C-5 | **Top 3 único vs jerarquía P0/P1/P2.** El motor actual mezcla todo en un ranking. | `priority.ts` | Nivel P = **categoría** (qué tipo de acción); score = **orden dentro del nivel**. Son compatibles; no se elimina el motor. |
| C-6 | **Meta de ejemplo del prompt ("Conseguir primer cliente VANT, D-17") ≠ meta real registrada** (20.000.000 COP acumulados al 2026-12-31). | `ARQUITECTURA §9.4`, memoria | Propuesta: META 🔒 = 20M COP; "Primer cliente" = **OBJETIVO L1** (hito) bajo la meta. **Requiere tu confirmación.** |
| C-7 | La spec pide shadcn/ui; el repo tiene un kit propio. | `components/ui` | **Mantener el kit propio.** Migrar no aumenta la ejecución (§29 del prompt). |
| C-8 | La spec (§109) pide `REPOSITORY-AUDIT.md`; el prompt pide `AUDIT.md`. El archivo de spec se llama `PERSONAL-OS-SPEC.md.md` (doble extensión). | — | Usar `AUDIT.md`; renombrar la spec a `PERSONAL-OS-SPEC.md` y commitearla. |
| C-9 | **Tres estructuras de Obsidian distintas:** spec §73 (`00-META … 12-IDEAS`, sin HYPOTHESES), prompt §7 (`00_META … 13_IDEAS`, con HYPOTHESES y REVOLUTION) y bóveda real (`Core/`, `Experiments/`, `Case Closing/`, `Templates/`, `01_Fundamentos Revolution`). | `C:\VANT\VANT_Brain` | No reorganizar la bóveda existente. El adapter mapea **carpeta lógica → ruta física** por configuración (ver §H.4). |
| C-10 | `reviews(type='diaria')` mezcla un check-in subjetivo con lo que la spec llama registro diario. | `checkin.ts` | Extender `content` a v2 en lugar de crear una tabla `daily_logs` (ver §G). |

## 5. A IMPLEMENTAR (esta fase, en orden)

1. **Modelo:** `tasks.tier` (p0/p1/p2), cantidades (`target_qty`, `actual_qty`, `unit`), estados `partial` y `blocked`, `verified_at`, `evidence`, `executed_on`; `habits.tier`; tabla `decisions`; bloqueo de meta (`goals.locked_at`); categoría de métrica en el registro; `paceStatus()` y `executionScore()` puros. Tipos de dominio en `lib/domain/*`.
2. **HOY v2:** META 🔒 + D-N + progreso + estado de ritmo · P0 con contadores `+1/+5` · P1 · P2 colapsado · Ejecución % · bloqueo visual del resto mientras P0 < 100%.
3. **Ejecución de tareas:** registrar una cantidad en un toque, estado parcial o bloqueado, evidencia opcional, verificar.
4. **Registro diario:** "Cerrar día" guarda el snapshot P0/P1/P2, el score, las métricas, problemas, aprendizajes y "mañana".
5. **Progreso de meta:** ritmo requerido vs real con 6 estados y brecha diaria/semanal (§49, §62).
6. **Contrato con Obsidian:** tipos + interfaz `StrategySource` + adapter de solo lectura (stub con fixtures), sin integración frágil.
7. **Arquitectura Claude:** las propuestas se guardan como `decisions(status='propuesta')`; solo el usuario aprueba; la META queda fuera de su alcance por código.

## 6. A ELIMINAR

**Nada se borra en esta fase.** Se degrada o se esconde:
- Tarjetas "¿Qué cambió?", "Capacidad", "Registrar tiempo", "SER/HACER/TENER" y "Agenda" → salen de la vista por defecto de HOY (siguen en sus páginas o en el bloque colapsado).
- `/dashboard` general → deja de ser la entrada; sigue accesible desde "Más".
- 9 ítems de navegación → pasan a "Más".
- Candidato a retiro **futuro** (no ahora): `tasks.priority` alta/media/baja una vez que `tier` lo reemplace en el motor.

---

## 7. MODELO DE DATOS PROPUESTO (solo deltas, migración `0017_execution_os.sql`)

| Entidad | Cambio | Por qué no se reutiliza algo existente |
|---|---|---|
| `tasks` | `+ tier` (`p0`/`p1`/`p2`). Por defecto se deriva de `lever`: outbound/follow_up/sales_call/offer/delivery → p0; study/build/validation → p1; el resto → p2. Editable. | P0/P1/P2 es una categoría; no es la prioridad alta/media/baja |
| `tasks` | `+ target_qty`, `actual_qty` (numeric), `unit` (text) | Tareas cuantificables (30 contactos, 90 min) |
| `tasks` | `status` += `partial`, `blocked` (`waiting` se muestra como bloqueada). **`overdue` es derivado** (`deadline < hoy` y no terminada): nunca se guarda y nunca significa "fallida". **`verified`** = `verified_at` no nulo. | Un estado "vencida" guardado se perdería al completarla tarde |
| `tasks` | `+ executed_on date` (fecha real), `+ verified_at`, `+ evidence jsonb` (`{source, note, url}`) | Fecha objetivo ≠ fecha real; evidencia (§27) |
| `habits` | `+ tier` | Hábitos subordinados a P0 (§52) |
| `goals` | `+ locked_at timestamptz` | Bloqueo de meta (§11) |
| **`decisions`** (nueva) | `number`, `date`, `problem`, `evidence`, `diagnosis`, `hypothesis_id?`, `change`, `reason`, `expected_result`, `actual_result`, `status` (propuesta / aprobada / rechazada / modificada / implementada / evaluada), `proposed_by` (user / claude), `approved_at`, `entity_type`, `entity_id`, `before jsonb`, `after jsonb` | `knowledge_items` no tiene ciclo de vida ni before/after. Una sola tabla cubre la auditoría (§100), el cambio de meta (§11) y las propuestas de Claude (§20) |
| `reviews` diaria | `content` v2: `{v:2, energy, focus, note, tiers:{p0:{planned,done},p1,p2}, execution_score, minutes_worked, metrics:{key:{target,actual,source,quality}}, problems[], blockers[], learnings[], evidence[], tomorrow[], closed_at}` | Evita crear una tabla `daily_logs` paralela. Snapshot inmutable al cerrar el día |
| `metrics-registry.ts` | `+ category` (input / process / output / outcome) + claves `contacts`, `followups`, `replies`, `meetings_booked`, `meetings_held`, `proposals`, `closes`, `deep_work_minutes` | Mantener separadas las 4 categorías (prompt §15) |
| SISTEMAS (L2) | ~~Solo tipo TS, sin tabla~~ **REVOCADO (2026-10-06):** tabla `systems` en la Fase A. Ver `SPEC-MATRIX.md` | La spec es el contrato: una entidad estructural no se pospone por no tener pantalla |

Tipos de dominio (`lib/domain/*.ts`, sin I/O): `Goal`, `Objective`, `System`, `Project`, `Task`, `TaskStatus`, `Tier`, `DailyLog`, `Metric`, `MetricCategory`, `Habit`, `Hypothesis`, `Experiment`, `Decision`, `IdentityRule`, `Sop`. `lib/data/*` convierte las filas de Supabase a estos tipos; la UI y los motores solo consumen dominio.

## 8. ARQUITECTURA

```text
OBSIDIAN (estrategia, memoria)    SUPABASE (verdad operativa)              CLAUDE (análisis)
  StrategySource (lectura) ──┐     tasks · reviews · metrics · decisions    lee: motores + StrategySource
  ExecutionSink (export)  ◄──┼──────────────────────────────────────►      escribe: decisions(status='propuesta')
                             ▼                                              NUNCA: metas con locked_at
                 lib/domain/*  ←  lib/data/* (mapeo)  ←  lib/engine/* (puros)
                             ▼
                 /dashboard/today (HOY v2)
```

### 8.1 HOY v2

```text
META ACTIVA 🔒  20.000.000 COP · D-86 · ███░░ 12% · ATRASADO (requerido X/día · real Y/día)
OBJETIVO ACTUAL: Primer cliente VANT (L1)
──────────────────────────────────────────────
HOY · Ejecución 63%      P0 ████████░░  P1 ████░░  P2 ░░
P0 — CRÍTICO
  ○ Contactar prospectos   17/30   [+1][+5]
  ○ Follow-ups              4/10   [+1][+5]
  ○ Gestionar respuestas           [✓]
  ○ Sales call                     [✓]
P1 — CAPACIDAD
  ○ Deep work              45/90 min [+15]
  ○ Entrenamiento                  [✓]
P2 ▸ (colapsado)
──────────────────────────────────────────────
Plan · Métricas · Capacidad · Insights — colapsado hasta completar P0
(P0 = 100% → "✓ MISIÓN PRINCIPAL COMPLETADA", se expande)
[Cerrar día]
```

Mobile-first: una columna, objetivos táctiles ≥ 44 px, contadores sin formulario y actualización optimista.

### 8.2 Navegación
`Hoy · Tareas · Proyectos · Meta · Métricas · Revisiones` + `Más ▾` (Plan, Capacidad, Tiempo, Asistente, Hábitos, Conocimiento, Agencia, Finanzas, Insights, Dashboard). En móvil: barra inferior con los 4 primeros y "Más".

### 8.3 Bloqueo de meta
- La North Star se muestra con 🔒. El formulario normal **no permite** editar target, deadline ni unidad, ni cambiar la North Star, si `locked_at` está definido.
- Flujo "Cambiar meta": motivo obligatorio → snapshot before/after → fila en `decisions` (`proposed_by='user'`) → se vuelve a bloquear.
- `current_value` sigue siendo editable: es un dato, no la meta.

### 8.4 Contrato con Obsidian
```ts
interface StrategySource {   // Obsidian → App (lectura)
  getGoal(); getObjectives(); getSystems(); getProjects(); getHypotheses();
  getExperiments(); getDecisions(); getSops(); getIdentityRules();
}
interface ExecutionSink {    // App → Obsidian (ya existe parcialmente en scripts/export-obsidian.mjs)
  writeDailyLog(log); writeWeeklyReview(r); writeDecision(d);
}
```
- Implementaciones: `SupabaseStrategySource` (por defecto), `FixtureStrategySource` (tests) y `ObsidianStrategySource` (**solo stub y parser de frontmatter; no se conecta en esta fase**).
- Mapeo configurable de carpeta lógica → ruta física (`META, OBJECTIVES, SYSTEMS, PROJECTS, HYPOTHESES, EXPERIMENTS, METRICS, DAILY_LOGS, WEEKLY_REVIEWS, DECISIONS, SOPS, IDENTITY, REVOLUTION, IDEAS`). Propuesta por defecto: `PERSONAL-OS/00_META … 13_IDEAS` (estructura del prompt, que agrega HYPOTHESES respecto de la spec §73), con alias para lo que ya existe (`Core/` → HYPOTHESES, `Experiments/` → EXPERIMENTS, `01_Fundamentos Revolution` → REVOLUTION).
- Fuente de verdad (§121): la definición de la meta vive en la App, bloqueada; tareas y métricas en Supabase; narrativa y SOPs en Obsidian. Por ahora el export es unidireccional; la lectura llega en V3.

### 8.5 Claude
- Niveles de permiso (§99) como constante en código; el asistente actual está en el nivel 1–2.
- Nueva acción `proposeDecision()`: Claude solo crea `decisions` con `status='propuesta'`. Aprobar requiere un clic del usuario. Las metas con `locked_at` están en una lista de denegación que se verifica en el servidor.
- HOY no depende de Claude (§102).

## 9. PLAN DE IMPLEMENTACIÓN (un commit por paso, cada uno con `npm run check` en verde)

| # | Commit | Contenido | Hecho cuando |
|---|---|---|---|
| 0 | docs | `AUDIT.md`; renombrar la spec a `PERSONAL-OS-SPEC.md` | Aprobado por ti |
| 1 | modelo | Migración 0017 + guardas RLS; `lib/domain/*`; `paceStatus()`, `executionScore()`, `taskProgress()`, `isOverdue()` con tests | Tests en verde; el banner detecta la 0017 |
| 2 | HOY v2 | `today/page.tsx` según §8.1; `/` → HOY; navegación §8.2 | En < 10 s se responden las 6 preguntas |
| 3 | ejecución de tareas | `+1/+5`, parcial, bloqueada, evidencia, verificar; tier y cantidad en el formulario | Registrar una acción ≤ 2 toques en móvil |
| 4 | cerrar día | Registro diario v2 (snapshot) + vista en Revisiones | Un día cerrado queda inmutable y consultable |
| 5 | meta: bloqueo + ritmo | `locked_at`, flujo de cambio con decisión, 6 estados de ritmo, brecha diaria/semanal | La meta no se edita sin motivo; el cambio queda registrado |
| 6 | demo VANT | Seed `is_demo` con escenario VANT y etiqueta "DEMO" visible | `seed:reset` lo borra sin tocar datos reales |
| 7 | contrato Obsidian | Interfaces, sources Supabase/Fixture, stub de Obsidian, mapeo de carpetas | Tests del parser; HOY funciona sin bóveda |
| 8 | Claude | `proposeDecision`, cola de propuestas en Revisiones, denegación sobre la meta | Claude no cambia nada sin tu clic |

**Fuera de alcance** (prompt §26): sincronización real con Obsidian, agente autónomo, predicción, iPhone, dashboards nuevos, gamificación.

## 10. DECISIONES PENDIENTES (tuyas)

1. **META 🔒:** ¿20.000.000 COP acumulados al 2026-12-31 (con "primer cliente" como objetivo L1) o "primer cliente VANT" como meta bloqueada?
2. **Tier por defecto:** ¿derivado de la palanca (editable) o siempre manual?
3. **Bloqueo visual:** ¿solo colapsar (recomendado en v1) o bloquear la navegación mientras P0 < 100%?
4. **Cantidades P0:** "Contactar 30" ¿se alimenta de `prospecting_sessions`/`leads` (una sola fuente de verdad, recomendado) o es un contador independiente en la tarea?
