import Supercluster from 'supercluster';

import type { Bounds } from '@/lib/filters';
import { CATEGORIES } from '@/theme';
import type { AndaEvent, EventCategory } from '@/types/event';

/** Clusters exist up to this zoom; above it every event is its own marker. */
export const CLUSTER_MAX_ZOOM = 11;

interface PointProps {
  eventId: string;
  category: EventCategory;
}
/**
 * One flat counter per category. It must stay flat: supercluster only shallow-copies the
 * accumulated properties, so a nested object would be shared (and corrupted) between clusters.
 */
type ClusterProps = Record<EventCategory, number>;

export type ClusterIndex = Supercluster<PointProps, ClusterProps>;

export type MapItem =
  | { kind: 'cluster'; clusterId: number; lngLat: [number, number]; count: number; topCategories: EventCategory[] }
  | { kind: 'event'; event: AndaEvent };

export function buildClusterIndex(events: AndaEvent[]): ClusterIndex {
  const index: ClusterIndex = new Supercluster<PointProps, ClusterProps>({
    radius: 64,
    maxZoom: CLUSTER_MAX_ZOOM,
    minPoints: 2,
    // Every point contributes one count for its category; clusters add their members' counts together.
    map: (props) => {
      const counts = emptyCounts();
      counts[props.category] = 1;
      return counts;
    },
    reduce: (acc, props) => {
      for (const category of CATEGORIES) acc[category] += props[category];
    },
  });
  index.load(
    events.map((e) => ({
      type: 'Feature' as const,
      properties: { eventId: e.id, category: e.category },
      geometry: { type: 'Point' as const, coordinates: e.lngLat },
    })),
  );
  return index;
}

function emptyCounts(): ClusterProps {
  return { music: 0, food: 0, nightlife: 0, sports: 0, art: 0, community: 0, other: 0 };
}

/** The categories that make up a cluster, most frequent first (ties keep the theme's order). */
function topCategories(counts: ClusterProps, limit: number): EventCategory[] {
  return CATEGORIES.filter((c) => counts[c] > 0)
    .sort((a, b) => counts[b] - counts[a])
    .slice(0, limit);
}

export function itemsInView(
  index: ClusterIndex,
  eventsById: Map<string, AndaEvent>,
  bounds: Bounds,
  zoom: number,
  maxItems: number,
): MapItem[] {
  const items: MapItem[] = [];
  for (const feature of index.getClusters(bounds, Math.floor(zoom))) {
    const [lng, lat] = feature.geometry.coordinates as [number, number];
    if ('cluster' in feature.properties && feature.properties.cluster) {
      items.push({
        kind: 'cluster',
        clusterId: feature.properties.cluster_id,
        lngLat: [lng, lat],
        count: feature.properties.point_count,
        topCategories: topCategories(feature.properties, 3),
      });
    } else {
      const event = eventsById.get((feature.properties as PointProps).eventId);
      if (event) items.push({ kind: 'event', event });
    }
  }
  return items.slice(0, maxItems);
}
