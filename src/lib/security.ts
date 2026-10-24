import { Linking } from 'react-native';
import { z } from 'zod';

/**
 * Returns the URL only if it is a well-formed https URL, otherwise null.
 * User- and business-supplied links must go through this before being opened.
 */
export function safeHttpsUrl(input: string | undefined | null): string | null {
  if (!input) return null;
  try {
    const url = new URL(input.trim());
    if (url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function openExternalUrl(input: string | undefined | null): Promise<boolean> {
  const safe = safeHttpsUrl(input);
  if (!safe) return false;
  await Linking.openURL(safe);
  return true;
}

/** Strips control characters and collapses whitespace in user-provided text. */
export function cleanText(input: string, maxLength: number): string {
  return input.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

/** Schema used when a user or business creates an event (client-side validation; the DB enforces the same limits). */
export const eventInputSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    category: z.enum(['music', 'food', 'nightlife', 'sports', 'art', 'community', 'other']),
    venueName: z.string().trim().min(2).max(120),
    lng: z.number().min(-31).max(45),
    lat: z.number().min(34).max(72),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    priceCents: z.number().int().min(0).max(1_000_000),
    capacity: z.number().int().min(2).max(10_000).optional(),
    ticketUrl: z
      .string()
      .optional()
      .refine((v) => !v || safeHttpsUrl(v) !== null, 'Only https links are allowed'),
  })
  .refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
    message: 'End must be after start',
    path: ['endsAt'],
  });

export type EventInput = z.infer<typeof eventInputSchema>;
