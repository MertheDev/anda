import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { applyFilters } from '@/lib/filters';
import { CATEGORIES, categoryMeta, colors, radius } from '@/theme';
import {
  DEFAULT_FILTERS,
  type AndaEvent,
  type EventCategory,
  type EventFilters,
  type PriceFilter,
  type TimeFilter,
  type TypeFilter,
} from '@/types/event';

const TIMES: TimeFilter[] = ['any', 'now', 'today', 'tonight', 'tomorrow', 'weekend'];
const TYPES: TypeFilter[] = ['all', 'user', 'business'];
const PRICES: PriceFilter[] = ['all', 'free', 'paid'];

interface Props {
  visible: boolean;
  filters: EventFilters;
  events: AndaEvent[];
  onApply: (filters: EventFilters) => void;
  onClose: () => void;
}

/** Number of filters that differ from the defaults, shown as a badge on the filter button. */
export function activeFilterCount(f: EventFilters): number {
  return (
    (f.time !== DEFAULT_FILTERS.time ? 1 : 0) +
    (f.categories.length > 0 ? 1 : 0) +
    (f.type !== 'all' ? 1 : 0) +
    (f.price !== 'all' ? 1 : 0)
  );
}

export function FilterPanel({ visible, filters, events, onApply, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // null means "no edits yet": the panel shows the applied filters, so it always opens in sync.
  const [edits, setEdits] = useState<EventFilters | null>(null);
  const draft = edits ?? filters;
  const setDraft = (update: (d: EventFilters) => EventFilters) => setEdits(update(draft));

  const matching = useMemo(() => applyFilters(events, draft).length, [events, draft]);

  const close = () => {
    setEdits(null);
    onClose();
  };
  const apply = () => {
    setEdits(null);
    onApply(draft);
  };

  const toggleCategory = (c: EventCategory) =>
    setDraft((d) => ({
      ...d,
      categories: d.categories.includes(c) ? d.categories.filter((x) => x !== c) : [...d.categories, c],
    }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel={t('common.close')} />
      <View style={[styles.panel, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('filters.title')}</Text>
          <Pressable onPress={() => setDraft(() => DEFAULT_FILTERS)} accessibilityRole="button">
            <Text style={styles.clear}>{t('common.clear')}</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.section}>{t('filters.time')}</Text>
          <View style={styles.wrap}>
            {TIMES.map((v) => (
              <Chip key={v} label={t(`filters.time_${v}`)} active={draft.time === v} onPress={() => setDraft((d) => ({ ...d, time: v }))} />
            ))}
          </View>

          <Text style={styles.section}>{t('filters.category')}</Text>
          <View style={styles.wrap}>
            {CATEGORIES.map((c) => (
              <Chip
                key={c}
                label={`${categoryMeta[c].emoji} ${t(`categories.${c}`)}`}
                active={draft.categories.includes(c)}
                onPress={() => toggleCategory(c)}
              />
            ))}
          </View>

          <Text style={styles.section}>{t('filters.type')}</Text>
          <View style={styles.wrap}>
            {TYPES.map((v) => (
              <Chip key={v} label={t(`filters.type_${v}`)} active={draft.type === v} onPress={() => setDraft((d) => ({ ...d, type: v }))} />
            ))}
          </View>

          <Text style={styles.section}>{t('filters.price')}</Text>
          <View style={styles.wrap}>
            {PRICES.map((v) => (
              <Chip key={v} label={t(`filters.price_${v}`)} active={draft.price === v} onPress={() => setDraft((d) => ({ ...d, price: v }))} />
            ))}
          </View>
        </ScrollView>

        <Button label={t('filters.show', { count: matching })} onPress={apply} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  panel: {
    maxHeight: '82%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  clear: { fontSize: 15, fontWeight: '600', color: colors.link },
  body: { paddingBottom: 8, gap: 10 },
  section: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginTop: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
