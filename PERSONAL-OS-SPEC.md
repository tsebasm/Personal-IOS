
**Versión:** 0.1  
**Estado:** Borrador / Especificación maestra  
**Última actualización:** 2026-10-06  
**Propósito:** Especificación maestra del Personal Execution OS  
**Caso de uso inicial:** Ejecución personal, construcción de negocio, consecución de objetivos y mejora continua  
**Contexto inicial:** VANT  
**Arquitectura prevista:** Next.js + TypeScript + Supabase + Obsidian + Claude  
**Principio:** Meta fija + hipótesis + acciones + datos + feedback = progreso

---

# 0. PROPÓSITO DEL DOCUMENTO

Este documento es la especificación maestra del **Personal Execution OS**.

Define:

1. Qué es el sistema.
2. Por qué existe.
3. Cómo se definen las metas.
4. Cómo se descomponen matemáticamente.
5. Cómo se crean hipótesis.
6. Cómo se construyen estrategias y roadmaps.
7. Cómo se modelan resultados esperados.
8. Cómo se determina la ejecución diaria.
9. Cómo se mide la ejecución.
10. Cómo se distinguen inputs, outputs y outcomes.
11. Cómo se diagnostican cuellos de botella.
12. Cómo se diseñan experimentos.
13. Cómo analiza Claude los datos.
14. Cómo se proponen y aprueban cambios estratégicos.
15. Cómo Obsidian funciona como memoria de largo plazo.
16. Cómo la aplicación controla la atención del usuario.
17. Cómo se desbloquean metas secundarias.
18. Cómo evoluciona el sistema con el tiempo.
19. Cómo debe estructurarse técnicamente el software.
20. Qué pertenece al MVP y qué debe posponerse.

Este documento es el punto de referencia para todo desarrollo futuro.

Ninguna implementación debe contradecir intencionalmente esta especificación sin registrar explícitamente el cambio como una decisión.

---

# 1. CONCEPTO CENTRAL

El Personal Execution OS no es principalmente un gestor de tareas.

Es un **sistema de ejecución y feedback diseñado para maximizar la probabilidad de alcanzar un objetivo previamente definido**.

El ciclo fundamental es:

```text
META
↓
OBJETIVOS
↓
SISTEMAS
↓
PROYECTOS
↓
ACCIONES
↓
EJECUCIÓN
↓
DATOS
↓
DIAGNÓSTICO
↓
HIPÓTESIS
↓
EXPERIMENTO
↓
RESULTADO
↓
APRENDIZAJE
↓
AJUSTE ESTRATÉGICO
↓
NUEVAS ACCIONES
↓
EJECUCIÓN
````

El sistema debe minimizar la cantidad de pensamiento estratégico que el usuario necesita realizar durante la ejecución.

El usuario principalmente ejecuta.

El sistema debe:

- aclarar qué importa;
- determinar qué debe suceder después;
- hacer visible el volumen requerido;
- medir la ejecución;
- identificar desviaciones;
- identificar cuellos de botella;
- preservar aprendizajes;
- proponer mejoras;
- evitar distracciones innecesarias.

---

# 2. FILOSOFÍA FUNDAMENTAL

## 2.1 Target Lock / Meta Bloqueada

La meta principal es el objetivo.

La meta permanece fija durante el ciclo activo.

La estrategia puede cambiar.

Los proyectos pueden cambiar.

Las tareas pueden cambiar.

Las hipótesis pueden cambiar.

Los canales pueden cambiar.

Los procesos pueden cambiar.

La meta no puede cambiarse casualmente porque la ejecución pierde sentido si el objetivo se mueve cada vez que aparece una dificultad.

### Jerarquía

```
META
  ↓
OBJETIVOS
  ↓
SISTEMAS
  ↓
PROYECTOS
  ↓
TAREAS
```

Los niveles inferiores son flexibles.

La meta está bloqueada.

---

# 3. PRINCIPIO PRINCIPAL

## Meta fija + hipótesis + acciones + datos + feedback = progreso

El sistema nunca debe confundir:

```
Actividad
≠
Progreso
```

ni:

```
Tareas completadas
≠
Consecución de la meta
```

El propósito de las actividades es generar resultados medibles.

El propósito de esos resultados es acercarse al outcome.

Por tanto:

```
INPUT
→ OUTPUT
→ OUTCOME
```

---

# 4. ROL DEL USUARIO

El usuario es el **Ejecutor / Responsable final de las decisiones**.

Es responsable de:

- ejecutar acciones;
- proporcionar información faltante;
- validar datos importantes;
- aprobar o rechazar cambios estratégicos;
- definir o aprobar metas;
- registrar honestamente los datos de ejecución.

El sistema no debe reemplazar la autoridad final del usuario.

---

# 5. ROL DEL SISTEMA

El Personal Execution OS es responsable de:

- traducir metas en requerimientos operativos;
- convertir estrategias en proyectos;
- convertir proyectos en acciones;
- presentar únicamente las acciones relevantes en el momento correcto;
- medir ejecución;
- recopilar datos;
- calcular ritmo requerido;
- identificar desviaciones;
- identificar cuellos de botella;
- mantener registros históricos;
- generar diagnósticos;
- gestionar experimentos;
- presentar recomendaciones;
- preservar contexto estratégico.

---

# 6. ROL DE CLAUDE

Claude es la **Capa de Inteligencia / Analista Estratégico**.

Claude puede:

- analizar datos históricos;
- analizar métricas;
- identificar patrones;
- diagnosticar cuellos de botella;
- comparar hipótesis con realidad;
- proponer experimentos;
- proponer cambios en proyectos;
- proponer cambios en tareas;
- proponer cambios de timing;
- proponer cambios en sistemas;
- analizar conocimiento de Revolution Academy;
- analizar el historial de Obsidian;
- identificar errores repetidos;
- identificar fortalezas;
- identificar debilidades;
- generar revisiones semanales;
- generar recomendaciones estratégicas.

Claude NO puede cambiar silenciosamente:

- la meta principal;
- la identidad del usuario;
- datos históricos;
- una estrategia aprobada sin registrar el cambio;
- tareas críticas sin trazabilidad;
- interpretar datos faltantes como éxito;
- inventar resultados.

Las recomendaciones importantes deben presentarse como propuestas.

---

# 7. ROL DE OBSIDIAN

Obsidian es la **Capa de Memoria de Largo Plazo**.

La aplicación es la interfaz operativa.

Obsidian es la memoria histórica.

Claude utiliza ambas.

### Aplicación

Optimizada para:

- ejecución;
- estado actual;
- tareas;
- métricas;
- dashboards;
- feedback inmediato.

### Obsidian

Optimizado para:

- contexto histórico;
- decisiones;
- experimentos;
- aprendizajes;
- SOPs;
- conocimiento;
- razonamiento estratégico;
- patrones de largo plazo.

---

# 8. ARQUITECTURA DE METAS

El sistema utiliza cinco niveles principales:

```
L-1 — IDENTIDAD
L0  — META
L1  — OBJETIVOS
L2  — SISTEMAS
L3  — PROYECTOS
L4  — TAREAS / ACCIONES
```

---

# 9. L-1 — IDENTIDAD

La identidad no consiste en frases motivacionales.

Es el conjunto de comportamientos que el usuario demuestra repetidamente.

Debe definirse de manera conductual.

En lugar de:

> "Soy disciplinado."

Utilizar:

```
Ejecuto las acciones P0 antes de actividades opcionales.
Respeto los bloques de trabajo definidos.
Registro datos reales.
No cambio metas porque la ejecución sea difícil.
Cumplo compromisos planificados.
Analizo objetivamente los fallos.
Utilizo evidencia para tomar decisiones.
```

La identidad puede medirse mediante comportamientos observables.

---

# 10. L0 — META PRINCIPAL

La meta principal debe ser:

- específica;
- medible;
- temporal;
- objetivamente verificable.

Cada meta activa debe contener:

```
ID de meta
Nombre
Descripción
Fecha de inicio
Fecha límite
Valor inicial
Valor objetivo
Valor actual
Unidad
KPI
Fórmula
Ritmo requerido
Ritmo actual
Estado
Criterio de éxito
Criterio de fracaso
```

---

# 11. BLOQUEO DE META

La meta principal tiene un estado bloqueado:

```
LOCKED / BLOQUEADA
```

El sistema debe comunicar visualmente que es inmutable.

Cambiar la meta requiere un proceso deliberado:

1. intención explícita del usuario;
2. motivo;
3. snapshot de la meta anterior;
4. nueva meta;
5. explicación;
6. fecha;
7. registro de decisión.

Los cambios de meta deben ser excepcionales.

---

# 12. L1 — OBJETIVOS

Los objetivos descomponen matemáticamente la meta.

Ejemplo:

```
Meta de ingresos
↓
Clientes necesarios
↓
Ventas necesarias
↓
Sales calls necesarias
↓
Citas necesarias
↓
Leads necesarios
↓
Prospección necesaria
```

Los objetivos deben responder:

> ¿Qué debe ser matemáticamente cierto para que la meta ocurra?

---

# 13. MATEMÁTICA DE LA META

Toda meta medible debe tener un modelo matemático cuando sea posible.

Para una meta de ingresos:

```
Ingresos = Clientes × Ticket Promedio
```

Clientes:

```
Clientes = Oportunidades de Venta × Tasa de Cierre
```

Oportunidades:

```
Oportunidades = Sales Calls × Tasa de Oportunidad
```

Sales calls:

```
Sales Calls = Citas Agendadas × Show Rate
```

Citas:

```
Citas Agendadas = Conversaciones Calificadas × Booking Rate
```

Conversaciones:

```
Conversaciones Calificadas = Respuestas × Tasa de Calificación
```

Respuestas:

```
Respuestas = Contactos × Tasa de Respuesta
```

Por tanto, un modelo simplificado puede ser:

```
Ingresos
=
Contactos
×
Tasa de Respuesta
×
Tasa de Calificación
×
Booking Rate
×
Show Rate
×
Close Rate
×
Ticket Promedio
```

El funnel exacto dependerá del mecanismo de adquisición.

---

# 14. MODELOS MATEMÁTICOS POR CANAL

## Cold Calling

```
Llamadas
→ Conversaciones
→ Conversaciones Calificadas
→ Citas
→ Asistencias
→ Ventas
→ Clientes
```

## Cold Email

```
Emails
→ Aperturas
→ Respuestas
→ Respuestas Calificadas
→ Citas
→ Asistencias
→ Ventas
```

## Social Outbound

```
DMs
→ Respuestas
→ Conversaciones
→ Citas
→ Asistencias
→ Ventas
```

## Meta Ads

```
Impresiones
→ Clicks
→ Leads
→ Leads Calificados
→ Citas
→ Asistencias
→ Ventas
→ Clientes
```

## Google Ads

```
Impresiones
→ Clicks
→ Leads
→ Leads Calificados
→ Citas
→ Asistencias
→ Ventas
```

## Referidos

```
Referidos
→ Conversaciones
→ Oportunidades Calificadas
→ Sales Calls
→ Ventas
```

Cada sistema de adquisición debe tener su propio modelo.

---

# 15. SISTEMA DE HIPÓTESIS

Antes de comenzar un nuevo ciclo estratégico, el sistema debe definir una hipótesis inicial.

Una hipótesis debe contener:

```
ID de hipótesis
Meta relacionada
Problema
Mercado
ICP
Oferta
Canal
Mecanismo
Inputs esperados
Tasas de conversión esperadas
Outputs esperados
Ingresos esperados
Timeline
Supuestos
Riesgos
Nivel de confianza
Criterios de validación
Criterios de fracaso
```

---

# 16. HIPÓTESIS INICIAL

La hipótesis inicial representa el mejor modelo disponible en ese momento.

NO es una verdad.

Es un modelo temporal que debe validarse contra la realidad.

Ejemplo:

```
H-001

Canal:
Outbound en frío

Input:
1.000 prospectos

Tasa de respuesta esperada:
2% / 5% / 8%

Respuestas esperadas:
20 / 50 / 80

Booking Rate esperado:
5% / 10% / 15%

Citas esperadas:
1 / 5 / 12

Show Rate esperado:
60% / 75% / 85%

Sales Calls:
~1 / ~4 / ~10

Close Rate esperado:
5% / 10% / 20%

Clientes esperados:
~0 / ~0–1 / ~2
```

El sistema debe soportar como mínimo:

```
BEAR / PESIMISTA
BASE
BULL / OPTIMISTA
ACTUAL
```

---

# 17. MODELADO DE ESCENARIOS

Toda hipótesis importante debe soportar análisis por escenarios.

### Pesimista

Supuestos conservadores / desfavorables.

### Base

Supuestos más razonables.

### Optimista

Resultados fuertes pero plausibles.

### Actual

Datos observados.

Ejemplo:

|Métrica|Pesimista|Base|Optimista|Actual|
|---|---|---|---|---|
|Tasa de respuesta|2%|5%|8%|—|
|Booking Rate|5%|10%|15%|—|
|Show Rate|60%|75%|85%|—|
|Close Rate|5%|10%|20%|—|

Los valores reales deben reemplazar gradualmente los supuestos.

---

# 18. SUPUESTOS

Cada forecast debe distinguir:

### Conocido

Respaldado por datos confiables.

### Estimado

Basado en experiencia o evidencia externa.

### Asumido

Supuesto temporal sin evidencia suficiente.

### Desconocido

No existe información suficiente.

Claude nunca debe presentar un supuesto como un hecho.

---

# 19. CONFIANZA DE LAS HIPÓTESIS

Cada hipótesis debe tener un nivel de confianza:

```
BAJA
MEDIA
ALTA
VALIDADA
INVALIDADA
```

La confianza debe aumentar por evidencia.

No por repetición.

---

# 20. ROADMAP

El roadmap se deriva de la meta y la hipótesis.

Debe incluir:

```
Fase
Objetivo
Inicio
Final esperado
Criterios de entrada
Tareas
Proyectos
KPIs
Criterios de salida
Dependencias
Riesgos
Experimentos
```

El roadmap es una hipótesis estratégica.

No es inmutable.

---

# 21. ESTRUCTURA DEL ROADMAP

Estructura genérica:

```
META
│
├── FASE 1 — VALIDACIÓN
│
├── FASE 2 — OPTIMIZACIÓN
│
├── FASE 3 — REPETIBILIDAD
│
├── FASE 4 — ESCALA
│
└── FASE 5 — EXPANSIÓN
```

Las fases reales deben determinarse según la meta.

---

# 22. CRITERIOS DE ENTRADA Y SALIDA DE FASE

Una fase no debe avanzar simplemente porque pasó tiempo.

Debe tener criterios objetivos.

Ejemplo:

```
Salida de Fase 1:

- Muestra mínima alcanzada.
- Calidad de datos aceptable.
- Métricas principales disponibles.
- Hipótesis inicial evaluada.
- Cuello de botella identificado.
- Nueva estrategia aprobada.
```

---

# 23. L2 — SISTEMAS

Los sistemas son mecanismos recurrentes.

Ejemplos:

```
Sistema de Adquisición
Sistema de Ventas
Sistema de Fulfillment
Sistema de Aprendizaje
Sistema de Salud
Sistema Financiero
Sistema Universitario
Sistema de Revisión
```

Los sistemas continúan más allá de proyectos individuales.

---

# 24. L3 — PROYECTOS

Los proyectos son iniciativas temporales.

Cada proyecto debe tener:

```
ID
Nombre
Propósito
Relación con la meta
Fecha de inicio
Deadline
Responsable
Estado
Milestones
Tareas
Dependencias
Criterios de éxito
```

Un proyecto tiene final.

Un sistema no.

---

# 25. L4 — TAREAS

Las tareas deben ser ejecutables.

Mala tarea:

> Mejorar ventas.

Buena tarea:

> Contactar 30 prospectos calificados.

Mala tarea:

> Trabajar en VANT.

Buena tarea:

> Contactar 30 firmas de abogados de la lista calificada.

Cada tarea crítica debe tener:

```
Tarea
Cantidad esperada
Unidad
Deadline
Prioridad
Proyecto
Sistema
Meta
Requisito de evidencia
Criterio de finalización
```

---

# 26. ESTADOS DE TAREAS

Estados requeridos:

```
PENDING / PENDIENTE
IN_PROGRESS / EN PROGRESO
PARTIALLY_COMPLETED / PARCIAL
COMPLETED / COMPLETADA
VERIFIED / VERIFICADA
OVERDUE / VENCIDA
CANCELLED / CANCELADA
BLOCKED / BLOQUEADA
```

Importante:

**VENCIDA no significa automáticamente NO REALIZADA.**

El usuario debe poder registrar el cumplimiento real.

---

# 27. EVIDENCIA

Las tareas críticas deben permitir registrar evidencia.

Ejemplo:

```
Objetivo:
30 contactos

Real:
34 contactos

Fuente:
CRM / manual / integración

Verificado:
SÍ
```

Esto reduce el autoengaño.

---

# 28. JERARQUÍA DE PRIORIDADES

Las tareas y hábitos tienen tres niveles.

## P0 — CRÍTICAS

Contribuyen directamente al resultado.

Ejemplos:

- prospección;
- ventas;
- delivery;
- propuestas;
- acciones productoras de ingresos.

## P1 — FUNDAMENTALES

Aumentan la capacidad de ejecutar P0.

Ejemplos:

- sueño;
- entrenamiento;
- deep work;
- aprendizaje necesario.

## P2 — SECUNDARIAS

Optimización o identidad.

Ejemplos:

- mejoras estéticas;
- lectura opcional;
- personalización del sistema;
- optimización no esencial.

Prioridad:

```
P0 > P1 > P2
```

---

# 29. REGLA TARGET LOCK

Toda actividad nueva debe responder:

> ¿Cómo contribuye directa o indirectamente a la meta actual?

Si la respuesta no es clara:

```
PARK IT / APARCAR
```

No debe ejecutarse automáticamente.

---

# 30. UX CENTRADA EN HOY

La interfaz principal es:

```
HOY
```

El sistema debe ocultar deliberadamente información innecesaria durante la ejecución.

El usuario debe ver:

- meta principal;
- deadline;
- días restantes;
- ritmo actual;
- misión de hoy;
- tareas P0;
- tareas P1 relevantes;
- porcentaje de ejecución;
- métricas críticas.

No debe mostrarse un dashboard abrumador por defecto.

---

# 31. BLOQUEO VISUAL

Si las tareas críticas están incompletas, la aplicación debe priorizar las acciones críticas del día.

Ejemplo:

```
HOY

META
$20.000.000

D-17

P0

[ ] 30 prospectos
[ ] 10 follow-ups
[ ] 1 sales call
[ ] 90 min deep work

EJECUCIÓN
63%
```

Los módulos opcionales deben mantenerse visualmente secundarios.

---

# 32. COMPLETAR EL DÍA

Cuando todas las P0 requeridas estén completadas:

```
DAY COMPLETE ✓
```

El sistema puede desbloquear:

- roadmap;
- analytics;
- ideas;
- gestión profunda de proyectos;
- aprendizaje opcional;
- revisiones.

Esto funciona como mecanismo conductual contra la procrastinación productiva.

---

# 33. REVISIÓN NOCTURNA

La noche es la ventana principal de revisión.

El usuario puede revisar:

- métricas;
- roadmap;
- proyectos;
- experimentos;
- ideas;
- decisiones;
- fallos;
- día siguiente;
- propuestas estratégicas.

El sistema debe desalentar modificaciones estratégicas durante los bloques principales de ejecución.

---

# 34. MODELO DE EJECUCIÓN DIARIA

Cada día contiene:

```
META PRINCIPAL
↓
OBJETIVO DE HOY
↓
ACCIONES P0
↓
ACCIONES P1
↓
MÉTRICAS
↓
REVISIÓN DE FIN DE DÍA
```

---

# 35. REGISTRO DIARIO

Cada día debe generar un registro.

Ejemplo:

```
# 2026-10-06

## Meta principal

[Meta]

## Misión de hoy

[Misión]

## P0

- [ ] Acción
- [ ] Acción
- [ ] Acción

## P1

- [ ] Acción
- [ ] Acción

## Métricas

| Métrica | Objetivo | Real |
|---|---:|---:|
| Contactos | 30 | |
| Follow-ups | 10 | |
| Calls | 1 | |
| Ingresos | | |

## Ejecución

Ejecución P0: %

## Problemas

-

## Aprendizajes

-

## Evidencia

-

## Mañana

-

## Notas

-
```

---

# 36. INPUT / OUTPUT / OUTCOME

> **Enmienda P-4 (aprobada 2026-10-06):** las categorías son cuatro: **INPUT** (contactos, follow-ups, horas) → **PROCESO** (respuestas, calificados, reuniones, propuestas) → **OUTPUT** (cierres, clientes, ingresos) → **OUTCOME** (progreso hacia la meta). Ver §130.

El sistema debe separar tres niveles.

## Input

Actividad controlable.

Ejemplos:

- contactos;
- llamadas;
- follow-ups;
- propuestas;
- horas de trabajo;
- entrenamiento;
- sueño.

## Output

Resultados inmediatos medibles.

Ejemplos:

- respuestas;
- reuniones;
- propuestas;
- ventas.

## Outcome

Resultado final.

Ejemplos:

- ingresos;
- clientes;
- crecimiento;
- consecución de la meta.

---

# 37. LÓGICA DE DIAGNÓSTICO

El sistema debe determinar el tipo de problema mediante datos.

### Escenario A

```
Input BAJO
Output BAJO
```

Diagnóstico:

**Problema de ejecución / volumen.**

### Escenario B

```
Input ALTO
Output BAJO
```

Diagnóstico:

**Problema de calidad / conversión / estrategia.**

### Escenario C

```
Input ALTO
Output ALTO
Meta por debajo del ritmo requerido
```

Diagnóstico:

**Escala o eficiencia insuficiente.**

### Escenario D

```
Ejecución > 90%
Volumen suficiente
Output insuficiente
```

No recomendar automáticamente trabajar más.

Investigar:

- oferta;
- mercado;
- targeting;
- messaging;
- calificación;
- conversión;
- capacidad;
- canal.

---

# 38. CUELLO DE BOTELLA ACTUAL

El sistema debe identificar, siempre que sea posible, **un cuello de botella principal**.

No debe presentar diez problemas simultáneamente.

Ejemplo:

```
CUELLO DE BOTELLA ACTUAL:

Booking Rate

Evidencia:
320 contactos
18 respuestas
2 citas

Esperado:
10%

Actual:
5,6%

Prioridad:
ALTA
```

Los experimentos deben enfocarse en ese cuello de botella.

---

# 39. ÁRBOL DE DIAGNÓSTICO

```
META POR DEBAJO DEL RITMO
│
├── ¿La ejecución está por debajo del objetivo?
│       └── SÍ → PROBLEMA DE EJECUCIÓN
│
└── Ejecución suficiente
        │
        ├── ¿El volumen de inputs es suficiente?
        │       └── NO → PROBLEMA DE VOLUMEN
        │
        └── Inputs suficientes
                │
                ├── ¿La conversión está por debajo del benchmark?
                │       └── SÍ → PROBLEMA DE CONVERSIÓN
                │
                └── NO
                        ↓
                    PROBLEMA DE
                    ESTRATEGIA /
                    CAPACIDAD /
                    MERCADO
```

---

# 40. MOTOR DE EXPERIMENTOS

Todo cambio importante debería tratarse como experimento cuando sea posible.

Estructura:

```
ID del experimento
Fecha
Problema
Observación
Hipótesis
Variable
Baseline
Objetivo
Muestra
Duración
Acción
Resultado
Conclusión
Decisión
Actualización de SOP
```

---

# 41. CICLO DEL EXPERIMENTO

```
OBSERVACIÓN
↓
MEDICIÓN
↓
DIAGNÓSTICO
↓
HIPÓTESIS
↓
INTERVENCIÓN
↓
EXPERIMENTO
↓
RESULTADO
↓
APRENDIZAJE
↓
DECISIÓN
↓
SOP / ACTUALIZACIÓN DEL SISTEMA
```

---

# 42. TAMAÑO DE MUESTRA

El sistema debe evitar cambios estratégicos basados en muestras extremadamente pequeñas, salvo que la señal sea claramente significativa.

Cada experimento debe definir:

```
Muestra mínima
Ventana de observación
Umbral de éxito
Umbral de fracaso
```

---

# 43. MOTOR DE DECISIONES

Las recomendaciones de Claude deben seguir:

```
PROBLEMA
↓
EVIDENCIA
↓
DIAGNÓSTICO
↓
HIPÓTESIS
↓
PROPUESTA
↓
IMPACTO ESPERADO
↓
RIESGO
↓
DECISIÓN DEL USUARIO
```

Estados:

```
PROPUESTA
APROBADA
RECHAZADA
MODIFICADA
IMPLEMENTADA
EVALUADA
```

---

# 44. REGISTRO DE DECISIONES

Toda decisión estratégica importante debe registrarse.

Ejemplo:

```
Decisión #017

Fecha:

Problema:

Evidencia:

Diagnóstico:

Hipótesis:

Cambio propuesto:

Razón:

Impacto esperado:

Aprobado por:

Fecha de implementación:

Resultado:

Conclusión:

Seguimiento:
```

Esto crea memoria estratégica.

---

# 45. REVISIÓN SEMANAL

Al finalizar cada semana, Claude debe analizar:

### Meta

- valor actual;
- objetivo;
- restante;
- ritmo requerido;
- ritmo real.

### Ejecución

- acciones planificadas;
- acciones completadas;
- porcentaje de ejecución.

### Funnel

- inputs;
- outputs;
- tasas de conversión.

### Proyectos

- progreso;
- retrasos;
- bloqueos.

### Experimentos

- activos;
- completados;
- resultados.

### Cuello de botella

- cuello de botella actual.

### Recomendación

- qué debe cambiar.

### No hacer

- actividades que deberían eliminarse o posponerse.

---

# 46. ESTRUCTURA DE LA REVISIÓN SEMANAL

```
REVISIÓN SEMANAL #XXX

1. ESTADO DE LA META
2. ANÁLISIS DE RITMO
3. ANÁLISIS DE EJECUCIÓN
4. ANÁLISIS DEL FUNNEL
5. ESTADO DE PROYECTOS
6. CUELLO DE BOTELLA ACTUAL
7. CAUSA RAÍZ
8. RESULTADOS DE EXPERIMENTOS
9. RECOMENDACIÓN ESTRATÉGICA
10. PLAN DE LA PRÓXIMA SEMANA
11. QUÉ DEJAR DE HACER
12. DECISIONES QUE REQUIEREN APROBACIÓN
```

---

# 47. RITMO REQUERIDO

Para cualquier meta medible:

```
Ritmo requerido =
Meta restante / Tiempo restante
```

El sistema debe soportar:

- ritmo diario;
- ritmo semanal;
- ritmo mensual.

Y comparar:

```
Ritmo actual
vs
Ritmo requerido
```

---

# 48. ESTADO DEL RITMO

Posibles estados:

```
MUY ADELANTADO
ADELANTADO
EN RITMO
LIGERAMENTE ATRASADO
ATRASADO
CRÍTICAMENTE ATRASADO
```

---

# 49. COSTO DE OPORTUNIDAD

El sistema debe hacer visible el costo del tiempo perdido cuando sea posible.

Ejemplo:

```
Requerido:
30 contactos/día

Real:
12

Brecha:
18

Brecha semanal:
126
```

El propósito no es castigar.

Es hacer visibles las consecuencias.

---

# 50. SCORE DE EJECUCIÓN

Puede calcularse:

```
Score de ejecución =
Acciones requeridas completadas
/
Acciones requeridas planificadas
× 100
```

Pero el score de ejecución nunca debe interpretarse como progreso de la meta.

Es posible tener:

```
Ejecución = 100%
Progreso de meta = Bajo
```

Eso indica un problema estratégico.

---

# 51. ESTRATEGIA VS EJECUCIÓN VS CAPACIDAD

El sistema debe distinguir:

### Problema de ejecución

El usuario no ejecutó el plan.

### Problema de estrategia

El usuario ejecutó el plan, pero el mecanismo no produce suficientes resultados.

### Problema de capacidad

El usuario sabe qué debe hacer, pero todavía carece de la habilidad necesaria para ejecutarlo eficazmente.

---

# 52. HÁBITOS

Los hábitos están subordinados a la meta principal.

Jerarquía:

```
P0 — RESULTADO
P1 — CAPACIDAD
P2 — OPTIMIZACIÓN / IDENTIDAD
```

Los hábitos no deben convertirse en una excusa para evitar P0.

---

# 53. MEDICIÓN DE HÁBITOS

Posibles datos automáticos/manuales:

- sueño;
- hora de despertar;
- ejercicio;
- tiempo de pantalla;
- deep work;
- estudio;
- lectura;
- meditación;
- nutrición;
- adherencia al calendario.

Cuando exista una fuente automática confiable, debe preferirse.

Cuando no exista, usar confirmación manual.

---

# 54. PRINCIPIO DE AUTOMATIZACIÓN

El sistema debe recopilar automáticamente todo lo que pueda recopilarse de forma confiable.

El usuario debe registrar manualmente métricas empresariales de alto valor cuando sea necesario.

Métricas iniciales de VANT:

```
Contactos enviados
Follow-ups
Respuestas
Citas agendadas
Citas atendidas
Propuestas
Cierres
Ingresos
```

---

# 55. PRIORIDAD DE AUTOMATIZACIÓN

Prioridad:

```
1. Datos críticos
2. Datos de alta frecuencia
3. Datos fáciles de automatizar
4. Datos útiles para diagnóstico
5. Datos opcionales
```

No construir automatizaciones solamente porque sean técnicamente interesantes.

---

# 56. METAS SECUNDARIAS

El sistema puede almacenar metas secundarias.

Sin embargo, normalmente solo debe existir una meta dominante activa.

Estados posibles:

```
BLOQUEADA (no activable)
EN COLA
ACTIVA
COMPLETADA
ARCHIVADA
```

> **Enmienda C-2 (aprobada 2026-10-06):** "BLOQUEADA (no activable)" (`activation_state = 'blocked'`) es un concepto distinto del **bloqueo de la meta activa** de §11 (`locked_at`: la meta no admite modificaciones casuales). Ambos se mantienen diferenciados en el modelo y en la interfaz.

---

# 57. DESBLOQUEO DE METAS

Las metas secundarias deben activarse únicamente cuando se cumplan condiciones objetivas.

Ejemplo:

```
Hito de meta principal ≥ X%

Y

Ejecución estable ≥ X%

Y

Sistema principal estable ≥ X semanas

Y

No existe cuello de botella crítico sin resolver

Y

Existe capacidad disponible
```

Los umbrales exactos deben ser configurables.

---

# 58. PRINCIPIO DE ACTIVACIÓN

Una nueva meta no debe activarse simplemente porque el usuario se emocionó con ella.

Debe pasar una regla de activación.

Esto evita la proliferación de objetivos.

---

# 59. BANCO DE IDEAS

Las ideas no son automáticamente tareas.

Toda idea entra inicialmente en:

```
IDEA PARKING / BANCO DE IDEAS
```

Posteriormente puede convertirse en:

```
RECHAZADA
POSPUESTA
PROYECTO
EXPERIMENTO
TAREA
CANDIDATA A META
```

---

# 60. ARQUITECTURA ANTIPROCRASTINACIÓN

El sistema debe asumir que el usuario puede utilizar sistemas de productividad como forma de evasión.

Por ello debe minimizar:

- dashboards innecesarios;
- personalización excesiva;
- planificación constante;
- notificaciones irrelevantes;
- configuración infinita;
- automatización prematura;
- investigación innecesaria.

Debe maximizar:

- ejecución inmediata;
- prioridades claras;
- consecuencias visibles;
- acciones medibles;
- feedback rápido;
- evidencia.

---

# 61. HARD MODE

El sistema puede tener un modo "Hard Mode".

Debe ser estricto con la conducta, nunca degradante con la persona.

Ejemplo:

```
Las P0 de hoy siguen incompletas.

Estás por debajo de la ejecución requerida.

Los módulos opcionales permanecen bloqueados.

Completa primero las acciones críticas.
```

No debe utilizar insultos ni ataques personales.

---

# 62. FEEDBACK CONDUCTUAL

El sistema debe mostrar consecuencias objetivamente.

Ejemplo:

```
Requerido:
30 contactos/día

Real:
12

Brecha diaria:
18

Brecha proyectada a 7 días:
126
```

Esto es preferible a mensajes motivacionales genéricos.

---

# 63. REDUCCIÓN DE DECISIONES DIARIAS

El sistema debe responder:

> ¿Qué debo hacer ahora?

sin exigir al usuario revisar todo el sistema.

Flujo:

```
Abrir aplicación
↓
Ver misión de hoy
↓
Ejecutar P0
↓
Registrar / recopilar datos automáticamente
↓
Completar P1
↓
Cerrar día
↓
Revisar
```

---

# 64. ARQUITECTURA DEL PRODUCTO

Stack inicial previsto:

```
Frontend:
Next.js
TypeScript
Tailwind
shadcn/ui

Backend:
Supabase

Base de datos:
PostgreSQL

Autenticación:
Supabase Auth

Storage:
Supabase Storage

IA:
Claude / Anthropic API

Memoria:
Vault local de Obsidian en Markdown

Automatización:
iPhone Shortcuts
Health
Calendar
Screen Time
Integraciones futuras
```

La aplicación existente debe reutilizarse.

NO reconstruir desde cero sin justificación técnica.

---

# 65. ENTIDADES PRINCIPALES DE BASE DE DATOS

> **Enmienda P-1, P-5, P-6, P-10, P-11, P-15 (aprobadas 2026-10-06):** se agregan ROADMAP_PHASES, ROUTINES, OBJECTIVE_SYSTEMS, SOURCE_DOCUMENTS, PLAN_IMPORTS, CHANGE_SETS y CHANGE_ITEMS. OBJECTIVES, DAILY_LOGS e IDEAS son tablas propias. Ver §130.

Entidades esperadas:

```
GOALS
OBJECTIVES
SYSTEMS
PROJECTS
MILESTONES
TASKS
DAILY_LOGS
HABITS
HABIT_LOGS
METRICS
FUNNELS
HYPOTHESES
EXPERIMENTS
DECISIONS
REVIEWS
SOPS
IDEAS
IDENTITY_RULES
TIME_BLOCKS
EVIDENCE
```

---

# 66. RELACIÓN CONCEPTUAL PRINCIPAL

```
META
 ↓
OBJETIVO
 ↓
SISTEMA
 ↓
PROYECTO
 ↓
TAREA
 ↓
REGISTRO DIARIO
 ↓
MÉTRICA
 ↓
EXPERIMENTO
 ↓
RESULTADO
```

No todas las entidades necesitan una relación directa mediante clave foránea.

La arquitectura final de base de datos debe normalizarse apropiadamente.

---

# 67. INTEGRIDAD DE DATOS

Los datos históricos deben preservarse.

Evitar modificaciones destructivas.

Los registros importantes deberían soportar:

- created_at;
- updated_at;
- source;
- author;
- version;
- status.

Las decisiones estratégicas nunca deben desaparecer silenciosamente.

---

# 68. FUENTES DE DATOS

Cada métrica debe identificar su origen.

Fuentes posibles:

```
MANUAL
APP
CRM
CALENDAR
HEALTH
SCREEN_TIME
API
IMPORT
CLAUDE
OBSIDIAN
```

Claude debe considerar la confiabilidad de cada fuente.

---

# 69. CALIDAD DE DATOS

Estados posibles:

```
VERIFICADO
AUTORREPORTADO
ESTIMADO
INCOMPLETO
FALTANTE
```

Los datos faltantes nunca deben convertirse automáticamente en cero.

---

# 70. ANÁLISIS DE DATOS POR CLAUDE

Claude debe analizar:

```
Estado actual
+
Estado histórico
+
Meta
+
Objetivos
+
Proyectos
+
Tareas
+
Métricas
+
Experimentos
+
Decisiones
+
SOPs
+
Obsidian
+
Conocimiento de Revolution Academy
```

---

# 71. SEPARACIÓN DE FUENTES DE CONOCIMIENTO

Claude debe distinguir:

### Datos del usuario

Lo que realmente ocurrió.

### Conocimiento de Revolution Academy

Lo que enseñan los materiales externos.

### Inferencia de Claude

Razonamiento generado por Claude.

### Recomendación

Acción propuesta por Claude.

Ejemplo:

```
HECHO:
Contactaste 300 prospectos.

HECHO:
Tu tasa de respuesta fue 3%.

PRINCIPIO DE REVOLUTION:
El material recomienda X.

INFERENCIA:
El mensaje podría estar teniendo bajo rendimiento.

RECOMENDACIÓN:
Ejecutar el experimento H-004.
```

---

# 72. REVOLUTION ACADEMY

Los materiales de Revolution Academy deben almacenarse como fuente de conocimiento.

No deben sobreescribir automáticamente los datos del usuario.

Prioridad:

```
Realidad observada
>
Datos personales validados
>
Evidencia externa confiable
>
Principios educativos
>
Supuestos no validados
```

El sistema debe permitir contradicciones.

Ejemplo:

> "El curso recomienda X, pero tus datos indican Y."

Eso es información útil.

---

# 73. ARQUITECTURA DE OBSIDIAN

> **Enmienda P-7 (aprobada 2026-10-06):** la estructura pasa a `PERSONAL-OS/00_META, 01_OBJECTIVES, 02_SYSTEMS, 03_PROJECTS, 04_HYPOTHESES, 05_EXPERIMENTS, 06_METRICS, 07_DAILY_LOGS, 08_WEEKLY_REVIEWS, 09_DECISIONS, 10_SOPS, 11_IDENTITY, 12_REVOLUTION, 13_IDEAS`, con un mapeo configurable a las carpetas existentes de la bóveda, sin moverlas. Ver §130.

Estructura sugerida:

```
PERSONAL-OS/
│
├── 00-META/
├── 01-OBJETIVOS/
├── 02-SISTEMAS/
├── 03-PROYECTOS/
├── 04-EXPERIMENTOS/
├── 05-REGISTROS-DIARIOS/
├── 06-REVISIONES-SEMANALES/
├── 07-METRICAS/
├── 08-DECISIONES/
├── 09-SOPS/
├── 10-IDENTIDAD/
├── 11-REVOLUTION/
└── 12-IDEAS/
```

---

# 74. NOTA DIARIA DE OBSIDIAN

Ejemplo:

```
# 2026-10-06

## Meta principal

[Meta]

## Misión de hoy

[Misión]

## P0

- [ ] Acción
- [ ] Acción
- [ ] Acción

## P1

- [ ] Acción
- [ ] Acción

## Métricas

| Métrica | Objetivo | Real |
|---|---:|---:|
| Contactos | 30 | |
| Follow-ups | 10 | |
| Calls | 1 | |
| Ingresos | | |

## Ejecución

Ejecución P0: %

## Problemas

-

## Aprendizajes

-

## Evidencia

-

## Mañana

-

## Notas

-
```

---

# 75. SISTEMA DE SOPs

Los procesos repetidamente exitosos deben convertirse en SOPs.

Ciclo:

```
EXPERIMENTO
↓
ÉXITO
↓
REPETICIÓN
↓
ESTANDARIZACIÓN
↓
SOP
```

Los experimentos fallidos también deben documentarse cuando aporten aprendizaje.

---

# 76. ESTRUCTURA DE UN SOP

```
ID del SOP
Nombre
Propósito
Cuándo utilizarlo
Inputs
Pasos
Output esperado
KPIs
Errores frecuentes
Última versión
Experimento de origen
```

---

# 77. GRAFO DE CONOCIMIENTO PERSONAL

Con el tiempo el sistema debe conectar:

```
META
↕
DECISIÓN
↕
EXPERIMENTO
↕
RESULTADO
↕
APRENDIZAJE
↕
SOP
↕
PROYECTO
↕
TAREA
```

Esto permite razonamiento histórico.

---

# 78. PREGUNTAS QUE CLAUDE DEBERÍA PODER RESPONDER

El sistema debería soportar preguntas como:

> ¿Cuál es mi cuello de botella actual?

> ¿Por qué estoy atrasado?

> ¿Qué he intentado anteriormente?

> ¿Qué funcionó?

> ¿Qué fracasó?

> ¿Qué experimentos produjeron mejores resultados?

> ¿Qué decisiones tomé sobre adquisición?

> ¿Qué supuestos siguen sin validar?

> ¿Qué estoy evitando repetidamente?

> ¿Qué debería dejar de hacer?

> ¿Cuál es la acción de mayor leverage hoy?

> Si mantengo mi ritmo actual, ¿cuándo alcanzaré la meta?

> ¿Qué tendría que cambiar para alcanzar la meta a tiempo?

> Basado en mis datos históricos, ¿qué estrategia tiene mayor probabilidad de éxito?

---

# 79. CAPA PREDICTIVA

Versiones futuras pueden calcular:

```
Trayectoria actual
Fecha proyectada de consecución
Probabilidad de alcanzar la meta
Ajuste de ritmo necesario
Resultado esperado bajo distintas estrategias
```

Ejemplo:

```
Ritmo actual:
$500/semana

Ritmo requerido:
$1.200/semana

Brecha:
$700/semana

Fecha proyectada:
Junio 2027

Fecha requerida:
Diciembre 2026
```

Claude puede proponer intervenciones.

---

# 80. MÚLTIPLES METAS A FUTURO

El sistema debe eventualmente soportar áreas:

```
Negocio
Universidad
Salud
Finanzas
Relaciones
Aprendizaje
Estilo de vida
```

Pero debe conservar la prioridad.

No debe permitir que diez metas compitan con igual importancia.

---

# 81. ASIGNACIÓN DE RECURSOS

Versiones futuras deben considerar:

```
Tiempo
Dinero
Energía
Atención
Habilidad
Capital social
```

Una meta puede fallar porque los recursos son insuficientes incluso cuando la estrategia es correcta.

---

# 82. PRESUPUESTO DE TIEMPO

El sistema eventualmente debe calcular:

```
Horas productivas disponibles
Horas requeridas
Horas P0
Horas P1
Horas universitarias
Obligaciones personales
Buffer
```

Si el plan requiere más tiempo del disponible:

```
PLAN INVÁLIDO
```

El sistema debe proponer:

- reducir alcance;
- aumentar eficiencia;
- delegar;
- cambiar el mecanismo.

---

# 83. RESTRICCIONES FINANCIERAS

El sistema debe soportar limitaciones financieras.

Ejemplos:

```
Efectivo disponible
Gastos fijos
Deuda
Capital disponible para inversión
Presupuesto máximo de experimentos
Runway
```

No debe recomendar estrategias que violen restricciones financieras conocidas.

---

# 84. GESTIÓN DE RIESGOS

Toda estrategia importante debe identificar:

```
Riesgo financiero
Riesgo de tiempo
Riesgo de ejecución
Riesgo de mercado
Riesgo de habilidad
Riesgo de dependencia
Costo de oportunidad
```

---

# 85. REGLA DE DECISIÓN

Cuando exista incertidumbre:

```
No especular innecesariamente.
Definir la incertidumbre.
Diseñar una prueba.
Recopilar datos.
Actualizar el modelo.
```

---

# 86. NO OPTIMIZAR PREMATURAMENTE

No optimizar un proceso antes de tener suficiente información.

Ejemplo:

No dedicar 20 horas a automatizar un funnel que todavía no ha sido validado.

Secuencia preferida:

```
MANUAL
↓
VALIDAR
↓
MEDIR
↓
REPETIR
↓
ESTANDARIZAR
↓
AUTOMATIZAR
```

---

# 87. MVP

La primera versión NO debe intentar implementar todo.

El MVP debe incluir:

```
1. Meta principal
2. Bloqueo de meta
3. Objetivos
4. Proyectos
5. Tareas
6. Today Engine
7. P0/P1/P2
8. Registro diario
9. Métricas básicas
10. Score de ejecución
11. Ritmo requerido
12. Revisión nocturna
13. Revisión semanal
```

---

# 88. V2

Añadir:

```
1. Hipótesis
2. Escenarios
3. Modelos de funnel
4. Experimentos
5. Registro de decisiones
6. Motor de cuellos de botella
7. Análisis de Claude
```

---

# 89. V3

Añadir:

```
1. Sincronización con Obsidian
2. Inteligencia histórica
3. Integración de conocimiento de Revolution
4. Inteligencia sobre SOPs
5. Detección de patrones
6. Memoria personal de largo plazo
```

---

# 90. V4

Añadir:

```
1. Automatización con iPhone
2. Health
3. Calendar
4. Screen Time
5. Registros diarios automáticos
6. Notificaciones contextuales
```

---

# 91. V5

Futuro posible:

```
PERSONAL EXECUTION OS PREDICTIVO
```

Capacidades:

- predicción de trayectoria;
- modelado de probabilidad;
- detección automática de cuellos de botella;
- optimización de recursos;
- predicciones conductuales personalizadas;
- modelado del costo de oportunidad;
- planificación adaptativa.

---

# 92. PRINCIPIOS UX

La aplicación debe ser:

### Minimalista

Solo información relevante.

### Orientada a la acción

Debe responder:

> ¿Qué hago ahora?

### Basada en datos

Mostrar evidencia, no ruido motivacional.

### Jerárquica

La meta debe dominar visualmente.

### Rápida

La interacción diaria debe tomar segundos, no minutos.

### Sin fricción

Registrar datos debe requerir el mínimo esfuerzo posible.

### Estricta

Debe preservar prioridades.

---

# 93. PANTALLA PRINCIPAL

Propuesta:

```
------------------------------------
PERSONAL EXECUTION OS

META PRINCIPAL
$20.000.000
D-87
EN RITMO

MISIÓN DE HOY
Generar el output requerido.

P0
[ ] 30 prospectos
[ ] 10 follow-ups
[ ] 1 sales call

P1
[ ] 90 min deep work
[ ] Entrenamiento

EJECUCIÓN
████████░░ 80%

RITMO REQUERIDO
$X/día

RITMO ACTUAL
$Y/día
------------------------------------
```

---

# 94. JERARQUÍA DE INFORMACIÓN

Prioridad:

```
1. Meta principal
2. Misión de hoy
3. P0
4. P1
5. Cuello de botella actual
6. Métricas requeridas
7. Todo lo demás
```

---

# 95. NAVEGACIÓN

Navegación potencial:

```
HOY
METAS
OBJETIVOS
SISTEMAS
PROYECTOS
MÉTRICAS
EXPERIMENTOS
REVISIONES
MEMORIA
CONFIGURACIÓN
```

HOY debe permanecer como vista principal.

---

# 96. FILOSOFÍA DE NOTIFICACIONES

Las notificaciones deben ser escasas y relevantes.

Útiles:

- deadline crítico;
- P0 vencida;
- desviación importante del ritmo;
- revisión importante;
- inicio de experimento aprobado.

Evitar:

- motivación genérica;
- rachas sin sentido;
- recordatorios excesivos.

---

# 97. GAMIFICACIÓN

La gamificación debe ser limitada.

El sistema no es un videojuego.

Malos incentivos:

- puntos por actividad inútil;
- rachas independientes de resultados;
- badges por usar el sistema.

Feedback útil:

- ejecución;
- ritmo de meta;
- output;
- consistencia;
- evidencia.

---

# 98. SEGURIDAD

La información personal sensible debe protegerse.

Utilizar:

- autenticación;
- autorización;
- variables de entorno seguras;
- API keys del lado del servidor;
- políticas de base de datos;
- mínimo privilegio.

---

# 99. PERMISOS DE CLAUDE

Claude debe tener niveles de autoridad.

### Nivel 0

Leer.

### Nivel 1

Analizar.

### Nivel 2

Proponer.

### Nivel 3

Generar borradores de cambios.

### Nivel 4

Ejecutar cambios aprobados.

### Nivel 5

Cambios automáticos únicamente para operaciones explícitamente autorizadas y de bajo riesgo.

Los cambios de meta siempre requieren aprobación del usuario.

---

# 100. AUDITABILIDAD

Las acciones importantes deben poder rastrearse.

El sistema debe poder responder:

```
¿Quién cambió esto?
¿Cuándo?
¿Por qué?
¿Basado en qué?
¿Cuál era el valor anterior?
¿Qué ocurrió después?
```

---

# 101. VERSIONADO

Los objetos estratégicos importantes deben soportar versiones.

Ejemplos:

```
Meta v1
Hipótesis v1
Hipótesis v2
Roadmap v1
Roadmap v2
SOP v1
SOP v2
```

Las versiones históricas deben permanecer accesibles.

---

# 102. MANEJO DE FALLOS

Si faltan datos:

```
MARCAR DATOS FALTANTES
```

No inventar.

Si falla una automatización:

```
VOLVER A REGISTRO MANUAL
```

Si Claude no está disponible:

```
LA EJECUCIÓN PRINCIPAL DEBE SEGUIR FUNCIONANDO
```

El OS no puede depender completamente de IA.

---

# 103. MODO DEGRADADO / OFFLINE

La ejecución diaria principal debe continuar siendo usable aunque:

- la IA no esté disponible;
- las integraciones fallen;
- Obsidian no esté disponible;
- APIs externas fallen.

---

# 104. PRINCIPIO DE DESARROLLO

Construir por capas.

No construir todo simultáneamente.

Secuencia:

```
ESPECIFICACIÓN
↓
AUDITORÍA DEL REPOSITORIO
↓
MODELO DE DATOS
↓
TODAY ENGINE
↓
TRACKING DIARIO
↓
REVISIONES
↓
MÉTRICAS
↓
HIPÓTESIS
↓
EXPERIMENTOS
↓
CLAUDE
↓
OBSIDIAN
↓
AUTOMATIZACIÓN
```

---

# 105. REGLA PARA EL REPOSITORIO EXISTENTE

Antes de escribir código:

1. Inspeccionar el repositorio existente.
2. Identificar arquitectura actual.
3. Identificar componentes reutilizables.
4. Identificar esquema actual de Supabase.
5. Identificar rutas actuales.
6. Identificar UI existente.
7. Identificar deuda técnica.
8. Comparar funcionalidades existentes contra esta especificación.

NO reconstruir el proyecto desde cero sin justificación técnica clara.

---

# 106. FLUJO DE TRABAJO CON CLAUDE CODE

Cada fase de implementación debe seguir:

```
LEER
↓
ENTENDER
↓
PLANIFICAR
↓
IMPLEMENTAR
↓
PROBAR
↓
VERIFICAR
↓
DOCUMENTAR
```

Claude Code no debe generar grandes cantidades de código a ciegas.

---

# 107. CRITERIOS DE ACEPTACIÓN DE DESARROLLO

Una funcionalidad no está terminada simplemente porque se renderiza.

Debe:

- funcionar;
- persistir datos;
- manejar errores;
- respetar permisos;
- preservar históricos;
- cumplir requisitos UX;
- tener pruebas apropiadas;
- no romper funcionalidades existentes.

---

# 108. FASE 0 — ESPECIFICACIÓN

La Fase 0 está completa cuando:

```
[ ] Meta definida
[ ] Meta descompuesta matemáticamente
[ ] Hipótesis inicial definida
[ ] Escenarios Pesimista/Base/Optimista definidos
[ ] Modelos de adquisición definidos
[ ] Framework de KPIs definido
[ ] Roadmap definido
[ ] P0/P1/P2 definidos
[ ] Modelo de ejecución diaria definido
[ ] Framework de cuellos de botella definido
[ ] Framework de experimentos definido
[ ] Framework de decisiones definido
[ ] Arquitectura de Obsidian definida
[ ] Rol de Claude definido
[ ] Modelo de base de datos definido
[ ] UX definida
[ ] MVP definido
[ ] Roadmap futuro definido
[ ] Criterios de aceptación definidos
```

---

# 109. FASE 1 — AUDITORÍA DEL REPOSITORIO

Objetivo:

Entender la aplicación actual antes de modificarla.

Entregable:

```
REPOSITORY-AUDIT.md
```

Debe contener:

- stack existente;
- rutas;
- componentes;
- base de datos;
- autenticación;
- funcionalidades actuales;
- componentes reutilizables;
- funcionalidades faltantes;
- deuda técnica;
- migraciones necesarias.

No realizar implementación mayor antes de esta auditoría.

---

# 110. FASE 2 — TODAY ENGINE

Objetivo:

Hacer que el sistema sea inmediatamente útil.

Debe incluir:

```
Meta
Deadline
Hoy
P0
P1
Ejecución %
Ritmo requerido
Ritmo actual
Completitud
```

Esta fase debe generar valor inmediatamente.

---

# 111. FASE 3 — TRACKING

Implementar:

- registros diarios;
- métricas de negocio;
- hábitos;
- evidencia;
- historial de ejecución.

---

# 112. FASE 4 — INTELIGENCIA

Implementar:

- análisis semanal;
- detección de cuellos de botella;
- comparación de hipótesis;
- experimentos;
- recomendaciones.

---

# 113. FASE 5 — MEMORIA

Implementar:

- integración con Obsidian;
- recuperación histórica;
- memoria de decisiones;
- memoria de experimentos;
- memoria de SOPs.

---

# 114. FASE 6 — IA

Implementar Claude como:

```
ANALISTA
+
MOTOR DE DIAGNÓSTICO
+
ASESOR ESTRATÉGICO
```

No como decisor autónomo.

---

# 115. FASE 7 — AUTOMATIZACIÓN

Integrar:

- iPhone;
- Calendar;
- Health;
- Screen Time;
- herramientas de automatización.

Solo cuando aporten valor real.

---

# 116. FASE 8 — PREDICCIÓN

Implementar eventualmente:

```
Trayectoria
Probabilidad
Forecast
Predicción de cuellos de botella
Optimización de recursos
```

---

# 117. CASO DE USO INICIAL: VANT

El sistema se utilizará inicialmente para ejecutar VANT.

La estrategia, nicho, oferta y pricing concretos deben tratarse como parámetros configurables del negocio.

El sistema debe soportar un modelo como:

```
Prospección
→ Respuesta
→ Calificación
→ Agendamiento
→ Asistencia
→ Venta
→ Cliente
→ Ingresos
```

Métricas inicialmente manuales:

```
Contactos
Follow-ups
Respuestas
Citas agendadas
Sales calls
Propuestas
Clientes cerrados
Ingresos
```

---

# 118. MODELO DE HIPÓTESIS DE VANT

El plan inicial de VANT debe representarse como una hipótesis, no como una verdad permanente.

Canales potenciales:

```
Cold Calling
Cold Email
Social Outbound
Referidos
Meta Ads
Google Ads
```

Cada uno debe tener su propio funnel.

El sistema debe calcular:

```
Contactos requeridos
Respuestas requeridas
Citas requeridas
Asistencias requeridas
Sales calls requeridas
Cierres requeridos
Ingresos requeridos
```

según la meta y los supuestos seleccionados.

---

# 119. FEEDBACK DEL SISTEMA VANT

Después de comenzar la ejecución, los resultados reales reemplazan las estimaciones.

Ejemplo:

```
Supuesto inicial:
Respuesta = 5%

Real:
Respuesta = 3,4%

Diferencia:
-32%
```

Claude debe determinar si la desviación es suficientemente significativa antes de recomendar un cambio estratégico.

---

# 120. SISTEMA DE REGISTRO PRINCIPAL

Para estado operativo:

```
Supabase
```

Para conocimiento histórico:

```
Obsidian
```

Para razonamiento de IA:

```
Claude
```

Para ejecución:

```
Aplicación
```

---

# 121. FUENTE ÚNICA DE VERDAD

Cada tipo de información debe tener una ubicación canónica.

```
Estado actual de tareas → App / Database
Decisión histórica → Decision Log / Obsidian
Conocimiento extenso → Obsidian
Definición de meta → App + Especificación de Meta
Métricas → Database
Experimentos → Database + Obsidian
SOP → Obsidian + referencia en App
```

---

# 122. PRINCIPIO DE DUPLICACIÓN

No crear información duplicada innecesariamente.

Si los mismos datos existen en varios lugares, definir:

- fuente de verdad;
- dirección de sincronización;
- frecuencia de sincronización;
- resolución de conflictos.

---

# 123. RESOLUCIÓN DE CONFLICTOS

Cuando existan conflictos entre fuentes:

```
Datos operativos actuales verificados
>
Registro histórico
>
Notas del usuario
>
Inferencia de Claude
>
Supuesto externo
```

Los hechos históricos nunca deben sobrescribirse porque cambió el estado actual.

---

# 124. VISIÓN A LARGO PLAZO

El Personal Execution OS debe funcionar como:

```
OBJETIVO
↓
PLAN
↓
EJECUCIÓN
↓
MEDICIÓN
↓
INTELIGENCIA
↓
APRENDIZAJE
↓
ADAPTACIÓN
```

El usuario debe tomar progresivamente menos decisiones de bajo valor.

El sistema debe comprender cada vez mejor:

- qué intenta conseguir el usuario;
- qué ya ha intentado;
- qué funciona;
- qué no funciona;
- cuál es el cuello de botella actual;
- cuál debería ser el siguiente movimiento.

---

# 125. PRUEBA DEFINITIVA DEL PRODUCTO

El sistema funciona si el usuario puede abrirlo por la mañana y saber inmediatamente:

```
1. ¿Cuál es mi meta más importante?
2. ¿Qué tan lejos estoy?
3. ¿Estoy adelantado o atrasado?
4. ¿Qué debe suceder hoy?
5. ¿Cuáles son mis acciones P0?
6. ¿Qué evidencia demostrará que ejecuté?
```

Y por la noche:

```
1. ¿Qué ocurrió realmente?
2. ¿Qué aprendí?
3. ¿Qué está bloqueando el progreso?
4. ¿Qué debería cambiar?
5. ¿Qué debo hacer mañana?
```

Y después de semanas/meses:

```
1. ¿Qué he aprendido?
2. ¿Qué estrategias funcionaron?
3. ¿Cuáles fallaron?
4. ¿Qué patrones se repiten?
5. ¿Qué debería dejar de hacer?
6. ¿Cuál es el siguiente movimiento de mayor leverage?
```

---

# 126. PRINCIPIOS NO NEGOCIABLES

### 1. La meta primero

El sistema existe para conseguir metas.

### 2. La meta está bloqueada

No cambiar el objetivo casualmente.

### 3. Datos sobre emociones

Usar evidencia siempre que sea posible.

### 4. Ejecución sobre planificación

La planificación existe para facilitar la ejecución.

### 5. P0 > P1 > P2

Priorizar acciones productoras de resultados.

### 6. Hoy sobre todo

La interfaz principal es HOY.

### 7. Sin procrastinación productiva

El sistema no debe convertirse en una vía de escape.

### 8. Las hipótesis son temporales

Nunca confundir supuestos con verdad.

### 9. Experimentos sobre especulación

Cuando exista incertidumbre, probar.

### 10. Un cuello de botella a la vez

Concentrar el ciclo de optimización.

### 11. Claude propone, el usuario aprueba

La IA no cambia la estrategia silenciosamente.

### 12. Obsidian recuerda

No perder la historia estratégica.

### 13. Automatizar después de validar

Manual → Validado → Estandarizado → Automatizado.

### 14. Medir inputs y outputs

No medir únicamente actividad.

### 15. Preservar el histórico

Los fracasos y decisiones son datos valiosos.

---

# 127. DEFINICIÓN DE DONE — PERSONAL EXECUTION OS

El Personal Execution OS se considerará maduro cuando:

```
[ ] Se puede definir y bloquear una meta.
[ ] La meta puede descomponerse matemáticamente.
[ ] Una estrategia puede representarse como hipótesis.
[ ] Se pueden modelar escenarios Pesimista/Base/Optimista.
[ ] Se puede calcular la actividad requerida.
[ ] Se pueden generar acciones diarias.
[ ] Funcionan las prioridades P0/P1/P2.
[ ] Se puede registrar la ejecución diaria.
[ ] Se pueden registrar métricas de negocio.
[ ] Se pueden integrar datos automáticos.
[ ] Se puede comparar el output con el ritmo requerido.
[ ] Se pueden identificar cuellos de botella.
[ ] Se pueden crear y evaluar experimentos.
[ ] Se pueden registrar decisiones estratégicas.
[ ] Se pueden generar revisiones semanales.
[ ] Claude puede analizar datos históricos.
[ ] Obsidian almacena memoria de largo plazo.
[ ] Se puede consultar el conocimiento de Revolution.
[ ] Se pueden generar SOPs a partir de aprendizajes validados.
[ ] Se pueden bloquear/desbloquear metas secundarias.
[ ] El sistema minimiza distracciones.
[ ] El usuario puede operar principalmente desde HOY.
[ ] El sistema sigue siendo útil sin IA.
[ ] El sistema no necesita reconstruirse cuando cambia la estrategia.
```

---

# 128. ECUACIÓN FINAL DEL SISTEMA

El Personal Execution OS puede resumirse como:

```
META FIJA
+
MODELO MATEMÁTICO
+
HIPÓTESIS INICIAL
+
ROADMAP
+
EJECUCIÓN DIARIA
+
MEDICIÓN
+
FEEDBACK
+
DIAGNÓSTICO
+
EXPERIMENTACIÓN
+
APRENDIZAJE
+
ADAPTACIÓN
=
PROGRESO CONTINUO
```

Operativamente:

```
META
→
¿QUÉ DEBE SER CIERTO?
→
¿QUÉ DEBO HACER?
→
¿LO HICE?
→
¿QUÉ OCURRIÓ?
→
¿POR QUÉ?
→
¿QUÉ DEBE CAMBIAR?
→
PROBAR
→
APRENDER
→
REPETIR
```

---

# 129. PRINCIPIO MAESTRO

> **El sistema existe para que el usuario no tenga que estar descubriendo continuamente qué debe hacer.**

El usuario define el destino.

El sistema convierte el destino en un modelo medible.

El modelo genera las acciones requeridas.

El usuario ejecuta.

El sistema mide.

Claude analiza.

El usuario aprueba los cambios estratégicos.

Obsidian recuerda.

El sistema actualiza el plan.

El usuario vuelve a ejecutar.

El ciclo continúa hasta alcanzar la meta.

---

# 130. REGISTRO DE ENMIENDAS APROBADAS

Cambios a esta especificación aprobados explícitamente por el usuario. El detalle de cada uno (problema, impacto, razón) está en `SPEC-MATRIX.md §4` y `PHASE-A-DESIGN.md §3`.

| ID | Fecha | Sección | Enmienda |
|---|---|---|---|
| P-1 | 2026-10-06 | §12, §65 | OBJETIVOS es una entidad propia, distinta de META. |
| P-2 | 2026-10-06 | §26 | Los estados de ejecución (§26) se separan de los de planificación (inbox/next/today). OVERDUE y VERIFIED se derivan y no se guardan como estado. |
| P-3 | 2026-10-06 | §35, §65 | DAILY_LOGS es una entidad propia. |
| P-4 | 2026-10-06 | §36 | Las métricas tienen cuatro categorías: INPUT → PROCESO → OUTPUT → OUTCOME. |
| P-5 | 2026-10-06 | §20, §65 | ROADMAP_PHASES es una entidad versionada. |
| P-6 | 2026-10-06 | §59, §65 | IDEAS es una entidad propia. |
| P-7 | 2026-10-06 | §73 | Nueva estructura de carpetas de Obsidian (con HYPOTHESES) y mapeo configurable. |
| P-8 | 2026-10-06 | §109 | El archivo se llama `PERSONAL-OS-SPEC.md`. La auditoría vive en `AUDIT.md` + `SPEC-MATRIX.md`. |
| P-9 | 2026-10-06 | §64 | Se mantiene el kit de UI propio en lugar de shadcn/ui. |
| P-10 | 2026-10-06 | §43, §99, §100 | Capa de ingesta: SOURCE_DOCUMENTS → PLAN_IMPORTS → CHANGE_SETS → CHANGE_ITEMS → aprobación humana → entidades reales. Un plan no es una entidad duplicada: es la fuente más lo que generó. |
| P-11 | 2026-10-06 | §23, §34 | ROUTINES: patrón operativo recurrente de un Sistema que genera instancias de tarea. Su progreso se deriva de los datos reales. Las rutinas y los hábitos son entidades distintas. |
| P-12 | 2026-10-06 | §40 | Los experimentos modifican rutinas o sistemas mediante **intervenciones** temporales que conservan el valor base. |
| P-13 | 2026-10-06 | §67, §100, §101 | Origen (`origin`, `origin_change_item_id`, `created_by`), versión y archivado en todas las entidades de estrategia y ejecución. |
| P-14 | 2026-10-06 | §36, §54, §68 | Métricas y funnels como datos (no como código). VANT es una instancia, no la arquitectura. |
| P-15 | 2026-10-06 | §8, §23 | OBJETIVOS ↔ SISTEMAS es una relación de muchos a muchos. |

**Decisiones de arquitectura de A2:**

| ID | Fecha | Sección | Decisión |
|---|---|---|---|
| C-1 | 2026-10-06 | §10, §54, §68 | **Moneda:** COP es la moneda operativa de registro (los ingresos se guardan en COP, también los existentes). USD es la unidad en la que se expresa y evalúa la meta. El progreso convierte el acumulado **reconocido** en COP a USD con una tasa de referencia explícita (`fx_rates`: fecha, fuente, trazabilidad). La meta nunca se guarda como equivalente en COP. Ver la política de tasa más abajo. |
| C-2 | 2026-10-06 | §11, §56 | `locked_at` (meta activa inmutable) ≠ `activation_state='blocked'` (meta secundaria no activable). |
| C-3 | 2026-10-06 | §43, P-10 | `change_sets` es la única autoridad de aprobación y aplicación de paquetes de cambios. Una decisión vinculada refleja ese ciclo; EVALUADA es exclusivo de la decisión. Claude nunca aprueba sus propias propuestas. |
| C-4 | 2026-10-06 | §40 | Decisión de un experimento: `keep` (mantener) · `revert` (revertir al valor anterior) · `modify` (modificar antes de continuar) · `inconclusive` (sin ganador por falta de evidencia). Los registros previos `change` se migran a `modify`. |

| B-1 | 2026-10-06 | §28, §65 | P0/P1/P2 se **sugiere** a partir de datos y relaciones (plan aprobado → rutina → `priority_rules` → aporte a la meta actual = P1 → sin vínculo = P2). P0 solo sale de datos explícitos, nunca del texto del título. El usuario puede sobrescribir: se conserva la sugerencia y se registran fuente `user`, fecha y razón opcional en `activity_logs`. Es reversible. Nueva entidad PRIORITY_RULES (configuración como datos; Claude puede proponerlas, no aplicarlas). **Razón obligatoria solo al bajar desde P0 (P0 → P1/P2)**; opcional en los demás cambios; volver a Automático no la pide (lo garantiza la base, 0023). |
| B-3 | 2026-10-06 | §50 | Score de ejecución literal: (P0 + P1 completadas) ÷ (P0 + P1 planificadas). Una tarea cuantificada cuenta solo al alcanzar su objetivo; el avance parcial (17/60) se muestra pero no suma. Cambiar el modelo exigiría evidencia (hipótesis/experimento), no una decisión arbitraria. |
| B-2 | 2026-10-06 | §31, §32, §61 | Bloqueo **visual**, no funcional: un P0 incompleto implica prioridad visual, impacto en el score y advertencia. La navegación nunca se bloquea. |

**Política de tasa de cambio (C-1):**
1. **Tasa de referencia:** se usa la tasa USD→COP más reciente registrada por el usuario con `rate_date ≤` la fecha de evaluación.
2. **Vigencia máxima: 31 días.** Si no existe ninguna tasa, o la más reciente es más antigua, el progreso en USD se muestra como **pendiente de conversión** y solo se muestra el acumulado en COP. Nunca se usa una cifra estimada presentada como exacta.
3. **No hay tasas en el código.** Toda tasa es un dato con fecha, fuente y referencia.
4. **Actualizar la tasa no reescribe nada.** Los ingresos originales en COP no cambian; solo cambia el equivalente calculado. Las revisiones guardan la tasa usada en su snapshot.
5. **Transparencia:** la interfaz muestra la meta en USD, el progreso en USD (o pendiente), el acumulado original en COP, el % de cumplimiento y la tasa usada con su fecha y fuente.

**Pendiente de decisión del usuario:** la spec no define qué cuenta como **ingreso reconocido**. Ver el informe de A2.

**Meta activa (decisión del usuario, 2026-10-06):** 5.000 USD acumulados antes del 2026-12-31, bloqueada. La moneda principal es USD; las equivalencias en COP son solo una representación secundaria. La descomposición comercial (clientes × precio) **no** es parte de la meta: se modela como objetivos, hipótesis o escenarios derivados.