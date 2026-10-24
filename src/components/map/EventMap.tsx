import {
  Camera,
  type CameraRef,
  Map,
  Marker,
  UserLocation,
  type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
import { memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import { type NativeSyntheticEvent, useWindowDimensions, View } from 'react-native';

import { ClusterMarker } from '@/components/map/ClusterMarker';
import { EventMarker } from '@/components/map/EventMarker';
import { MAP_BACKGROUND, useMapStyle } from '@/components/map/mapStyle';
import { buildClusterIndex, CLUSTER_MAX_ZOOM, itemsInView } from '@/lib/clustering';
import type { Bounds } from '@/lib/filters';
import type { AndaEvent } from '@/types/event';

/** Roughly western to eastern Europe, Iceland to Turkey. */
const EUROPE_BOUNDS: [number, number, number, number] = [-12, 34, 42, 62];
/** Above the clustering zoom, events show as full balloons; below it they are compact. */
const FULL_MARKER_ZOOM = CLUSTER_MAX_ZOOM + 1;
const MAX_MARKERS = 80;

export interface EventMapHandle {
  flyTo: (lngLat: [number, number], zoom: number) => void;
}

interface Props {
  events: AndaEvent[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Fired (debounced by the native side) whenever the visible area changes. */
  onBoundsChange: (bounds: Bounds, zoom: number) => void;
  /** Draw the device position (only after the user granted location permission). */
  showUserLocation?: boolean;
  ref?: Ref<EventMapHandle>;
}

function EventMapImpl({ events, selectedId, onSelect, onBoundsChange, showUserLocation, ref }: Props) {
  const cameraRef = useRef<CameraRef>(null);
  const { height } = useWindowDimensions();
  const mapStyle = useMapStyle();
  const [zoom, setZoom] = useState(4);
  const zoomRef = useRef(4);
  const [bounds, setBounds] = useState<Bounds>(EUROPE_BOUNDS);

  useImperativeHandle(ref, () => ({
    flyTo: (center, z) => cameraRef.current?.flyTo({ center, zoom: z, duration: 1200 }),
  }));

  // Bring a selected event into view above the bottom sheet (which covers the lower ~44%).
  useEffect(() => {
    if (!selectedId) return;
    const event = events.find((e) => e.id === selectedId);
    if (!event) return;
    cameraRef.current?.easeTo({
      center: event.lngLat,
      zoom: Math.max(zoomRef.current, 14),
      padding: { bottom: Math.round(height * 0.44) },
      duration: 500,
    });
    // Only re-center when the selection changes, not when the event list refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const index = useMemo(() => buildClusterIndex(events), [events]);
  const eventsById = useMemo(() => new globalThis.Map(events.map((e) => [e.id, e])), [events]);
  const items = useMemo(
    () => itemsInView(index, eventsById, bounds, zoom, MAX_MARKERS),
    [index, eventsById, bounds, zoom],
  );

  const handleRegionDidChange = useCallback(
    (e: NativeSyntheticEvent<ViewStateChangeEvent>) => {
      const { zoom: z, bounds: b } = e.nativeEvent;
      zoomRef.current = z;
      setZoom(z);
      setBounds(b);
      onBoundsChange(b, z);
    },
    [onBoundsChange],
  );

  const zoomIntoCluster = useCallback(
    (clusterId: number, center: [number, number]) => {
      const target = Math.min(index.getClusterExpansionZoom(clusterId) + 0.5, 17);
      cameraRef.current?.flyTo({ center, zoom: target, duration: 600 });
    },
    [index],
  );

  // The styled map is fetched once; until then show the map's own background instead of a flash.
  if (!mapStyle) return <View style={{ flex: 1, backgroundColor: MAP_BACKGROUND }} />;

  return (
    <Map
      style={{ flex: 1 }}
      mapStyle={mapStyle}
      compass={false}
      logo={false}
      attributionPosition={{ bottom: 8, left: 8 }}
      onPress={() => onSelect(null)}
      onRegionDidChange={handleRegionDidChange}
    >
      <Camera ref={cameraRef} initialViewState={{ bounds: EUROPE_BOUNDS }} minZoom={2.5} maxZoom={18} />

      {showUserLocation ? <UserLocation /> : null}

      {items.map((item) =>
        item.kind === 'cluster' ? (
          <Marker
            key={`cluster-${item.clusterId}`}
            id={`cluster-${item.clusterId}`}
            lngLat={item.lngLat}
            anchor="center"
            onPress={(e) => {
              // A marker press also bubbles to the map's onPress, which would deselect right away.
              e.stopPropagation();
              zoomIntoCluster(item.clusterId, item.lngLat);
            }}
          >
            <ClusterMarker count={item.count} categories={item.topCategories} />
          </Marker>
        ) : (
          <Marker
            key={item.event.id}
            id={item.event.id}
            lngLat={item.event.lngLat}
            anchor={zoom >= FULL_MARKER_ZOOM ? 'bottom' : 'center'}
            selected={item.event.id === selectedId}
            onPress={(e) => {
              e.stopPropagation();
              onSelect(item.event.id);
            }}
          >
            <EventMarker event={item.event} selected={item.event.id === selectedId} compact={zoom < FULL_MARKER_ZOOM} />
          </Marker>
        ),
      )}
    </Map>
  );
}

export const EventMap = memo(EventMapImpl);
