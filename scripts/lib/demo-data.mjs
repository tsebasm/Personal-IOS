import { shiftIsoDate } from "./date.mjs";

// Misma paleta que app/dashboard/areas/create-button.tsx.
const SWATCHES = {
  green: "#22C55E",
  yellow: "#EAB308",
  blue: "#3B82F6",
  purple: "#8B5CF6",
  pink: "#EC4899",
};

/**
 * Plan completo de datos demo: 5 áreas, cada una con 2 metas (goals de nivel
 * superior) y 2 objetivos por meta (goals hijos vía parent_goal_id), y 7
 * hábitos con distinto % de cumplimiento repartidos entre las áreas.
 *
 * `today` es la fecha ISO ("YYYY-MM-DD") en el timezone del usuario.
 */
export function buildDemoPlan(today) {
  const inDays = (n) => shiftIsoDate(today, n);

  const areas = [
    {
      key: "salud",
      name: "Salud",
      color: SWATCHES.green,
      goals: [
        {
          key: "meta-peso",
          title: "Llegar a 65 kg",
          description: "Bajar de forma sostenible acompañando el entrenamiento con la dieta.",
          horizon: "anual",
          kind: "metric",
          unit: "kg",
          target_value: 65,
          current_value: 71,
          priority: "alta",
          deadline: inDays(150),
          children: [
            {
              title: "Bajar 2 kg este trimestre",
              horizon: "trimestral",
              kind: "metric",
              unit: "kg",
              target_value: 2,
              current_value: 2,
              status: "cumplido",
              deadline: inDays(-5),
            },
            {
              title: "Mantener déficit calórico constante",
              horizon: "mensual",
              kind: "ongoing",
              status: "activo",
              deadline: inDays(20),
            },
          ],
        },
        {
          key: "meta-entrenar",
          title: "Entrenar constantemente",
          description: "Consistencia por encima de intensidad.",
          horizon: "anual",
          kind: "ongoing",
          priority: "media",
          children: [
            {
              title: "4 sesiones de fuerza por semana",
              horizon: "mensual",
              kind: "ongoing",
              status: "activo",
            },
            {
              title: "Correr 10k sin parar",
              horizon: "trimestral",
              kind: "milestone",
              status: "pausado",
              deadline: inDays(60),
            },
          ],
        },
      ],
    },
    {
      key: "finanzas",
      name: "Finanzas",
      color: SWATCHES.yellow,
      goals: [
        {
          key: "meta-ingresos",
          title: "Alcanzar meta de ingresos mensuales",
          description: "Ingresos mensuales estables por encima del punto de equilibrio.",
          horizon: "anual",
          kind: "metric",
          unit: "COP",
          target_value: 8000000,
          current_value: 5200000,
          priority: "alta",
          deadline: inDays(120),
          children: [
            {
              title: "Cerrar 2 clientes nuevos",
              horizon: "trimestral",
              kind: "metric",
              unit: "clientes",
              target_value: 2,
              current_value: 2,
              status: "cumplido",
              deadline: inDays(-10),
            },
            {
              title: "Subir tarifa de servicios",
              horizon: "mensual",
              kind: "milestone",
              status: "activo",
              deadline: inDays(15),
            },
          ],
        },
        {
          key: "meta-fondo",
          title: "Crear fondo de emergencia",
          description: "Cubrir 6 meses de gastos fijos.",
          horizon: "anual",
          kind: "metric",
          unit: "COP",
          target_value: 6000000,
          current_value: 2400000,
          priority: "media",
          children: [
            {
              title: "Ahorrar 500.000 este mes",
              horizon: "mensual",
              kind: "metric",
              unit: "COP",
              target_value: 500000,
              current_value: 150000,
              status: "activo",
            },
            {
              title: "Automatizar transferencia de ahorro",
              horizon: "mensual",
              kind: "milestone",
              status: "pausado",
            },
          ],
        },
      ],
    },
    {
      key: "carrera",
      name: "Carrera / Universidad",
      color: SWATCHES.blue,
      goals: [
        {
          key: "meta-carrera",
          title: "Terminar la carrera",
          description: "Últimos semestres, sin perder el enfoque.",
          horizon: "largo_plazo",
          kind: "milestone",
          priority: "alta",
          deadline: inDays(300),
          children: [
            {
              title: "Aprobar el semestre actual",
              horizon: "trimestral",
              kind: "milestone",
              status: "activo",
              deadline: inDays(45),
            },
            {
              title: "Definir tema del proyecto de grado",
              horizon: "trimestral",
              kind: "milestone",
              status: "cumplido",
              deadline: inDays(-20),
            },
          ],
        },
        {
          key: "meta-programacion",
          title: "Mejorar habilidades de programación",
          description: "De consumir tutoriales a construir cosas propias.",
          horizon: "anual",
          kind: "ongoing",
          priority: "media",
          children: [
            {
              title: "Terminar curso avanzado de TypeScript",
              horizon: "mensual",
              kind: "milestone",
              status: "cumplido",
              deadline: inDays(-8),
            },
            {
              title: "Construir 3 proyectos personales",
              horizon: "trimestral",
              kind: "metric",
              unit: "proyectos",
              target_value: 3,
              current_value: 1,
              status: "activo",
              deadline: inDays(70),
            },
          ],
        },
      ],
    },
    {
      key: "negocio",
      name: "Negocio",
      color: SWATCHES.purple,
      goals: [
        {
          key: "meta-escalar",
          title: "Escalar el negocio a 10 clientes activos",
          description: "Crecimiento sostenible sin sacrificar calidad de servicio.",
          horizon: "anual",
          kind: "metric",
          unit: "clientes",
          target_value: 10,
          current_value: 4,
          priority: "alta",
          deadline: inDays(200),
          children: [
            {
              title: "Lanzar nueva oferta de servicio",
              horizon: "trimestral",
              kind: "milestone",
              status: "activo",
              deadline: inDays(40),
            },
            {
              title: "Automatizar el onboarding de clientes",
              horizon: "trimestral",
              kind: "milestone",
              status: "pausado",
            },
          ],
        },
        {
          key: "meta-procesos",
          title: "Mejorar procesos internos",
          description: "Menos improvisación, más sistema.",
          horizon: "anual",
          kind: "ongoing",
          priority: "media",
          children: [
            {
              title: "Documentar procedimientos clave (SOPs)",
              horizon: "mensual",
              kind: "milestone",
              status: "cumplido",
              deadline: inDays(-12),
            },
            {
              title: "Implementar CRM",
              horizon: "trimestral",
              kind: "milestone",
              status: "activo",
              deadline: inDays(50),
            },
          ],
        },
      ],
    },
    {
      key: "desarrollo-personal",
      name: "Desarrollo personal",
      color: SWATCHES.pink,
      goals: [
        {
          key: "meta-lectura",
          title: "Leer 20 libros este año",
          description: "Ficción y no ficción, en balance.",
          horizon: "anual",
          kind: "metric",
          unit: "libros",
          target_value: 20,
          current_value: 9,
          priority: "media",
          children: [
            {
              title: "Leer 2 libros este mes",
              horizon: "mensual",
              kind: "metric",
              unit: "libros",
              target_value: 2,
              current_value: 1,
              status: "activo",
            },
            {
              title: "Terminar el libro del club de lectura",
              horizon: "mensual",
              kind: "milestone",
              status: "cumplido",
              deadline: inDays(-3),
            },
          ],
        },
        {
          key: "meta-meditacion",
          title: "Construir el hábito de meditación",
          description: "Consistencia diaria antes que duración.",
          horizon: "anual",
          kind: "ongoing",
          priority: "baja",
          children: [
            {
              title: "Meditar 10 minutos diarios",
              horizon: "mensual",
              kind: "ongoing",
              status: "activo",
            },
            {
              title: "Tomar curso de mindfulness",
              horizon: "trimestral",
              kind: "milestone",
              status: "pausado",
              deadline: inDays(80),
            },
          ],
        },
      ],
    },
  ];

  // % de cumplimiento deliberadamente variado (ver AGENTS del prompt original).
  const habits = [
    { title: "Trabajar en el negocio", areaKey: "negocio", goalKey: "meta-escalar", completionRate: 1.0 },
    { title: "Entrenar", areaKey: "salud", goalKey: "meta-entrenar", completionRate: 0.9 },
    { title: "Beber agua", areaKey: "salud", goalKey: null, completionRate: 0.85 },
    { title: "Leer", areaKey: "desarrollo-personal", goalKey: "meta-lectura", completionRate: 0.75 },
    { title: "Meditar", areaKey: "desarrollo-personal", goalKey: "meta-meditacion", completionRate: 0.6 },
    { title: "Dormir temprano", areaKey: "salud", goalKey: null, completionRate: 0.55 },
    { title: "Estudiar programación", areaKey: "carrera", goalKey: "meta-programacion", completionRate: 0.4 },
  ];

  return { areas, habits };
}

/**
 * Plan de actividad para el resto del Dashboard: proyectos activos, tareas
 * (hoy + backlog con deadline + la última semana) y agenda del día — todo
 * usando las mismas tablas/columnas que la app (tasks, projects,
 * calendar_events), para que las tarjetas del Dashboard lo calculen solas.
 *
 * `areaKeys`/`goalKeys` deben coincidir con las keys de `buildDemoPlan`.
 */
export function buildDashboardActivityPlan(today) {
  const inDays = (n) => shiftIsoDate(today, n);

  const projects = [
    {
      key: "sop",
      title: "Sistema Operativo Personal",
      description: "El propio dashboard: áreas, metas, hábitos y tareas en un solo lugar.",
      status: "activo",
      areaKey: "desarrollo-personal",
      goalKey: null,
      deadline: inDays(90),
    },
    {
      key: "vant",
      title: "Agencia VANT",
      description: "Adquisición de clientes y entrega del servicio.",
      status: "activo",
      areaKey: "negocio",
      goalKey: "meta-escalar",
      deadline: inDays(60),
    },
    {
      key: "universidad",
      title: "Universidad",
      description: "Semestre en curso y proyecto de grado.",
      status: "activo",
      areaKey: "carrera",
      goalKey: "meta-carrera",
      deadline: inDays(150),
    },
  ];

  // scheduledOffset: día relativo a hoy (0 = hoy, -1 = ayer...) o null (sin
  // agendar — solo backlog con deadline). deadlineOffset: idem, o null.
  const tasks = [
    // Hoy: 8 tareas (5 completadas, 3 pendientes) — alimenta productividad,
    // tareas completadas, tiempo enfocado (suma de estimated_minutes de las
    // completadas) y la agenda de hoy.
    { title: "Enviar propuesta a Agencia VANT", status: "done", priority: "alta", scheduledOffset: 0, estimatedMinutes: 45, projectKey: "vant" },
    { title: "Entrenar en el gimnasio", status: "done", priority: "media", scheduledOffset: 0, estimatedMinutes: 60, areaKey: "salud" },
    { title: "Repasar apuntes de la universidad", status: "done", priority: "media", scheduledOffset: 0, estimatedMinutes: 30, projectKey: "universidad" },
    { title: "Responder correos pendientes", status: "done", priority: "baja", scheduledOffset: 0, estimatedMinutes: 20 },
    { title: "Revisar métricas de campañas activas", status: "done", priority: "alta", scheduledOffset: 0, estimatedMinutes: 25, projectKey: "vant" },
    { title: "Preparar presentación para reunión", status: "in_progress", priority: "alta", scheduledOffset: 0, deadlineOffset: 0 },
    { title: "Estudiar para el parcial", status: "next", priority: "media", scheduledOffset: 0, projectKey: "universidad" },
    { title: "Actualizar hoja de gastos", status: "inbox", priority: "baja", scheduledOffset: 0, areaKey: "finanzas" },

    // Backlog con deadline (no agendadas hoy) — alimenta "Tareas prioritarias".
    { title: "Crear propuesta comercial nueva", status: "next", priority: "alta", deadlineOffset: 3, projectKey: "vant" },
    { title: "Revisar finanzas personales del mes", status: "inbox", priority: "media", deadlineOffset: 2, areaKey: "finanzas" },
    { title: "Estudiar programación: React avanzado", status: "next", priority: "alta", deadlineOffset: 5, areaKey: "carrera" },
    { title: "Revisar resultados de campaña de anuncios", status: "waiting", priority: "media", deadlineOffset: 1, projectKey: "vant" },
    { title: "Planear próximo sprint del producto", status: "next", priority: "baja", deadlineOffset: 7, projectKey: "sop" },

    // Últimos 7 días (excluyendo hoy) — alimenta "Progreso semanal" y,
    // porque varias tienen projectKey, también el % de los proyectos activos.
    { title: "Sesión de prospección en frío", status: "done", priority: "media", scheduledOffset: -6, projectKey: "vant" },
    { title: "Entrenar piernas", status: "done", priority: "media", scheduledOffset: -6, areaKey: "salud" },
    { title: "Leer un capítulo de libro", status: "done", priority: "baja", scheduledOffset: -6, areaKey: "desarrollo-personal" },
    { title: "Organizar el escritorio de trabajo", status: "inbox", priority: "baja", scheduledOffset: -6 },

    { title: "Grabar contenido para redes", status: "done", priority: "media", scheduledOffset: -5, projectKey: "vant" },
    { title: "Clase de universidad", status: "done", priority: "media", scheduledOffset: -5, projectKey: "universidad" },
    { title: "Actualizar CRM de clientes", status: "next", priority: "alta", scheduledOffset: -5, projectKey: "vant" },

    { title: "Reunión con cliente potencial", status: "done", priority: "alta", scheduledOffset: -4, projectKey: "vant" },
    { title: "Entrenar cardio", status: "done", priority: "media", scheduledOffset: -4, areaKey: "salud" },
    { title: "Revisar avance del proyecto SOP", status: "done", priority: "media", scheduledOffset: -4, projectKey: "sop" },
    { title: "Pagar servicios del mes", status: "done", priority: "baja", scheduledOffset: -4, areaKey: "finanzas" },
    { title: "Preparar quiz de universidad", status: "next", priority: "media", scheduledOffset: -4, projectKey: "universidad" },

    { title: "Reunión de equipo semanal", status: "done", priority: "media", scheduledOffset: -3, projectKey: "sop" },
    { title: "Seguimiento de leads pendientes", status: "waiting", priority: "alta", scheduledOffset: -3, projectKey: "vant" },

    { title: "Descanso activo / caminata", status: "done", priority: "baja", scheduledOffset: -2, areaKey: "salud" },
    { title: "Responder mensajes acumulados", status: "inbox", priority: "baja", scheduledOffset: -2 },
    { title: "Planear la semana entrante", status: "next", priority: "media", scheduledOffset: -2 },
    { title: "Revisar métricas del negocio", status: "waiting", priority: "media", scheduledOffset: -2, projectKey: "vant" },

    { title: "Cerrar tareas pendientes del día", status: "done", priority: "media", scheduledOffset: -1 },
    { title: "Llamada con cliente", status: "done", priority: "alta", scheduledOffset: -1, projectKey: "vant" },
    { title: "Actualizar documentación del SOP", status: "done", priority: "baja", scheduledOffset: -1, projectKey: "sop" },
  ].map((t) => ({
    ...t,
    scheduled_date: t.scheduledOffset != null ? inDays(t.scheduledOffset) : null,
    deadline: t.deadlineOffset != null ? inDays(t.deadlineOffset) : null,
  }));

  // Agenda de hoy — calendar_events, distribuidas durante el día.
  const calendarEvents = [
    { title: "Entrenamiento", time: "08:00", durationMinutes: 60 },
    { title: "Bloque de estudio", time: "10:00", durationMinutes: 90 },
    { title: "Trabajo en Agencia VANT", time: "14:00", durationMinutes: 120 },
    { title: "Clase de universidad", time: "18:30", durationMinutes: 90 },
    { title: "Lectura antes de dormir", time: "20:30", durationMinutes: 30 },
  ];

  return { projects, tasks, calendarEvents };
}

/** PRNG determinista (mulberry32) — mismos datos demo en cada corrida. */
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

/**
 * Fechas "done" de los últimos `days` días para un hábito: exactamente
 * round(completionRate * days) días marcados, elegidos con un shuffle
 * determinista — así el % de cumplimiento resultante coincide con el
 * objetivo en vez de solo aproximarse (una probabilidad independiente por
 * día puede desviarse bastante en solo 30 muestras).
 */
export function buildHabitLogDates(today, days, completionRate, seedKey) {
  const rand = mulberry32(hashString(seedKey));
  const indices = Array.from({ length: days }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const count = Math.round(completionRate * days);
  const doneOffsets = indices.slice(0, count).sort((a, b) => a - b);
  return doneOffsets.map((offsetFromEnd) => shiftIsoDate(today, -(days - 1 - offsetFromEnd)));
}
