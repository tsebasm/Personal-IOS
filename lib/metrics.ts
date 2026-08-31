import { shiftIsoDate } from "./date";

/**
 * Consecutive-day streak ending today (or yesterday, if today hasn't been
 * logged yet — the day isn't over, so a missing "today" log doesn't break
 * the streak the way a missing yesterday would).
 */
export function computeStreak(doneDates: Set<string>, todayIso: string): number {
  let cursor = todayIso;
  if (!doneDates.has(cursor)) {
    cursor = shiftIsoDate(cursor, -1);
    if (!doneDates.has(cursor)) return 0;
  }
  let streak = 0;
  while (doneDates.has(cursor)) {
    streak++;
    cursor = shiftIsoDate(cursor, -1);
  }
  return streak;
}
