# FASE A — Diseño del modelo estructural (para revisión, sin implementar)

Fecha: 2026-10-06 · Contrato: `PERSONAL-OS-SPEC.md` · Control: `SPEC-MATRIX.md`.
**Objetivo de la Fase A:** construir el modelo estructural completo y dejarlo preparado para que una estrategia, hipótesis, plan o roadmap pueda convertirse en estructura operativa. El camino es: entrada libre → interpretación → propuesta → aprobación humana → entidades reales. No se trata de "crear las tablas que faltan".

Las propuestas nuevas que no están en la spec van numeradas **P-10 … P-15** (continúan las P-1 … P-9 de `SPEC-MATRIX.md §4`) y **esperan aprobación**.

---

## 1. ¿El modelo actual (más el de SPEC-MATRIX) soporta el flujo?

| Paso del flujo | ¿Soportado? | Qué lo impide |
|---|---|---|
| Entrada humana libre o documento | ❌ | No hay entidad que guarde la fuente |
| Interpretación | ❌ | No hay registro de qué se interpretó, con qué versión de modelo ni con qué ambigüedades |
| Entidades propuestas (no reales todavía) | ❌ | Hoy todo se escribe directo en las tablas reales. Una interpretación ambigua se volvería realidad sin rastro |
| Aprobación humana | 🟡 | `decisions` (Fase A) registra el porqué, pero no hay un mecanismo para aplicar un conjunto de cambios atómico |
| Trazabilidad entidad → origen | ❌ | Ninguna tabla guarda de qué fuente, importación o propuesta nació |
| Sistema que genera ejecución recurrente | ❌ | Un Sistema es recurrente (§23), pero nada produce las tareas diarias a partir de él. `tasks.recurrence` existe sin uso. Sin esto tendrías que crear las tareas a mano cada día |
| Experimento que modifica la ejecución (30 → 60/día) | ❌ | `experiments` no sabe qué parámetro de la ejecución cambia, ni durante cuánto tiempo |
| Métricas genéricas (no solo VANT) | 🟡 | `metrics-registry.ts` y `reverse.ts` tienen claves y etapas de VANT fijas; `metric_definitions` y `funnels` (SPEC-MATRIX) lo resuelven |
| Resultado → análisis → cuello de botella → decisión | 🟡 | Los motores existen; faltan los enlaces persistidos entre experimento, resultado y decisión (SPEC-MATRIX Fase C) |

**Conclusión:** SPEC-MATRIX cubre las entidades de §65, pero **no alcanza** para la ingesta de planes. Faltan tres cosas: **(1) la capa de ingesta y propuestas**, **(2) las rutinas de los sistemas** y **(3) las intervenciones de los experimentos**, además de los **campos de origen** en todas las entidades. Las detallo abajo.

---

## 2. Capas (separación pedida)

```text
CAPA 1 — ESTRATEGIA        goals · objectives · systems · funnels · hypotheses · roadmap_phases ·
                           projects · experiments · decisions · sops · identity_rules · ideas ·
                           metric_definitions · knowledge_items
CAPA 2 — EJECUCIÓN         routines* · tasks · evidence · metric_entries · daily_logs · habits/habit_logs ·
                           time_entries · capacity_blocks · leads · prospecting_sessions (instancia VANT)
CAPA 3 — INTELIGENCIA      source_documents* · plan_imports* · change_sets* · change_items* ·
                           ai_conversations/ai_messages · motores lib/engine/*
(* = propuesta nueva)
```

Reglas:
- La Capa 3 **nunca escribe en las Capas 1 y 2**. Solo escribe en sus propias tablas (`plan_imports`, `change_sets`, `change_items`, `ai_messages`).
- Lo que pasa a las Capas 1 y 2 lo aplica **un único server action, `applyChangeSet`, que se ejecuta con la sesión del usuario después de su aprobación**.

---

## 3. Propuestas nuevas

### P-10 — Capa de ingesta: `source_documents` → `plan_imports` → `change_sets` / `change_items`

**Elemento de la spec:** no existe una entidad "Plan". Los anclajes en la spec son §20 (el roadmap se deriva de la meta y la hipótesis), §43 (PROBLEMA → … → DECISIÓN DEL USUARIO), §68 (fuentes IMPORT, CLAUDE, OBSIDIAN), §99 nivel 3 ("generar borradores de cambios") y nivel 4 ("ejecutar cambios aprobados") y §100 (auditabilidad).
**Problema:** la spec define los permisos de Claude para "borradores de cambios", pero no dónde viven esos borradores ni cómo se vinculan con su fuente.
**Propuesta:** no crear una entidad "Plan" con contenido propio. Un plan **es** el documento fuente más el conjunto de entidades que generó. Así no se duplica la estrategia en dos lugares (§122).

| Tabla | Campos clave | Para qué |
|---|---|---|
| `source_documents` | `kind` (chat_text, upload, obsidian_note, url), `title`, `content` (texto), `storage_path?`, `obsidian_path?`, `content_hash`, `created_by` | La entrada humana tal cual, inmutable. Si cambia, se crea una nueva fila (hash distinto) |
| `plan_imports` | `source_document_id`, `interpreter` (claude, template, manual), `interpreter_version` (modelo + versión de prompt), `status` (pending, interpreted, needs_input, proposed, applied, rejected, failed), `detected` jsonb (estructura reconocida), `inconsistencies` jsonb[], `questions` jsonb[] (ambigüedades que debe resolver el usuario), `context_snapshot` jsonb (meta activa y sistemas existentes en el momento de interpretar) | Una ejecución de interpretación. La misma fuente puede reinterpretarse |
| `change_sets` | `plan_import_id?` (null si el origen es una propuesta de Claude desde una revisión o un experimento), `title`, `rationale`, `proposed_by` (user, claude, system), `status` (draft, proposed, approved, partially_approved, rejected, applied, failed), `decision_id?`, `applied_at` | Un paquete de cambios que se aprueba como unidad |
| `change_items` | `change_set_id`, `seq`, `op` (create, update, archive), `entity_type`, `entity_id?` (para update/archive), `temp_ref` (p. ej. `$sys1`), `payload` jsonb (validado con el esquema zod del dominio), `before` jsonb (para update), `depends_on text[]` (temp_refs), `status` (proposed, approved, rejected, modified, applied), `sensitivity` (normal, strategic, locked), `confidence` (BAJA, MEDIA, ALTA), `assumption_type` (CONOCIDO, ESTIMADO, ASUMIDO, DESCONOCIDO; §18) | Cada objeto propuesto, con referencias temporales para enlazar objetos nuevos entre sí antes de que existan |

**Por qué un change set genérico y no tablas `proposed_objectives`, `proposed_systems`, …:** duplicar cada tabla rompería la arquitectura cada vez que se agregue un campo. El payload se valida con el **mismo esquema de dominio** que usan las tablas reales, así que una propuesta inválida no puede aprobarse.
**Impacto:** 4 tablas nuevas con RLS; un server action `applyChangeSet` (transaccional, mediante una función SQL `security invoker` para respetar RLS, aplicando en orden topológico de `depends_on`).
**Relación con `decisions`:** el change set es el **qué** (diff aplicable) y la decisión es el **porqué** (registro humano, §44). Todo change set que contenga ítems `strategic` o `locked` crea o requiere una `decision` al aprobarse. Los cambios operativos (p. ej. crear tareas del día) no la necesitan.

### P-11 — `routines`: la ejecución recurrente de un Sistema

**Elemento de la spec:** §23 ("los sistemas son mecanismos recurrentes"), §34 (modelo diario), §63 (reducción de decisiones diarias). La spec no dice cómo un sistema produce ejecución diaria.
**Problema:** sin esto, "Contactar 60 prospectos/día" tendría que crearse a mano cada día, que es justo lo que quieres evitar.
**Propuesta:** tabla `routines`: `system_id`, `title`, `metric_key` (qué mide), `target_per_occurrence`, `unit`, `cadence` (daily, weekdays, weekly, custom + `days_of_week`), `tier` P0/P1/P2, `execution_mode`, `estimated_minutes_per_unit`, `valid_from`, `valid_to`, `status`, `version`.
Cada día, un motor puro `materializeRoutines(routines, date)` genera las **instancias** en `tasks` (`routine_id`, `target_qty`), de forma idempotente (una por rutina y fecha).
`actual_qty` **no se escribe a mano en dos lugares**: se deriva de `metric_entries` (más los proveedores de la instancia, ver P-14) para ese `metric_key` y fecha. Una sola fuente de verdad.
**Relación con hábitos:** los hábitos (§52) quedan como están. Una rutina es la versión de negocio, ligada a un sistema y a una métrica. Si prefieres unificar hábitos y rutinas, dímelo; no lo fusiono por defecto (regla: no fusionar entidades de la spec).
**Impacto:** 1 tabla + `tasks.routine_id` + un motor puro con tests. HOY muestra las instancias del día.

### P-12 — Intervenciones de experimento

**Elemento de la spec:** §40 (Variable, Baseline, Objetivo, Acción, Duración), §41.
**Problema:** "60/día durante 14 días" debe **cambiar la ejecución** durante el experimento y **volver al valor anterior o mantenerse** según la decisión final. Hoy un experimento no está conectado con lo que se ejecuta.
**Propuesta:** `experiments.interventions` jsonb[]: `{target_type: 'routine', target_id, field: 'target_per_occurrence', baseline: 30, value: 60, from, to}`.
Mientras el experimento está `running`, `materializeRoutines` aplica el override. Al terminar, el experimento produce una **decisión** (mantener → la rutina se versiona con 60; revertir → queda en 30).
**Por qué no editar la rutina directamente:** se perdería el baseline y no se podría atribuir el resultado al experimento (§42, §100).
**Impacto:** una columna más la lógica en el motor de materialización.

### P-13 — Campos de origen y versión en todas las entidades de las Capas 1 y 2

**Elemento de la spec:** §67 (source, author, version, status), §100–101.
**Propuesta:** columnas comunes en todas las tablas de estrategia y ejecución nuevas o extendidas:
`origin` (manual, import, claude, system, obsidian) · `origin_change_item_id` (null si es manual) · `created_by` (user, claude, system) · `version int default 1` · `superseded_by` (en las entidades versionables: hypotheses, roadmap_phases, sops, routines, funnels, systems) · `archived_at` (soft delete; §67 "evitar modificaciones destructivas").
**Trazabilidad resultante:** entidad → change_item → change_set → plan_import → source_document (y → decision si es estratégica). Responde §100: quién, cuándo, por qué, basado en qué y cuál era el valor anterior (`change_items.before`).

### P-14 — Métricas genéricas con proveedores (desacoplar VANT)

**Elemento de la spec:** §36, §54, §68 · instrucción "VANT = instancia, no arquitectura".
**Problema (hardcodes actuales):** `metrics-registry.ts` (claves de VANT), `reverse.ts` (etapas reply → booking → show → close fijas), `plan.ts` (`isVantRevenueGoal`), `agencia_settings.funnel_assumptions`, `priority.ts` (`ACQUISITION_LEVER_WEIGHT`), `system_mode = 'agencia'`.
**Propuesta:**
- `metric_definitions` (datos, no código): `key`, `label`, `category` (input/process/output/outcome, P-4), `unit`, `aggregation` (sum, last, avg), `system_id?`, `min_sample`.
- Valor de una métrica en un período = `metric_entries` (manuales, importadas o de Health/CRM en el futuro, con source y quality) **+ proveedores** registrados en código que leen tablas de instancia (p. ej. el proveedor `vant.prospecting` traduce `prospecting_sessions.contacts_count` → `contacts`, source=APP).
- `funnels.stages` = lista ordenada de `metric_key`. Las tasas se derivan de etapas consecutivas. En la Fase C, `reverse.ts` recibe las etapas como parámetro.
- VANT queda como **datos**: un sistema "Adquisición VANT", un funnel outbound, métricas y un proveedor. Universidad o Fitness serían otros sistemas, funnels y métricas, **sin código nuevo**.

**Impacto:** en la Fase A, solo modelo y mapeo (las pantallas de Agencia siguen funcionando igual). La generalización de los motores se hace en la Fase C.

### P-15 — Objetivo ↔ Sistema de muchos a muchos

**Elemento de la spec:** §8, §23 ("los sistemas continúan más allá de proyectos individuales").
**Problema:** el mismo "Sistema de adquisición" sirve a "4 clientes" este trimestre y a "10 clientes" el siguiente. Un `systems.objective_id` único obligaría a duplicar el sistema.
**Propuesta:** tabla puente `objective_systems` (`objective_id`, `system_id`, `contribution` texto o fórmula). Los proyectos llevan `objective_id` y `system_id`.

---

## 4. Revisión de los 15 puntos pedidos

| # | Dimensión | Diseño |
|---|---|---|
| 1 | **Entidades** | Las 20 de §65 (SPEC-MATRIX §2) + roadmap_phases (P-5) + objectives (P-1) + routines (P-11) + 4 de ingesta (P-10) + objective_systems (P-15) |
| 2 | **Relaciones** | goal 1–n objectives · objectives n–n systems · system 1–n {routines, funnels, sops, projects} · project → {objective, system}, 1–n milestones, n–n project_dependencies · hypothesis → {goal, objective?, system} · experiment → {hypothesis, system, interventions→routines} · roadmap_phase → {goal, hypothesis, version} · task → {project?, routine?, system?, goal?, milestone?} · metric_entry → metric_definition · evidence → polimórfica (task, metric_entry, daily_log) · decision → polimórfica (entity) + change_set? + experiment? |
| 3 | **Jerarquía** | IDENTIDAD(L-1) → META(L0) → OBJETIVOS(L1) → SISTEMAS(L2) → PROYECTOS(L3) → TAREAS(L4). Las rutinas son el puente L2 → L4 para la ejecución recurrente. Las hipótesis, experimentos y el roadmap cuelgan de meta, objetivo y sistema, no de las tareas |
| 4 | **Dependencias** | `task_dependencies` (existe), `project_dependencies` (nueva), `roadmap_phases.entry_criteria/exit_criteria` (criterios, no FK) y `change_items.depends_on` (orden de aplicación) |
| 5 | **Estados** | Goal (§56: bloqueada, en cola, activa, completada, archivada + `locked_at` §11) · Hypothesis (§19 confianza + estado de prueba) · Experiment (diseñado, aprobado, running, finished, evaluated) · Decision (§43) · Task (§26, P-2) · Routine (activa, pausada, archivada) · Idea (§59) · Change set e ítem (P-10) · Plan import (P-10) |
| 6 | **Ownership** | `user_id` + RLS en todo (sin cambios). `owner` (responsable, §24) como texto en proyectos y sistemas para una delegación futura. `created_by` dice si lo creó el usuario, Claude o el sistema |
| 7 | **Fuente de verdad** | Definición de la meta → App (bloqueada) · tareas, rutinas y métricas → Supabase · decisiones → Supabase con espejo en Obsidian · SOPs y conocimiento extenso → Obsidian con referencia en la App · documentos fuente → Supabase (copia inmutable), aunque provengan de Obsidian (`obsidian_path`) · experimentos → Supabase + Obsidian (§121) |
| 8 | **Trazabilidad** | P-13: entidad → change_item → change_set → plan_import → source_document (+ decision) |
| 9 | **Versionado** | `version` + `superseded_by` en las entidades versionables (P-13). Meta y objetivos: cambio solo vía decisión con before/after. Nada se borra: `archived_at` |
| 10 | **Origen** | `origin` + `origin_change_item_id` + `created_by` en cada fila (P-13) |
| 11 | **Estrategia ↔ ejecución** | Sistema → rutinas → instancias de tarea diarias; proyecto → tareas puntuales; experimento → intervención sobre rutinas; métricas ← ejecución (entries/proveedores) → motores → cuello de botella → change set propuesto |
| 12 | **Ingesta futura** | P-10 + interfaz `PlanInterpreter` (§5). La Fase A incluye un intérprete **determinista de plantilla** (markdown con frontmatter) y un **fixture** del caso de prueba; el intérprete de Claude llega en la Fase C |
| 13 | **Permisos de Claude** | Política en código según §99: N0 leer · N1 analizar · N2 proponer (texto) · **N3 crear `change_sets` en estado `proposed`** · N4 aplicar change sets **ya aprobados** por el usuario · N5 (desactivado) automático solo en operaciones explícitamente autorizadas de bajo riesgo (p. ej. materializar rutinas). `sensitivity='locked'` (meta, identidad, datos históricos) → Claude no puede ni siquiera proponer un `update` directo; solo puede proponer abrir el flujo de cambio de meta |
| 14 | **Aprobación humana** | Revisión por ítem (aprobar, rechazar, modificar). El change set se aplica completo o en parte, siempre en una transacción. `strategic` exige una decisión con razón; `normal` basta con la aprobación |
| 15 | **Obsidian** | IDs estables: UUID de Supabase en el frontmatter (`pos_id`, `pos_type`, `pos_version`). Una nota de Obsidian puede ser un `source_document` (kind `obsidian_note`, `obsidian_path`, `content_hash`): escribes el plan en Obsidian y lo importas. Conflictos según §123 (datos operativos verificados > histórico > notas > inferencia de Claude). Sincronización real en la Fase D |

---

## 5. Contratos de código (Fase A, sin IA)

```ts
// lib/intelligence/interpreter.ts
interface PlanInterpreter {
  interpret(doc: SourceDocument, ctx: StrategyContext): Promise<Interpretation>;
}
type Interpretation = {
  detected: DetectedStructure;          // qué reconoció: goal, objectives, systems, hypotheses, experiments, metrics, roadmap, projects, routines, tasks
  inconsistencies: Inconsistency[];     // p. ej. "el objetivo choca con la meta bloqueada", "duración del experimento > roadmap"
  questions: Question[];                // ambigüedades que debe resolver el usuario
  changeSet: ProposedChangeSet;         // change_items con temp_refs, validados con los esquemas de dominio
};
// Implementaciones: TemplateInterpreter (Fase A, determinista) · ClaudeInterpreter (Fase C) · ManualInterpreter
```

`applyChangeSet(changeSetId)`: valida → resuelve temp_refs → aplica en orden topológico en una transacción → marca `origin_change_item_id` → crea la decisión si corresponde.

---

## 6. Caso de prueba de aceptación (recorrido)

**Entrada (`source_documents.content`):**
> "Quiero conseguir 5 clientes en 60 días mediante outbound. Mi hipótesis es que aumentar el volumen de prospectos de 30 a 60 diarios aumentará proporcionalmente las oportunidades. Quiero probarlo durante 14 días."

**`plan_imports`** → `inconsistencies`/`questions` esperadas:
- Q1: "¿'5 clientes en 60 días' es la META o un OBJETIVO bajo la meta bloqueada actual?" Si ya hay una meta 🔒, por defecto se propone como **objetivo**; crear o cambiar la meta exige el flujo de §11.
- Q2: "¿Ya existe un sistema de adquisición outbound?" Si existe, se **reutiliza** (update/enlace) en lugar de duplicarlo.
- Q3: "Baseline de 30/día: ¿dato medido o supuesto?" Si no hay datos, se marca `assumption_type=ASUMIDO`.

**`change_set`** (resumen de `change_items`):

| temp_ref | op | entity | payload clave | sensitivity |
|---|---|---|---|---|
| `$obj` | create | objective | 5 clientes, deadline = hoy + 60, metric `closes` | strategic |
| `$sys` | create (o enlace a existente) | system | "Adquisición outbound", type acquisition | strategic |
| — | create | objective_systems | `$obj` ↔ `$sys` | normal |
| `$fun` | create | funnel | system `$sys`, stages [contacts, replies, meetings_booked, proposals, closes] | strategic |
| `$m*` | create | metric_definitions | contacts(input), replies(process), meetings_booked(process), proposals(process), closes(output) — se reutilizan si ya existen | normal |
| `$hyp` | create | hypothesis | "Subir el volumen de 30 a 60/día aumenta proporcionalmente las oportunidades", system `$sys`, objective `$obj`, mecanismo volumen, confianza BAJA, criterio de validación "replies/día y reuniones/semana escalan ≈ ×2 con reply rate estable" | strategic |
| `$rm` | create | roadmap_phases | v1: días 1–14 experimento de volumen · días 15–60 ejecución con la decisión | strategic |
| `$prj` | create | project | "Campaña de adquisición outbound", system `$sys`, objective `$obj`, 60 días | normal |
| `$rt` | create | routine | "Contactar prospectos", system `$sys`, metric `contacts`, 30/día laborable, P0 | normal |
| `$rt2` | create | routine | "Follow-ups", metric `followups`, P0 | normal |
| `$exp` | create | experiment | hypothesis `$hyp`, variable "contactos/día", baseline 30, intervención `$rt` → 60 durante 14 días, muestra mínima, umbrales de éxito y fracaso, metric `reply_rate` + `meetings_booked` | strategic |
| — | create | tasks | puntuales del proyecto (p. ej. "Construir lista de 840 prospectos", "Preparar el guion de outbound"), P0/P1 según la palanca | normal |

**Al aprobar** → se crean las entidades y una decisión #N ("Adoptar el plan outbound de 60 días + experimento de volumen"). Desde el día siguiente, HOY muestra "Contactar prospectos 0/60" (rutina con override del experimento) en P0.
**Después:** los `metric_entries` y proveedores alimentan las tasas → el día 14, el experimento pasa a `finished` → los motores comparan con el baseline → `bottleneck` → Claude (N3) propone un change set de cierre (mantener 60 o revertir a 30) → apruebas → decisión → la rutina queda en v2 o vuelve a v1.

**Criterio de aceptación de la Fase A** (test automatizado, sin IA): el fixture de este caso → `TemplateInterpreter` produce el change set de arriba → `applyChangeSet` lo aplica → una consulta reconstruye el árbol meta → objetivo → sistema → {funnel, rutinas, hipótesis → experimento → intervención, roadmap, proyecto → tareas}, con el origen trazable hasta el documento fuente. `materializeRoutines(día 3)` produce "Contactar prospectos" con objetivo 60, y `materializeRoutines(día 20)` produce el valor base (30) mientras no haya decisión.

---

## 7. Qué NO entra en la Fase A

- La UI de importación (solo un listado y revisión mínima de change sets si da el tiempo).
- `ClaudeInterpreter` (Fase C).
- La sincronización con Obsidian (Fase D).
- La generalización de `reverse.ts` a funnels arbitrarios (Fase C).
- La reescritura de las pantallas de Agencia: siguen funcionando con un proveedor.

Nada de esto se elimina conceptualmente: el modelo lo soporta desde la Fase A.

## 8. Orden de implementación propuesto (Fase A)

| Paso | Contenido | Verificación |
|---|---|---|
| A1 | Esquemas de dominio zod + tipos (`lib/domain/*`) para todas las entidades, incluidas las de P-10 a P-15 | Tests de esquemas |
| A2 | Migración `0017` (Capa 1 + Capa 2 + campos de origen) y `0018` (Capa 3: ingesta) con RLS | `migrations.test.ts` exige RLS; `npm run check` |
| A3 | `applyChangeSet` (función SQL + server action) + política de permisos de Claude en código | Tests: orden topológico, rechazo de `locked`, rollback ante error |
| A4 | `materializeRoutines` + intervenciones de experimento | Tests con fechas dentro y fuera del experimento |
| A5 | `TemplateInterpreter` + fixture del caso de prueba + test de aceptación end-to-end | §6 en verde |
| A6 | Proveedores de métricas (VANT como instancia) + seed demo VANT como **datos** | Las pantallas actuales siguen iguales |
| A7 | Contrato con Obsidian (IDs, frontmatter, fuente de verdad, conflictos) como tipos y tests | Tests del parser |
| A8 | Actualizar `SPEC-MATRIX.md` | Matriz al día |
