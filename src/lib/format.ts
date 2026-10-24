import type { TFunction } from 'i18next';

import type { AndaEvent } from '@/types/event';

const DAY = 86_400_000;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** "Happening now", "Today 18:30 – 21:00", "Tomorrow 20:00 – 23:00" or a dated range. */
export function formatWhen(event: AndaEvent, t: TFunction, locale: string, now: Date = new Date()): string {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  const range = `${time.format(start)} – ${time.format(end)}`;

  if (start <= now && end > now) return `${t('event.startsNow')} · ${time.format(end)}`;
  const dayDiff = Math.round((startOfDay(start) - startOfDay(now)) / DAY);
  if (dayDiff === 0) return `${t('event.today')} ${range}`;
  if (dayDiff === 1) return `${t('event.tomorrow')} ${range}`;
  const date = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  return `${date.format(start)} ${range}`;
}

export function formatPrice(event: AndaEvent, t: TFunction, locale: string): string {
  if (event.priceCents === 0) return t('event.free');
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: event.currency,
    minimumFractionDigits: event.priceCents % 100 === 0 ? 0 : 2,
  }).format(event.priceCents / 100);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase();
}
