# SPEC-MATRIX — `PERSONAL-OS-SPEC.md` → implementación actual → gaps

**Fuente de control de implementación.** Fecha: 2026-10-06 · Rama `dev` @ `39a574a`.
Regla: `PERSONAL-OS-SPEC.md` es el contrato. Ninguna entidad estructural se elimina, se fusiona ni se pospone por no tener pantalla. Si una parte de la spec debería cambiar, se propone en §4 y espera aprobación.

Leyenda de la columna **¿Cumple?**: ✅ cumple · 🟡 parcial · ❌ no existe.
La columna **Fase** indica dónde se cierra el gap: A modelo · B execution engine · C intelligence · D integración.

> Revocado de `AUDIT.md`: *"SISTEMAS sin tabla por ahora"*. Los Sistemas entran en el modelo y en Supabase en la Fase A.

---

## 1. Matriz principal

| Elemento del SPEC | ¿Existe? | ¿Dónde existe? | ¿Cumple? | ¿Qué falta? | Fase |
|---|---|---|---|---|---|
| **Meta (L0)** §10–11 | Sí | `goals` + `profiles.north_star_goal_id`; `gap.ts` | 🟡 | **Bloqueo** (`locked_at`) y flujo de cambio con motivo, snapshot y decisión (§11). Faltan campos: KPI, fórmula/`metric_key`, criterio de éxito, criterio de fracaso, versión (§101). Hoy el progreso de la meta VANT está atado a `isVantRevenueGoal` y no a una fórmula declarada. | A (modelo) · B (UI del bloqueo) |
| **Objetivos (L1)** §12–13 | Parcial | Sub-metas `goals.parent_goal_id` (`kind='metric'`) | 🟡 | No hay distinción explícita entre meta y objetivo (son la misma fila sin nivel). Falta la relación "qué debe ser matemáticamente cierto" (fórmula que conecta el objetivo con la meta). Ver propuesta P-1. | A |
| **Sistemas (L2)** §23 | **No** | — | ❌ | Entidad completa: nombre, tipo (adquisición, ventas, fulfillment, aprendizaje, salud, financiero, universitario, revisión), propósito, objetivo/meta a la que sirve, estado, funnel asociado, métricas clave, SOPs, responsable. Relaciones: `projects.system_id`, `tasks.system_id`, `habits.system_id`, `funnels.system_id`. | A |
| **Proyectos (L3)** §24 | Sí | `projects` (title, description, goal_id, status, priority, deadline); `milestones` (sin uso) | 🟡 | `system_id`, `objective_id`, propósito, `start_date`, responsable, criterios de éxito, dependencias entre proyectos. Empezar a usar `milestones`. | A |
| **Milestones** §24, §65 | Tabla sí, uso no | `milestones` | 🟡 | Server actions de lectura/escritura y relación visible con el proyecto. | A (CRUD mínimo) |
| **Tareas (L4)** §25–27 | Sí | `tasks` (+ goal_id, lever, impact, effort, execution_mode, estimated_minutes, deadline, scheduled_date, completed_at) | 🟡 | Cantidad esperada/real y unidad; `system_id`; requisito de evidencia; criterio de finalización; nivel P0/P1/P2; estados de §26 (ver fila siguiente); fecha real de ejecución; verificación. | A (modelo) · B (UI) |
| **Estados de tarea** §26 | Parcial | `tasks.status`: inbox, next, today, in_progress, waiting, done, cancelled | 🟡 | Faltan PARTIALLY_COMPLETED, VERIFIED, BLOCKED (hoy `waiting`) y OVERDUE (derivado; nunca equivale a "no realizada"). Ver P-2 para el mapeo de los estados de planificación (inbox/next/today). | A |
| **Evidencia** §27, §65 | No | — | ❌ | Entidad `evidence`: objetivo, real, fuente (§68), verificado sí/no, url o nota, enlace polimórfico (tarea, métrica, registro diario). | A |
| **Prioridad P0/P1/P2** §28 | No | `tasks.priority` alta/media/baja; `priority.ts` (score) | ❌ | `tier` en tareas y hábitos. El score queda para ordenar **dentro** de cada nivel. | A · B |
| **Target Lock / Park it** §29 | No | — | ❌ | Toda actividad nueva debe declarar su contribución a la meta; si no hay una clara, va a Ideas (aparcada). Modelo: `goal_id`/`system_id` requerido o envío a `ideas`. | A (modelo) · B (regla en el formulario) |
| **Ejecución diaria** §34–35, §63 | Parcial | `/dashboard/today`, `lib/data/today.ts`; `reviews(type='diaria')` con energía, enfoque, progreso y nota | 🟡 | Entidad DAILY_LOG completa: misión de hoy, P0/P1 planeado vs hecho, tabla de métricas objetivo/real, % de ejecución P0, problemas, aprendizajes, evidencia, mañana, notas. Cierre del día como snapshot inmutable. Ver P-3. | A (modelo) · B |
| **UX centrada en HOY / bloqueo visual / día completo** §30–32, §61, §94 | Parcial | HOY con 10 tarjetas; `/` → `/dashboard` | 🟡 | Jerarquía de §94 (meta → misión → P0 → P1 → cuello de botella → métricas → resto). Ocultar lo secundario mientras P0 esté incompleto; "DAY COMPLETE ✓" desbloquea lo demás; Hard Mode configurable. | B |
| **Revisión nocturna** §33 | Parcial | Check-in diario | 🟡 | Ventana nocturna: revisar métricas, roadmap, experimentos, ideas, decisiones y mañana; desalentar cambios estratégicos durante los bloques de ejecución. | B · C |
| **Score de ejecución** §50 | No (como métrica) | `rollup.ts` tiene tasksDone/tasksScheduled | 🟡 | `executionScore()` = requeridas completadas ÷ planificadas, por día y por nivel, separado siempre del progreso de la meta. | B |
| **Ritmo requerido / actual** §47 | Sí | `gap.ts`: requiredPerDay, actualPerDay, projectedAtDeadline | 🟡 | Ritmo semanal y mensual; ritmo por métrica de input (contactos/día), no solo de outcome. | B |
| **Estado del ritmo** §48 | Parcial | `onTrack: boolean` | 🟡 | 6 estados: muy adelantado, adelantado, en ritmo, ligeramente atrasado, atrasado, críticamente atrasado (umbrales configurables). | B |
| **Costo de oportunidad / feedback conductual** §49, §62 | Parcial | `allocation.ts` (execution gap de ventas) | 🟡 | Brecha diaria y brecha proyectada a 7 días por métrica de input. | B |
| **Datos / Métricas** §36, §54, §68–69 | Parcial | `metrics-registry.ts` (7 claves de tasas/ingresos); eventos en `prospecting_sessions`, `leads`, `time_entries`, `habit_logs`, `vant_clients` | 🟡 | Entidad METRICS: definición con categoría input/output/outcome (ver P-4), registros de valores (`metric_entries`) con **fuente** (MANUAL, APP, CRM, CALENDAR, HEALTH, SCREEN_TIME, API, IMPORT, CLAUDE, OBSIDIAN) y **calidad** (VERIFICADO, AUTORREPORTADO, ESTIMADO, INCOMPLETO, FALTANTE). Dato faltante ≠ 0. Faltan las métricas iniciales de VANT del registro: contactos, follow-ups, citas atendidas, propuestas, cierres. | A |
| **Funnels / modelos por canal** §13–14, §117–118 | Parcial | Un embudo outbound fijo (reply → booking → show → close) en `reverse.ts`; embudo de campañas aparte | 🟡 | Entidad FUNNELS: un modelo por canal (cold calling, cold email, social outbound, Meta Ads, Google Ads, referidos) con etapas configurables, ligado a un Sistema. El motor inverso debe leer las etapas del funnel en lugar de tenerlas hardcodeadas. | A (modelo) · C (motor genérico) |
| **Matemática de la meta** §13 | Sí (outbound) | `reverse.ts`, `plan.ts` (Poisson, sensibilidad) | 🟡 | Generalizar a cualquier funnel (depende de FUNNELS). | C |
| **Hipótesis** §15–16, §19 | Sí | `hypotheses` (type, statement, market, icp, problem, channel, scores, confidence 0–100, evidence, source, status, superseded_by) | 🟡 | Faltan: meta relacionada, oferta, mecanismo, inputs esperados, tasas esperadas, outputs, ingresos esperados, timeline, supuestos, riesgos, criterios de validación y fracaso. La confianza es numérica y la spec pide BAJA/MEDIA/ALTA/VALIDADA/INVALIDADA. Versión (§101). | A |
| **Escenarios** §16–17 | Parcial | Un solo set en `agencia_settings.funnel_assumptions` | 🟡 | BEAR/BASE/BULL/ACTUAL por hipótesis; ACTUAL reemplaza gradualmente a los supuestos. | A (modelo) · C (cálculo) |
| **Tipos de supuesto** §18 | Parcial | `rates.ts`: historical / estimate / historical_low_n / missing | 🟡 | Cuatro tipos explícitos (CONOCIDO, ESTIMADO, ASUMIDO, DESCONOCIDO) almacenados por supuesto. | A |
| **Roadmap / fases** §20–22 | Parcial (calculado) | `plan30.ts` genera fases dinámicas (no se guardan) | 🟡 | Entidad roadmap con fases: objetivo, inicio, final esperado, criterios de entrada y salida, KPIs, dependencias, riesgos, experimentos; versionado (Roadmap v1, v2). Ver P-5 (§65 no lo lista como entidad). | A |
| **Análisis / diagnóstico** §37, §39, §51 | Parcial | `bottleneck.ts`, `rollup.ts` | 🟡 | Árbol de §39 completo: problema de **ejecución** (score < objetivo) antes que de volumen y conversión; problemas de estrategia, capacidad y mercado (§51); escenario D (ejecución > 90% con output bajo → no recomendar "trabajar más"). | C |
| **Bottleneck** §38 | Sí | `bottleneck.ts` (6 tipos, muestra mínima, observación ≠ hipótesis) | 🟡 | Un solo cuello principal con evidencia, esperado vs actual y prioridad; persistirlo por semana. Falta el cuello "problema de ejecución". | C |
| **Experimentos** §40–42 | Sí | `experiments` (hypothesis_id, metric_key ∈ 4 tasas, variants, sample_target, fechas, status, decision keep/change/inconclusive, learning) | 🟡 | Faltan: problema, observación, variable, baseline, objetivo, duración, acción, resultado, conclusión, actualización de SOP, ventana de observación, umbrales de éxito y fracaso. `metric_key` limitado a 4 tasas. Enlace a la decisión resultante. | A (modelo) · C (lógica) |
| **Decisiones** §43–44 | Parcial | `knowledge_items(kind='decision')` + `knowledge_links` (los aprendizajes de experimentos se guardan así) | 🟡 | Entidad DECISIONS: número, fecha, problema, evidencia, diagnóstico, hipótesis, cambio propuesto, razón, impacto esperado, aprobado por, fecha de implementación, resultado, conclusión, seguimiento; estados PROPUESTA → APROBADA / RECHAZADA / MODIFICADA → IMPLEMENTADA → EVALUADA; before/after. | A |
| **Revisiones** §45–46 | Parcial | `reviews` (diaria, semanal, mensual, trimestral); `rollup.ts` con snapshot semanal inmutable | 🟡 | Estructura de 12 secciones (§46): estado de la meta, ritmo, ejecución, funnel, proyectos, cuello de botella, causa raíz, experimentos, recomendación, plan de la próxima semana, qué dejar de hacer, decisiones que requieren aprobación. Hoy faltan proyectos, causa raíz, experimentos, recomendación, dejar de hacer y decisiones. | A (modelo) · C |
| **SOPs** §75–76 | **No** | — | ❌ | Entidad SOPS: id, nombre, propósito, cuándo usarlo, inputs, pasos, output esperado, KPIs, errores frecuentes, versión, experimento de origen; ligada a un Sistema. Ciclo experimento → éxito → SOP. | A |
| **Identidad (L-1)** §9 | Parcial | `vision` (statement, principles, core_values, avoid) | 🟡 | Entidad IDENTITY_RULES: reglas conductuales medibles (p. ej. "Ejecuto P0 antes que lo opcional") con la métrica que las verifica. | A |
| **Hábitos** §52–53 | Sí | `habits`, `habit_logs` (value), `habits.ts` | 🟡 | `tier` P0/P1/P2, `system_id`, fuente del dato (automática/manual) y calidad. | A |
| **Metas secundarias / desbloqueo** §56–58 | Parcial | `goals.status`: activo, pausado, cumplido, cancelado | 🟡 | Estados BLOQUEADA, EN COLA, ACTIVA, COMPLETADA, ARCHIVADA; reglas de activación con umbrales configurables. | A (modelo) · C (regla) |
| **Banco de ideas** §59 | Tabla sí, uso no | `inbox_items` (sin lector ni escritor) | ❌ | Entidad IDEAS con estados IDEA → RECHAZADA / POSPUESTA / PROYECTO / EXPERIMENTO / TAREA / CANDIDATA A META. Ver P-6. | A |
| **Time blocks / capacidad** §82, §65 | Sí | `capacity_blocks`, `capacity.ts`, `time_entries` | ✅ | Validación de "PLAN INVÁLIDO" cuando las horas requeridas superan las disponibles: parcial en `plan.ts` (factibilidad). | — |
| **Restricciones financieras / riesgos** §81–84 | Parcial | `transactions`, `financial_accounts`, `debts` (sin uso) | 🟡 | Fuera del MVP según §87–91. Se conservan las tablas; solo se agregan campos de riesgo en hipótesis. | A (riesgos en hipótesis) |
| **Integridad / auditabilidad / versionado** §67, §100–101 | Parcial | `created_at`/`updated_at`; `activity_logs` (motivos de omisión); `hypotheses.superseded_by` | 🟡 | `source`, `author` (user/claude/system) y `version` en entidades estratégicas (meta, hipótesis, roadmap, SOP); before/after de cada cambio importante (vía `decisions` + `activity_logs`). | A |
| **Obsidian** §7, §73–74, §120–123 | Parcial | `scripts/export-obsidian.mjs` → `VANT_Brain/Personal OS (sync)/` (hipótesis, experimentos, revisiones, aprendizajes) | 🟡 | Contrato: fuente de verdad por tipo (§121), IDs estables compartidos (frontmatter `pos_id`), dirección y frecuencia de sincronización, resolución de conflictos (§123), estructura de carpetas (§73, ver P-7), nota diaria (§74), adapter de lectura. | A (contrato y tipos) · D (sincronización) |
| **Revolution Academy** §71–72 | Parcial | Notas en la bóveda `01_Fundamentos Revolution` | 🟡 | Fuente de conocimiento separada, con prioridad inferior a los datos reales; Claude la cita como PRINCIPIO, distinta de HECHO e INFERENCIA. | A (tipo de fuente) · D |
| **Claude** §6, §20, §70–71, §78, §99 | Sí (asistente) | `/dashboard/asistente`; `engine-context.ts`; `message_type` (dato, suposición, hipótesis, decisión, resultado, recomendación); solo escribe en `ai_messages` | 🟡 | Niveles de permiso 0–5 como política en código; propuestas como `decisions(status='propuesta')` con aprobación humana; la meta siempre fuera de su alcance; contexto ampliado (decisiones, SOPs, Obsidian, Revolution); etiqueta PRINCIPIO de Revolution. | A (permisos y contrato) · C (propuestas) |
| **Seguridad** §98 | Sí | RLS en todas las tablas, API key solo en el servidor, guardas en `migrations.test.ts` | ✅ | Mantener: toda tabla nueva lleva RLS (el test lo exige). | — |
| **Modo degradado** §102–103 | Sí | El asistente se carga de forma perezosa; HOY no depende de la IA | ✅ | Mantener: HOY no puede depender de Obsidian. | — |
| **Notificaciones** §96 | Tabla sí, uso no | `notifications` | ❌ | V4 (§90). Se conserva la tabla. | Post-MVP |
| **Automatización** §53–55, §90 | No | — | ❌ | V4 (§90). El modelo de fuente de datos (§68) queda preparado en la Fase A. | Post-MVP |
| **Capa predictiva** §79, §91 | Parcial | `projectedAtDeadline`, Poisson en `reverse.ts` | 🟡 | V5. Sin trabajo ahora. | Post-MVP |

---

## 2. Entidades de §65 → tabla física

| Entidad SPEC §65 | Hoy | Propuesta Fase A |
|---|---|---|
| GOALS | `goals` | Extender (lock, KPI, fórmula, criterios, versión, estados §56) |
| OBJECTIVES | sub-filas de `goals` | Ver **P-1** |
| SYSTEMS | — | **Crear `systems`** |
| PROJECTS | `projects` | Extender (system_id, objective_id, propósito, inicio, responsable, criterios) + `project_dependencies` |
| MILESTONES | `milestones` (sin uso) | Reutilizar |
| TASKS | `tasks` | Extender (tier, cantidades, estados, system_id, evidencia requerida, criterio de finalización, executed_on, verified_at) |
| DAILY_LOGS | `reviews(type='diaria')` | Ver **P-3** |
| HABITS / HABIT_LOGS | `habits` / `habit_logs` | Extender (tier, system_id, fuente) |
| METRICS | registro en código + tablas de eventos | **Crear `metric_definitions` + `metric_entries`** (fuente, calidad). Los eventos actuales se mantienen como fuente APP |
| FUNNELS | hardcodeado en `reverse.ts` | **Crear `funnels`** (system_id, canal, etapas jsonb) |
| HYPOTHESES | `hypotheses` | Extender (§15 + escenarios + supuestos tipados + versión) |
| EXPERIMENTS | `experiments` | Extender (§40, §42) |
| DECISIONS | `knowledge_items(kind='decision')` | **Crear `decisions`**; migrar las filas existentes conservando el enlace |
| REVIEWS | `reviews` | Extender `content` semanal a las 12 secciones (§46) |
| SOPS | — | **Crear `sops`** |
| IDEAS | `inbox_items` (sin uso) | Ver **P-6** |
| IDENTITY_RULES | `vision.principles` (jsonb) | **Crear `identity_rules`** (conservar `vision` como declaración) |
| TIME_BLOCKS | `capacity_blocks` | Reutilizar (sin cambios) |
| EVIDENCE | — | **Crear `evidence`** (polimórfica) |
| *(Roadmap §20)* | `plan30.ts` (calculado) | Ver **P-5** |

Tipos de dominio TS (`lib/domain/*`): uno por cada entidad anterior, incluido `System`. Mapeo fila ↔ dominio en `lib/data/*`.

---

## 3. Ejemplo de jerarquía VANT (verificación del modelo)

```text
META 🔒   Facturar 5.000 USD acumulados antes del 2026-12-31          goals (level=meta, locked_at)
└ OBJETIVO  Cerrar ≥ 4 clientes de 1.000 USD                            objectives / goals(level=objective)
  └ SISTEMA   Sistema de adquisición de clientes VANT (recurrente)        systems (type=acquisition) ─ funnel: social/cold outbound
    └ PROYECTO  Implementar el sistema de adquisición para abogados de familia (temporal)  projects.system_id
      └ TAREAS    Crear prospectos · Contactar prospectos (30/día) · Follow-ups · Llamadas · Propuestas  tasks.system_id, tier=p0, target_qty
```

⚠️ **Conflicto de datos:** la meta registrada el 2026-09-23 (`ARQUITECTURA §9.4`) es **20.000.000 COP**; tu ejemplo dice **5.000 USD** con 4 × 1.000 USD. No cambio la meta guardada sin tu confirmación (§11): si es la nueva meta, el cambio debe pasar por el flujo de cambio de meta y quedar registrado como Decisión #001.

---

## 4. Propuestas de modificación o interpretación del SPEC (esperan aprobación)

| # | Elemento del SPEC | Problema detectado | Propuesta | Impacto | Razón |
|---|---|---|---|---|---|
| P-1 | OBJECTIVES (§12, §65) | Hoy los objetivos son filas de `goals` sin nivel, así que meta y objetivo no se distinguen | **Opción a (recomendada):** tabla propia `objectives` (goal_id, título, target, actual, unidad, deadline, fórmula). **Opción b:** `goals.level in ('meta','objective')` | a: migrar las sub-metas actuales con `parent_goal_id` a `objectives`; actualizar `priority.ts` (`descendsFrom`) y `plan.ts` | La spec trata Meta y Objetivo como capas distintas; con una tabla propia la jerarquía no depende de una convención |
| P-2 | Estados de tarea (§26) | Los estados actuales inbox/next/today son de **planificación**, no de ejecución; la spec no los contempla | Separar dos campos: `status` = estados de §26 y `plan_state` = inbox/next/today (opcional). OVERDUE se **deriva** y no se guarda | Migración de datos: done→completed, waiting→blocked, inbox/next/today→pending + plan_state | Guardar OVERDUE contradice "vencida no significa no realizada": la tarea perdería su estado real |
| P-3 | DAILY_LOGS (§35, §65) | Hoy viven en `reviews(type='diaria')` como jsonb | Tabla propia `daily_logs` (una por fecha) con columnas tipadas + `daily_log_metrics`; migrar los check-ins existentes | Cambia `checkin.ts`, el rollup y el export | Es una entidad de §65 y Claude debe poder consultarla por columnas, no dentro de un jsonb |
| P-4 | Input / Output / Outcome (§36) | La spec define 3 niveles; tu prompt agrega **Proceso** (respuestas, reuniones, propuestas) y mueve cierres e ingresos a Output | Adoptar 4 categorías: INPUT (contactos, follow-ups, horas) → PROCESO (respuestas, calificados, reuniones, propuestas) → OUTPUT (cierres, clientes, ingresos) → OUTCOME (progreso de la meta), y actualizar §36 | Solo afecta a la categoría del registro de métricas | Separa conversión intermedia de resultado; el diagnóstico de §37 se vuelve más preciso |
| P-5 | Roadmap (§20–22) | Definido y versionado (§101), pero ausente de la lista de entidades de §65 | Agregar ROADMAP_PHASES a §65 y crear la tabla `roadmap_phases` (goal_id, hypothesis_id, version, criterios de entrada/salida…); `plan30.ts` propone fases y el usuario las aprueba | Tabla nueva; `plan30` pasa de ser la fuente a ser un generador de propuestas | Sin persistencia no hay criterios de salida verificables ni versiones |
| P-6 | IDEAS (§59) | Existe `inbox_items` sin uso, con otro nombre | Crear `ideas` con los estados de §59 y dejar `inbox_items` dormida (o renombrarla, si lo prefieres) | Tabla nueva o renombre | El nombre de la entidad debe coincidir con la spec |
| P-7 | Estructura de Obsidian (§73) | La spec no tiene carpeta de HIPÓTESIS (las hipótesis son entidad de §15/§65); el prompt sí; la bóveda real usa `Core/`, `Experiments/`… | Actualizar §73 a `00_META, 01_OBJECTIVES, 02_SYSTEMS, 03_PROJECTS, 04_HYPOTHESES, 05_EXPERIMENTS, 06_METRICS, 07_DAILY_LOGS, 08_WEEKLY_REVIEWS, 09_DECISIONS, 10_SOPS, 11_IDENTITY, 12_REVOLUTION, 13_IDEAS` dentro de `PERSONAL-OS/`, con mapeo configurable a las carpetas existentes sin moverlas | Solo afecta al contrato y al export | Cada entidad de §65 que vive en Obsidian (§121) necesita una carpeta |
| P-8 | Nombre del archivo y entregable (§109) | La spec pide `REPOSITORY-AUDIT.md`; el archivo de spec se llama `PERSONAL-OS-SPEC.md.md` | Renombrar la spec a `PERSONAL-OS-SPEC.md`; `AUDIT.md` + esta matriz cumplen §109 | Ninguno | Coherencia de referencias |
| P-9 | Stack (§64: shadcn/ui) | El repo usa un kit propio equivalente | Mantener el kit propio y registrarlo como decisión | Ninguno | §64 dice "reutilizar la app existente"; migrar el kit no aporta ejecución |

---

## 5. Orden de implementación (Fases A → D)

> **Estado de aprobación (2026-10-06):** P-1 a P-15 aprobadas (spec §130). El orden detallado de la Fase A es el de **`PHASE-A-DESIGN.md §8` (A1–A8)** y reemplaza la lista A1–A5 de abajo, que se conserva solo como historial.

**Fase A — Modelo completo** (sin UI nueva salvo CRUD mínimo):
A1 migración `0017_spec_model.sql`: systems, funnels, decisions, sops, evidence, identity_rules, metric_definitions, metric_entries, ideas, roadmap_phases, project_dependencies, (objectives, daily_logs según P-1/P-3) + extensiones de goals, projects, tasks, habits, hypotheses, experiments; todo con RLS y en las guardas de `migrations.test.ts`.
A2 `lib/domain/*`: tipos de las 20 entidades + enums (TaskStatus, Tier, MetricCategory, DataSource, DataQuality, DecisionStatus, GoalState, ConfidenceLevel, AssumptionType, PaceStatus).
A3 `lib/data/*`: mappers fila ↔ dominio; server actions CRUD mínimas (systems, sops, decisions, evidence, identity_rules, ideas, milestones).
A4 contrato Obsidian (`StrategySource`, `ExecutionSink`, IDs estables, tabla de fuente de verdad, reglas de conflicto) y política de permisos de Claude (niveles 0–5) como código y tests, **sin sincronizar todavía**.
A5 seed demo VANT (`is_demo`) que recorre meta → objetivo → sistema → proyecto → tareas.

**Fase B — Execution Engine:** HOY v2, P0/P1/P2, tareas cuantificables, ritmo y sus 6 estados, score de ejecución, evidencia, estados, registro diario, bloqueo de meta en la UI.

**Fase C — Intelligence:** árbol de diagnóstico completo, cuello de botella persistido, experimentos completos, motor de funnels genérico, decisiones con ciclo de vida, propuestas de Claude con aprobación, revisión semanal de 12 secciones.

**Fase D — Integración:** sincronización Obsidian ↔ Supabase según el contrato de A4 (IDs, conflictos, permisos, aprobación humana).

Cada paso es un commit con `npm run check` en verde y esta matriz actualizada (columna ¿Cumple?).
