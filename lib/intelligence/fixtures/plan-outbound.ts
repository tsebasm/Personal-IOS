/** Plan de ejemplo del criterio de aceptación de la Fase A (PHASE-A-DESIGN §6). Datos de prueba, no reales. */
export const PLAN_FIXTURE = `---
plan: Adquisición outbound 60 días
inicio: 2026-10-07
---
## Objetivo
Conseguir 5 clientes
- meta: 5 clientes
- plazo: 60 días
- métrica: closes

## Sistema
Adquisición outbound
- tipo: acquisition
- canal: social_outbound
- embudo: contacts, replies, meetings_booked, proposals, closes

## Hipótesis
Aumentar el volumen de prospectos de 30 a 60 diarios aumentará proporcionalmente las oportunidades
- tipo: volume
- confianza: low
- base: supuesto

## Rutina
Contactar prospectos
- métrica: contacts
- objetivo: 30 contactos
- cadencia: weekdays
- prioridad: p0

## Experimento
Volumen 30 → 60
- variable: prospectos contactados por día
- intervención: Contactar prospectos = 60 durante 14 días
- métrica: replies
- muestra: 600

## Proyecto
Campaña de adquisición outbound

## Tareas
- [p0] Construir lista de prospectos: 840 prospectos
- [p1] Preparar guion de outbound
`;
