import type { AndaEvent, Attendee, EventCategory } from '@/types/event';

/** Prototype data. Replaced by Supabase queries once the backend is connected. */

const MIN = 60_000;

/** ISO timestamp `offsetMin` minutes from now, so the "Today" filter always has results. */
function at(offsetMin: number): string {
  return new Date(Date.now() + offsetMin * MIN).toISOString();
}

function people(names: string[], hostFirst = true): Attendee[] {
  return names.map((name, i) => ({ id: `${name}-${i}`, name, isHost: hostFirst && i === 0 }));
}

interface Seed {
  id: string;
  type: AndaEvent['type'];
  category: EventCategory;
  title: string;
  hostName: string;
  venueName: string;
  city: string;
  lngLat: [number, number];
  startOffsetMin: number;
  durationMin: number;
  priceCents?: number;
  capacity?: number;
  attendees: string[];
  extraAttendees?: number;
  titleAlt?: string;
  ticketUrl?: string;
}

const seeds: Seed[] = [
  // İzmir
  { id: 'iz-1', type: 'business', category: 'music', title: 'Akustik Cuma', titleAlt: 'Acoustic Friday', hostName: 'Kordon Cafe', venueName: 'Kordon Cafe', city: 'İzmir', lngLat: [27.1384, 38.4337], startOffsetMin: 90, durationMin: 150, priceCents: 0, attendees: ['Ece', 'Mert', 'Selin'], extraAttendees: 21, ticketUrl: 'https://example.com/akustik-cuma' },
  { id: 'iz-2', type: 'user', category: 'sports', title: 'Sahilde sabah koşusu', titleAlt: 'Morning run on the waterfront', hostName: 'Deniz', venueName: 'Alsancak Sahil', city: 'İzmir', lngLat: [27.1325, 38.4392], startOffsetMin: 30, durationMin: 60, attendees: ['Deniz', 'Ali'], extraAttendees: 6 },
  { id: 'iz-3', type: 'business', category: 'food', title: 'Boyoz ve çay sabahı', titleAlt: 'Boyoz and tea morning', hostName: 'Kemeraltı Fırın', venueName: 'Kemeraltı Çarşısı', city: 'İzmir', lngLat: [27.1286, 38.4189], startOffsetMin: -20, durationMin: 120, priceCents: 15000, capacity: 30, attendees: ['Zeynep', 'Can'], extraAttendees: 12 },
  { id: 'iz-4', type: 'user', category: 'community', title: 'Dil değişimi buluşması', titleAlt: 'Language exchange meetup', hostName: 'Arda', venueName: 'Bornova Kitap Kafe', city: 'İzmir', lngLat: [27.2217, 38.4622], startOffsetMin: 180, durationMin: 120, attendees: ['Arda', 'Lena', 'Tom'], extraAttendees: 9 },
  { id: 'iz-5', type: 'business', category: 'nightlife', title: 'Cumartesi DJ gecesi', titleAlt: 'Saturday DJ night', hostName: 'Pasaport Bar', venueName: 'Pasaport', city: 'İzmir', lngLat: [27.1356, 38.4351], startOffsetMin: 300, durationMin: 240, priceCents: 30000, attendees: ['Burak', 'Ayşe'], extraAttendees: 54, ticketUrl: 'https://example.com/dj-gecesi' },
  { id: 'iz-6', type: 'user', category: 'art', title: 'Açık hava eskiz günü', titleAlt: 'Outdoor sketching day', hostName: 'Naz', venueName: 'Kültürpark', city: 'İzmir', lngLat: [27.1448, 38.4283], startOffsetMin: 1500, durationMin: 150, attendees: ['Naz'], extraAttendees: 4 },
  { id: 'iz-7', type: 'user', category: 'food', title: 'Sokak lezzetleri turu', titleAlt: 'Street food walk', hostName: 'Murat', venueName: 'Karşıyaka Çarşı', city: 'İzmir', lngLat: [27.1128, 38.4608], startOffsetMin: 120, durationMin: 120, attendees: ['Murat', 'Işıl'], extraAttendees: 7 },
  // İstanbul
  { id: 'ist-1', type: 'business', category: 'music', title: 'Caz akşamı', titleAlt: 'Jazz evening', hostName: 'Nardis Jazz Club', venueName: 'Nardis', city: 'İstanbul', lngLat: [28.9741, 41.0258], startOffsetMin: 210, durationMin: 180, priceCents: 40000, capacity: 80, attendees: ['Elif', 'Kaan'], extraAttendees: 41, ticketUrl: 'https://example.com/caz' },
  { id: 'ist-2', type: 'user', category: 'sports', title: 'Moda sahil bisikleti', titleAlt: 'Moda waterfront bike ride', hostName: 'Cem', venueName: 'Moda Sahil', city: 'İstanbul', lngLat: [29.0262, 40.9847], startOffsetMin: 60, durationMin: 90, attendees: ['Cem', 'Ozan'], extraAttendees: 10 },
  { id: 'ist-3', type: 'business', category: 'art', title: 'Galeri açılışı', titleAlt: 'Gallery opening', hostName: 'Karaköy Sanat', venueName: 'Karaköy Galeri', city: 'İstanbul', lngLat: [28.9777, 41.0227], startOffsetMin: 150, durationMin: 180, priceCents: 0, attendees: ['Defne', 'Emre'], extraAttendees: 33 },
  { id: 'ist-4', type: 'user', category: 'community', title: 'Girişimci kahvesi', titleAlt: 'Founders coffee', hostName: 'Berk', venueName: 'Kadıköy Kahve Durağı', city: 'İstanbul', lngLat: [29.0244, 40.9906], startOffsetMin: 45, durationMin: 90, attendees: ['Berk', 'Su'], extraAttendees: 5 },
  { id: 'ist-5', type: 'business', category: 'nightlife', title: 'Çatı katı gün batımı partisi', titleAlt: 'Rooftop sunset party', hostName: 'Galata Terrace', venueName: 'Galata Terrace', city: 'İstanbul', lngLat: [28.9744, 41.0256], startOffsetMin: 240, durationMin: 240, priceCents: 50000, attendees: ['Mina', 'Barış'], extraAttendees: 62, ticketUrl: 'https://example.com/sunset' },
  { id: 'ist-6', type: 'user', category: 'food', title: 'Balık ekmek buluşması', titleAlt: 'Fish sandwich meetup', hostName: 'Tuna', venueName: 'Eminönü İskele', city: 'İstanbul', lngLat: [28.9729, 41.0171], startOffsetMin: 20, durationMin: 60, attendees: ['Tuna', 'Pelin'], extraAttendees: 3 },
  { id: 'ist-7', type: 'business', category: 'music', title: 'Canlı müzik: Bağlama gecesi', titleAlt: 'Live music: Saz night', hostName: 'Beşiktaş Çarşı Cafe', venueName: 'Beşiktaş Çarşı', city: 'İstanbul', lngLat: [29.0053, 41.0422], startOffsetMin: 1600, durationMin: 150, priceCents: 20000, attendees: ['Okan'], extraAttendees: 18 },
  // Avrupa (haritanın tamamen açık olduğunu göstermek için)
  { id: 'eu-1', type: 'user', category: 'community', title: 'Board game night', hostName: 'Anna', venueName: 'Café Central', city: 'Vienna', lngLat: [16.3655, 48.2104], startOffsetMin: 100, durationMin: 150, attendees: ['Anna', 'Luca'], extraAttendees: 8 },
  { id: 'eu-2', type: 'business', category: 'music', title: 'Open mic', hostName: 'The Blue Note', venueName: 'The Blue Note', city: 'Berlin', lngLat: [13.4050, 52.5200], startOffsetMin: 200, durationMin: 180, priceCents: 0, attendees: ['Jonas', 'Mia'], extraAttendees: 25 },
  { id: 'eu-3', type: 'user', category: 'food', title: 'Tapas crawl', hostName: 'Carlos', venueName: 'La Latina', city: 'Madrid', lngLat: [-3.7087, 40.4123], startOffsetMin: 260, durationMin: 180, attendees: ['Carlos', 'Marta'], extraAttendees: 11 },
  { id: 'eu-4', type: 'business', category: 'art', title: 'Late museum hours', hostName: 'Louvre Nocturne', venueName: 'Musée du Louvre', city: 'Paris', lngLat: [2.3376, 48.8606], startOffsetMin: 180, durationMin: 240, priceCents: 1500, attendees: ['Camille'], extraAttendees: 40 },
];

export const EVENTS: AndaEvent[] = seeds.map((s) => {
  const eur = s.city !== 'İzmir' && s.city !== 'İstanbul';
  const attendees = people(s.attendees);
  return {
    id: s.id,
    type: s.type,
    category: s.category,
    title: s.title,
    titleAlt: s.titleAlt,
    hostName: s.hostName,
    venueName: s.venueName,
    city: s.city,
    lngLat: s.lngLat,
    startsAt: at(s.startOffsetMin),
    endsAt: at(s.startOffsetMin + s.durationMin),
    priceCents: s.priceCents ?? 0,
    currency: eur ? 'EUR' : 'TRY',
    capacity: s.capacity,
    attendees,
    attendeeCount: attendees.length + (s.extraAttendees ?? 0),
    ticketUrl: s.ticketUrl,
  };
});
