import { EVENTS } from '@/data/events';
import { supabase } from '@/lib/supabase';
import type { AndaEvent, EventCategory } from '@/types/event';

/** Row shape returned by the `events_feed` RPC. */
interface FeedRow {
  id: string;
  type: 'user' | 'business';
  category: EventCategory;
  title: string;
  host_name: string;
  venue_name: string;
  city: string | null;
  lng: number;
  lat: number;
  starts_at: string;
  ends_at: string;
  price_cents: number;
  currency: 'TRY' | 'EUR';
  capacity: number | null;
  ticket_url: string | null;
  attendee_count: number;
  joined: boolean;
  attendees: { id: string; name: string; avatarUrl: string | null }[];
}

function fromRow(row: FeedRow): AndaEvent {
  return {
    id: row.id,
    type: row.type,
    category: row.category,
    title: row.title,
    hostName: row.host_name,
    venueName: row.venue_name,
    city: row.city ?? '',
    lngLat: [row.lng, row.lat],
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    priceCents: row.price_cents,
    currency: row.currency,
    capacity: row.capacity ?? undefined,
    attendeeCount: row.attendee_count,
    attendees: row.attendees.map((a) => ({ id: a.id, name: a.name, avatarUrl: a.avatarUrl ?? undefined })),
    ticketUrl: row.ticket_url ?? undefined,
    joined: row.joined,
  };
}

/** Whole of Europe; the feed is capped at 500 rows server-side. */
const EUROPE: [number, number, number, number] = [-31, 34, 45, 72];

export async function fetchEvents(): Promise<AndaEvent[]> {
  if (!supabase) return EVENTS;
  const [west, south, east, north] = EUROPE;
  const { data, error } = await supabase.rpc('events_feed', {
    p_west: west,
    p_south: south,
    p_east: east,
    p_north: north,
  });
  if (error) throw error;
  return (data as FeedRow[]).map(fromRow);
}

export type JoinError = 'notAuthenticated' | 'full' | 'unavailable' | 'failed';

export async function joinEvent(eventId: string): Promise<{ count: number } | { error: JoinError }> {
  if (!supabase) return { error: 'failed' };
  const { data, error } = await supabase.rpc('join_event', { p_event_id: eventId });
  if (error) return { error: mapRpcError(error.message) };
  return { count: data as number };
}

export async function leaveEvent(eventId: string): Promise<{ count: number } | { error: JoinError }> {
  if (!supabase) return { error: 'failed' };
  const { data, error } = await supabase.rpc('leave_event', { p_event_id: eventId });
  if (error) return { error: mapRpcError(error.message) };
  return { count: data as number };
}

function mapRpcError(message: string): JoinError {
  if (message.includes('not_authenticated')) return 'notAuthenticated';
  if (message.includes('event_full')) return 'full';
  if (message.includes('event_unavailable')) return 'unavailable';
  return 'failed';
}

export interface NewEvent {
  title: string;
  category: EventCategory;
  venueName: string;
  city: string;
  lng: number;
  lat: number;
  startsAt: string;
  endsAt: string;
  priceCents: number;
  capacity?: number;
  ticketUrl?: string;
}

export async function createEvent(input: NewEvent): Promise<{ id: string } | { error: 'backendOff' | 'failed' }> {
  if (!supabase) return { error: 'backendOff' };
  const { data, error } = await supabase.rpc('create_event', {
    p_title: input.title,
    p_category: input.category,
    p_venue_name: input.venueName,
    p_city: input.city,
    p_lng: input.lng,
    p_lat: input.lat,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_price_cents: input.priceCents,
    p_capacity: input.capacity ?? null,
    p_ticket_url: input.ticketUrl ?? null,
  });
  if (error) return { error: 'failed' };
  return { id: data as string };
}

export async function reportEvent(eventId: string, reason: string, reporterId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from('reports')
    .insert({ reporter_id: reporterId, target_type: 'event', target_id: eventId, reason: reason.slice(0, 500) });
  return !error;
}
