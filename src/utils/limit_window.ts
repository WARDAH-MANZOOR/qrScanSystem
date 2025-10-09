import { toZonedTime } from "date-fns-tz";
import { startOfDay, startOfWeek, startOfMonth, addDays, addWeeks, addMonths } from "date-fns";
import { LimitPeriod } from "@prisma/client";

/**
 * Returns the current window [start, end) in UTC for DAY/WEEK/MONTH,
 * computed in the given time zone (e.g. "Asia/Karachi").
 * We return end as **exclusive** (start of the next window).
 */
export function computeWindow(
  period: LimitPeriod,
  tz = "Asia/Karachi",
  weekStartDow = 1
) {
  // 1) Take "now" and view it in the chosen time zone (wall clock).
  const now = new Date();
  const localNow = toZonedTime(now, tz);

  if (period === "DAY") {
    const localStart = startOfDay(localNow);
    const localEndExclusive = addDays(localStart, 1);
    return {
      start: toZonedTime(localStart, tz),
      end: toZonedTime(localEndExclusive, tz),
    };
  }

  throw new Error(`Unknown period: ${period}`);
}
