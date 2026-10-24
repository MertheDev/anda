import type { EventCategory } from '@/types/event';

export const colors = {
  primary: '#FF4D6A',
  primaryDark: '#E23B57',
  join: '#34A853',
  link: '#2F6FED',
  text: '#16161A',
  textMuted: '#6B6B76',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F3F6',
  border: '#E4E4EA',
  danger: '#D93025',
  business: '#7B3FF2',
  shadow: '#000000',
} as const;

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;

export const categoryMeta: Record<EventCategory, { emoji: string; color: string }> = {
  music: { emoji: '🎵', color: '#7B3FF2' },
  food: { emoji: '🍽️', color: '#F59E0B' },
  nightlife: { emoji: '🎉', color: '#FF4D6A' },
  sports: { emoji: '🏃', color: '#10B981' },
  art: { emoji: '🎨', color: '#EC4899' },
  community: { emoji: '🤝', color: '#2F6FED' },
  other: { emoji: '✨', color: '#6B7280' },
};

export const CATEGORIES = Object.keys(categoryMeta) as EventCategory[];
