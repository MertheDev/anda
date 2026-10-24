import * as Location from 'expo-location';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryChips } from '@/components/map/CategoryChips';
import { CityShortcuts, PILOT_CITIES, type PilotCity } from '@/components/map/CityShortcuts';
import { EventMap, type EventMapHandle } from '@/components/map/EventMap';
import { EventSheet } from '@/components/map/EventSheet';
import { activeFilterCount, FilterPanel } from '@/components/map/FilterPanel';
import { useEvents } from '@/data/useEvents';
import { applyBaseFilters, applyFilters, type Bounds, countByCategory, inBounds } from '@/lib/filters';
import { colors, radius } from '@/theme';
import { DEFAULT_FILTERS, type EventCategory, type EventFilters } from '@/types/event';

const WORLD: Bounds = [-180, -90, 180, 90];

export default function MapScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<EventMapHandle>(null);
  const { events: allEvents, loading, failed, refresh, replace } = useEvents();

  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bounds, setBounds] = useState<Bounds>(WORLD);
  const [zoom, setZoom] = useState(4);
  const [locationGranted, setLocationGranted] = useState(false);

  const baseEvents = useMemo(() => applyBaseFilters(allEvents, filters), [allEvents, filters]);
  const events = useMemo(() => applyFilters(allEvents, filters), [allEvents, filters]);
  const selected = useMemo(() => allEvents.find((e) => e.id === selectedId) ?? null, [allEvents, selectedId]);

  // Chip counters follow the visible area; the category selection itself does not shrink them.
  const visibleBase = useMemo(() => baseEvents.filter((e) => inBounds(e, bounds)), [baseEvents, bounds]);
  const counts = useMemo(() => countByCategory(visibleBase), [visibleBase]);
  const filterBadge = activeFilterCount(filters);

  const onBoundsChange = useCallback((b: Bounds, z: number) => {
    setBounds(b);
    setZoom(z);
  }, []);

  const toggleCategory = useCallback((category: EventCategory) => {
    setFilters((f) => ({
      ...f,
      categories: f.categories.includes(category)
        ? f.categories.filter((c) => c !== category)
        : [...f.categories, category],
    }));
  }, []);

  const clearCategories = useCallback(() => setFilters((f) => ({ ...f, categories: [] })), []);
  const closeSheet = useCallback(() => setSelectedId(null), []);

  const goToCity = useCallback((city: PilotCity) => {
    const target = PILOT_CITIES[city];
    mapRef.current?.flyTo(target.lngLat, target.zoom);
  }, []);

  const goToMyLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('map.locationDenied'));
      return;
    }
    setLocationGranted(true);
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    mapRef.current?.flyTo([position.coords.longitude, position.coords.latitude], 14);
  }, [t]);

  const showZoomHint = zoom < 6 && visibleBase.length > 0;
  const showEmptyHint = !loading && zoom >= 9 && visibleBase.length === 0 && !selected;

  return (
    <View style={styles.screen}>
      <EventMap
        ref={mapRef}
        events={events}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onBoundsChange={onBoundsChange}
        showUserLocation={locationGranted}
      />

      <View pointerEvents="box-none" style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topRow} pointerEvents="box-none">
          <CityShortcuts onSelect={goToCity} />
          <Pressable
            onPress={() => setFilterOpen(true)}
            style={styles.filterButton}
            accessibilityRole="button"
            accessibilityLabel={t('map.filter')}
          >
            <Text style={styles.filterLabel}>⚙︎ {t('map.filter')}</Text>
            {filterBadge > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{filterBadge}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
        <CategoryChips
          counts={counts}
          total={visibleBase.length}
          selected={filters.categories}
          onToggle={toggleCategory}
          onClear={clearCategories}
        />
        {failed ? (
          <Pressable onPress={() => void refresh()} style={styles.retry} accessibilityRole="button">
            <Text style={styles.retryText}>{t('map.loadFailed')}</Text>
          </Pressable>
        ) : null}
      </View>

      {!selected ? (
        <Pressable
          onPress={goToMyLocation}
          style={[styles.locate, { bottom: 24 }]}
          accessibilityRole="button"
          accessibilityLabel={t('map.myLocation')}
        >
          <Text style={styles.locateIcon}>◎</Text>
        </Pressable>
      ) : null}

      {!selected && (showZoomHint || showEmptyHint) ? (
        <View pointerEvents="none" style={[styles.hint, { bottom: 28 }]}>
          <Text style={styles.hintTitle}>{showEmptyHint ? t('map.noEventsHere') : t('map.zoomHint')}</Text>
          {showEmptyHint ? <Text style={styles.hintBody}>{t('map.noEventsHint')}</Text> : null}
        </View>
      ) : null}

      <EventSheet event={selected} onClose={closeSheet} onChange={replace} />

      <FilterPanel
        visible={filterOpen}
        filters={filters}
        events={allEvents}
        onApply={(next) => {
          setFilters(next);
          setFilterOpen(false);
        }}
        onClose={() => setFilterOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceMuted },
  top: { position: 'absolute', top: 0, left: 0, right: 0, gap: 10 },
  topRow: { paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  filterLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: colors.surface, fontSize: 12, fontWeight: '800' },
  retry: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
  },
  retryText: { color: colors.surface, fontSize: 13, fontWeight: '700' },
  locate: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  locateIcon: { fontSize: 24, color: colors.link },
  hint: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '70%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.text,
  },
  hintTitle: { color: colors.surface, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  hintBody: { color: colors.border, fontSize: 12, marginTop: 2, textAlign: 'center' },
});
