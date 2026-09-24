/**
 * Time Allocation Analytics: asignación real del tiempo vs la que el plan
 * requiere. Produce una EXECUTION GAP en horas/porcentaje — una medida de
 * dónde fue el recurso, no un juicio moral.
 */

export const TIME_CATEGORIES = ["ventas", "construccion", "estudio", "admin", "personal", "recuperacion", "perdido"] as const;
export type TimeCategory = (typeof TIME_CATEGORIES)[number];

export const TIME_CATEGORY_LABEL: Record<TimeCategory, string> = {
  ventas: "Ventas / adquisición",
  construccion: "Construcción",
  estudio: "Estudio",
  admin: "Administración",
  personal: "Personal",
  recuperacion: "Descanso",
  perdido: "Tiempo no intencional",
};

export type TimeEntryLike = { date: string; minutes: number; category: TimeCategory | string };

export type Allocation = {
  totalMinutes: number;
  byCategory: Record<TimeCategory, number>;
  /** % sobre el total registrado (null si no hay registros). */
  share: Record<TimeCategory, number | null>;
};

export function computeAllocation(entries: TimeEntryLike[]): Allocation {
  const byCategory = Object.fromEntries(TIME_CATEGORIES.map((c) => [c, 0])) as Record<TimeCategory, number>;
  for (const e of entries) {
    if ((TIME_CATEGORIES as readonly string[]).includes(e.category) && e.minutes > 0) {
      byCategory[e.category as TimeCategory] += e.minutes;
    }
  }
  const totalMinutes = TIME_CATEGORIES.reduce((s, c) => s + byCategory[c], 0);
  const share = Object.fromEntries(
    TIME_CATEGORIES.map((c) => [c, totalMinutes > 0 ? (byCategory[c] / totalMinutes) * 100 : null])
  ) as Record<TimeCategory, number | null>;
  return { totalMinutes, byCategory, share };
}

export type ExecutionGap = {
  /** Minutos de ventas que el plan requiere en el período. */
  requiredSalesMinutes: number;
  actualSalesMinutes: number;
  /** actual − requerido (negativo = faltó). */
  gapMinutes: number;
  /** % de la capacidad utilizable que el plan exige para ventas. */
  requiredSalesShareOfCapacity: number | null;
  actualSalesShareOfLogged: number | null;
};

/**
 * Compara horas de ventas requeridas por el plan (cuota diaria × minutos por
 * contacto × días de prospección del período) contra las realmente
 * registradas. Las demás categorías no tienen un "requerido" derivable de
 * datos todavía, así que no se inventa uno.
 */
export function computeExecutionGap(input: {
  allocation: Allocation;
  dailySalesMinutesRequired: number | null;
  outreachDaysInPeriod: number;
  capacityMinutesInPeriod: number;
}): ExecutionGap | null {
  if (input.dailySalesMinutesRequired === null) return null;
  const requiredSalesMinutes = input.dailySalesMinutesRequired * input.outreachDaysInPeriod;
  const actualSalesMinutes = input.allocation.byCategory.ventas;
  return {
    requiredSalesMinutes,
    actualSalesMinutes,
    gapMinutes: actualSalesMinutes - requiredSalesMinutes,
    requiredSalesShareOfCapacity:
      input.capacityMinutesInPeriod > 0 ? (requiredSalesMinutes / input.capacityMinutesInPeriod) * 100 : null,
    actualSalesShareOfLogged: input.allocation.share.ventas,
  };
}

/** Días de prospección esperados en `days` según días/semana del plan (null = todos). */
export function outreachDaysIn(days: number, perWeek: number | null): number {
  return Math.floor((days * (perWeek ?? 7)) / 7);
}
