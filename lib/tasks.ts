/**
 * Vocabulario de acciones (Goal → Outcome → Lever → Action), compartido entre
 * la acción del servidor y los formularios. La palanca dice *cómo* una tarea
 * mueve su meta; el motor de prioridad (Fase 3) la usa junto a impacto/esfuerzo.
 */

export const TASK_LEVERS = [
  "outbound",
  "follow_up",
  "sales_call",
  "offer",
  "validation",
  "delivery",
  "build",
  "content",
  "admin",
  "study",
  "personal",
] as const;
export type TaskLever = (typeof TASK_LEVERS)[number];

export const TASK_LEVER_LABEL: Record<TaskLever, string> = {
  outbound: "Prospección",
  follow_up: "Seguimiento",
  sales_call: "Llamada de venta",
  offer: "Oferta / propuesta",
  validation: "Validación de mercado",
  delivery: "Entrega a cliente",
  build: "Construcción",
  content: "Contenido",
  admin: "Administración",
  study: "Estudio",
  personal: "Personal",
};

export const EXECUTION_MODES = ["deep", "shallow", "passive"] as const;
export const EXECUTION_MODE_LABEL: Record<(typeof EXECUTION_MODES)[number], string> = {
  deep: "Profundo (concentración sostenida)",
  shallow: "Ligero (mensajes, admin)",
  passive: "Pasivo (transporte, celular)",
};

export const DEVICES = ["any", "desktop", "phone"] as const;
export const DEVICE_LABEL: Record<(typeof DEVICES)[number], string> = {
  any: "Cualquiera",
  desktop: "Computador",
  phone: "Celular",
};
