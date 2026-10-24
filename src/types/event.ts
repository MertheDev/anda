export type EventCategory = 'music' | 'food' | 'nightlife' | 'sports' | 'art' | 'community' | 'other';

export type EventType = 'user' | 'business';

export interface Attendee {
  id: string;
  name: string;
  avatarUrl?: string;
  isHost?: boolean;
}

export interface AndaEvent {
  id: string;
  type: EventType;
  category: EventCategory;
  title: string;
  /** Optional translation of the title, shown when the user taps "translate". */
  titleAlt?: string;
  hostName: string;
  venueName: string;
  city: string;
  /** [longitude, latitude] */
  lngLat: [number, number];
  /** ISO 8601, UTC */
  startsAt: string;
  endsAt: string;
  /** 0 means free. */
  priceCents: number;
  currency: 'TRY' | 'EUR';
  capacity?: number;
  attendees: Attendee[];
  attendeeCount: number;
  /** Whether the signed-in user is going. Only known when loaded from the backend. */
  joined?: boolean;
  /** Must be https. Validated before opening. */
  ticketUrl?: string;
}

export type TimeFilter = 'any' | 'now' | 'today' | 'tonight' | 'tomorrow' | 'weekend';
export type TypeFilter = 'all' | EventType;
export type PriceFilter = 'all' | 'free' | 'paid';

export interface EventFilters {
  time: TimeFilter;
  categories: EventCategory[];
  type: TypeFilter;
  price: PriceFilter;
}

export const DEFAULT_FILTERS: EventFilters = {
  time: 'today',
  categories: [],
  type: 'all',
  price: 'all',
};
