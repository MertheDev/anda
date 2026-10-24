import type { AndaEvent, EventCategory, EventFilters, TimeFilter } from '@/types/event';

const DAY = 86_400_000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** [from, to) in epoch ms for a time filter, or null for "any". */
function timeWindow(filter: TimeFilter, now: Date): [number, number] | null {
  const today = startOfDay(now).getTime();
  switch (filter) {
    case 'any':
      return null;
    case 'now':
      return [now.getTime(), now.getTime() + 1];
    case 'today':
      return [now.getTime(), today + DAY];
    case 'tonight':
      return [today + 18 * 3_600_000, today + DAY];
    case 'tomorrow':
      return [today + DAY, today + 2 * DAY];
    case 'weekend': {
      // Upcoming Saturday 00:00 to Monday 00:00 (the current weekend if it is already Sat/Sun).
      const dow = now.getDay(); // 0 = Sunday
      const toSaturday = dow === 0 ? -1 : 6 - dow;
      const saturday = today + toSaturday * DAY;
      return [Math.max(saturday, now.getTime()), saturday + 2 * DAY];
    }
  }
}

/** An event matches a window when it overlaps it and has not already ended. */
export function matchesTime(event: AndaEvent, filter: TimeFilter, now: Date = new Date()): boolean {
  const start = Date.parse(event.startsAt);
  const end = Date.parse(event.endsAt);
  if (end <= now.getTime()) return false;
  const window = timeWindow(filter, now);
  if (!window) return true;
  return start < window[1] && end > window[0];
}

/** Everything except the category selection, so chip counters reflect the other filters. */
export function applyBaseFilters(events: AndaEvent[], filters: EventFilters, now: Date = new Date()): AndaEvent[] {
  return events.filter((e) => {
    if (!matchesTime(e, filters.time, now)) return false;
    if (filters.type !== 'all' && e.type !== filters.type) return false;
    if (filters.price === 'free' && e.priceCents > 0) return false;
    if (filters.price === 'paid' && e.priceCents === 0) return false;
    return true;
  });
}

export function applyFilters(events: AndaEvent[], filters: EventFilters, now: Date = new Date()): AndaEvent[] {
  const base = applyBaseFilters(events, filters, now);
  if (filters.categories.length === 0) return base;
  return base.filter((e) => filters.categories.includes(e.category));
}

export function countByCategory(events: AndaEvent[]): Record<EventCategory, number> {
  const counts: Record<EventCategory, number> = {
    music: 0,
    food: 0,
    nightlife: 0,
    sports: 0,
    art: 0,
    community: 0,
    other: 0,
  };
  for (const e of events) counts[e.category] += 1;
  return counts;
}

/** [west, south, east, north] */
export type Bounds = [number, number, number, number];

export function inBounds(event: AndaEvent, bounds: Bounds): boolean {
  const [lng, lat] = event.lngLat;
  return lng >= bounds[0] && lng <= bounds[2] && lat >= bounds[1] && lat <= bounds[3];
}
